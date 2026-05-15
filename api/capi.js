// Meta Conversions API endpoint - Sorabyte
// Recibe eventos del navegador y los reenvía a Meta con el mismo event_id
// para deduplicación con el Pixel cliente.

const crypto = require('crypto');

const PIXEL_ID = '995422316277042';

const sha256 = (value) => {
  if (!value) return undefined;
  return crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
};

module.exports = async (req, res) => {
  // CORS básico (mismo dominio en producción, no estricto)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = process.env.META_CAPI_TOKEN_SORABYTE;
  if (!token) return res.status(500).json({ error: 'missing_capi_token' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'bad_json' });
  }

  const {
    event_name,
    event_id,
    event_time,
    event_source_url,
    custom_data = {},
    user_data: ud_client = {},
  } = body || {};

  if (!event_name || !event_id) {
    return res.status(400).json({ error: 'missing_event_name_or_id' });
  }

  // IP + user-agent del servidor
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const ua = req.headers['user-agent'] || '';

  const user_data = {
    client_ip_address: ip,
    client_user_agent: ua,
    fbp: ud_client.fbp,
    fbc: ud_client.fbc,
    em: ud_client.email ? [sha256(ud_client.email)] : undefined,
    ph: ud_client.phone ? [sha256(String(ud_client.phone).replace(/\D/g, ''))] : undefined,
    fn: ud_client.first_name ? [sha256(ud_client.first_name)] : undefined,
    ln: ud_client.last_name ? [sha256(ud_client.last_name)] : undefined,
    country: ud_client.country ? [sha256(ud_client.country)] : undefined,
    ct: ud_client.city ? [sha256(ud_client.city)] : undefined,
    st: ud_client.state ? [sha256(ud_client.state)] : undefined,
    zp: ud_client.zip ? [sha256(ud_client.zip)] : undefined,
    db: ud_client.dob ? [sha256(ud_client.dob)] : undefined,
    ge: ud_client.gender ? [sha256(ud_client.gender)] : undefined,
  };
  Object.keys(user_data).forEach((k) => user_data[k] === undefined && delete user_data[k]);

  const payload = {
    data: [
      {
        event_name,
        event_time: event_time || Math.floor(Date.now() / 1000),
        event_id,
        event_source_url: event_source_url || req.headers.referer,
        action_source: 'website',
        user_data,
        custom_data,
      },
    ],
  };

  const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'meta_error', details: j });
    return res.status(200).json({ ok: true, events_received: j.events_received, fbtrace_id: j.fbtrace_id });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
};
