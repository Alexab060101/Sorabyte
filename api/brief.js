// Recibe el brief de cliente (sorabyte.es/brief), crea una fila en la tabla Briefs
// de Airtable y sube las fotos al campo de adjuntos (endpoint de contenido de Airtable).
// Env: AIRTABLE_TOKEN, AIRTABLE_BASE_ID (ya configuradas en Vercel para el chatbot).

const TABLE = 'tbllGh0chckNZ5QTj'; // tabla "Briefs"
const MAX_PHOTOS = 10;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 6;

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, start: now };
  if (now - rec.start > RATE_WINDOW_MS) { rec.count = 0; rec.start = now; }
  rec.count += 1; hits.set(ip, rec);
  return rec.count > RATE_MAX;
}

function clean(fields) {
  const out = {};
  for (const k of Object.keys(fields || {})) {
    const v = fields[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.slice(0, 5000);
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const tok = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!tok || !base) return res.status(500).json({ error: 'missing_airtable_config' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate_limited' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'bad_json' }); }

  const fields = clean(body && body.fields);
  if (!fields['Negocio']) return res.status(400).json({ error: 'no_negocio' });
  fields['Estado'] = 'Nuevo';

  const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };

  try {
    // 1) crear la fila
    const cr = await fetch(`https://api.airtable.com/v0/${base}/${TABLE}`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });
    const cj = await cr.json();
    if (!cr.ok) return res.status(502).json({ error: 'airtable_create', details: cj.error || cj });
    const recId = cj.records && cj.records[0] && cj.records[0].id;

    // 2) subir las fotos (en paralelo, sin romper si alguna falla)
    const photos = Array.isArray(body.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];
    if (recId && photos.length) {
      await Promise.allSettled(photos.map((p) => {
        if (!p || !p.data) return Promise.resolve();
        return fetch(`https://content.airtable.com/v0/${base}/${recId}/Fotos/uploadAttachment`, {
          method: 'POST', headers: H,
          body: JSON.stringify({
            contentType: p.contentType || 'image/jpeg',
            file: p.data,
            filename: (p.filename || 'foto.jpg').slice(0, 80),
          }),
        });
      }));
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
};
