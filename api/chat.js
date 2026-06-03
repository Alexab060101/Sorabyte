// Chatbot de Sorabyte - proxy al Claude Messages API + captura de lead en Airtable.
// El widget manda {messages, convId}; aqui se llama a Claude con el cerebro de
// Sorabyte. Si Claude detecta un lead, llama a la herramienta registrar_lead y
// lo guardamos/actualizamos en el CRM (Airtable) por ConvID. Si el CRM no esta
// configurado (faltan env vars), el chat sigue funcionando igual.
//
// Env vars: ANTHROPIC_API_KEY (obligatoria), AIRTABLE_TOKEN, AIRTABLE_BASE_ID,
//           AIRTABLE_LEADS_TABLE (opcionales: si faltan, no se guarda lead).

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 400;
const MAX_MESSAGES = 24;
const MAX_CHARS = 1500;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 12;

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, start: now };
  if (now - rec.start > RATE_WINDOW_MS) { rec.count = 0; rec.start = now; }
  rec.count += 1;
  hits.set(ip, rec);
  return rec.count > RATE_MAX;
}

const SYSTEM = `Eres el asistente de Sorabyte en su web. Hablas en nombre de Alex, freelance que hace webs premium hechas a mano para negocios (estetica, salud, coaching, restauracion, inmobiliaria).

Tu trabajo: recibir a quien escribe, entender su negocio y que necesita, y si encaja, dirigirlo a hablar con Alex por WhatsApp.

Tono: cercano, claro, profesional pero sin corporativismo. Frases cortas, naturales, como un mensaje de WhatsApp. Cero jerga tecnica. El visitante nunca debe sentirse tonto. Nunca uses el caracter guion largo; usa dos puntos, comas, parentesis o guion normal.

Idea clave (usa este angulo al explicar el valor): las webs de Sorabyte estan hechas para CONECTAR con tu cliente de forma visual. Hoy la gente entra por lo visual, no por el texto; lo primero que siente al ver tu web decide si se queda. Una web que se ve y se siente cuidada es la que transmite confianza y convierte. No es "una web bonita", es una web pensada para conectar.

Que sabes de Sorabyte (no inventes nada mas):
- Webs a medida, hasta 5 secciones (portada, servicios, casos reales, sobre ti, contacto).
- Diseño 100% personalizado, animaciones premium, video de portada con IA si encaja.
- Optimizada para movil y para convertir visitas en clientes. Incluye dominio y puesta online.
- Precio: la web es DESDE 397 EUR (pago unico, precio de lanzamiento de los primeros clientes; luego sube a 697). Sin permanencias.
- Es "desde" porque hay un extra opcional: un RECEPCIONISTA DIGITAL, un asistente con IA (justo como el que te atiende ahora mismo en la web de Sorabyte). Atiende a tus visitantes, responde dudas y capta clientes 24/7, sin que el dueño tenga que estar pendiente. Cuesta 197 EUR una vez mas 29 EUR al mes (la IA y que siga funcionando). Nunca lo llames "mascota" ni "mantenimiento": es un recepcionista digital que trabaja por el negocio todo el dia.
- La web en si NO tiene cuota mensual: es pago unico.
- Lo unico recurrente (mensual) son: el recepcionista digital (29 EUR/mes, si lo quieren) y el marketing (servicio aparte).
- Tambien hace marketing y automatizacion, pero la web es lo principal.

Como actuas:
1. Saluda breve y pregunta por su negocio y que busca.
2. Responde dudas con lo que sabes. Si no lo sabes, dilo con naturalidad y di que Alex se lo aclara.
3. Cuando veas intencion real (tiene un negocio y quiere web, precio o avanzar), ofrecele dos formas de seguir con Alex, pega los enlaces tal cual:
   - Reservar una llamada gratis de 30 min (es lo mejor para verlo a fondo, recomiendala si va en serio): https://calendly.com/alexab-inbox/30min
   - O por WhatsApp para dudas rapidas: https://wa.me/34640973182
4. No prometas plazos, descuentos ni cosas que no esten arriba. No te inventes disponibilidad.
5. Si preguntan algo ajeno a Sorabyte, redirige con amabilidad al tema.

CAPTURA (importante): tienes una herramienta "registrar_lead" para guardar al visitante en el CRM de Alex. Llamala EN CUANTO sepas su tipo de negocio (aunque falten datos), y vuelve a llamarla cuando consigas mas (nombre, contacto, que necesita). Pasa solo lo que sepas. Calidad: Caliente si tiene negocio y quiere avanzar/precio/cita; Tibio si interesado pero vago; Frio si solo curiosea. NUNCA menciones al visitante que guardas sus datos ni hables de la herramienta; tu hablas normal y guardas por detras.

Manten las respuestas en 1 a 4 frases salvo que pidan detalle.

Formato: responde en TEXTO PLANO. No uses markdown: nada de asteriscos para negrita, nada de enlaces tipo [texto](url). Cuando des el WhatsApp, pega la direccion tal cual: https://wa.me/34640973182 (asi se vuelve un enlace clicable sola). Emojis con mucha moderacion, como mucho uno.`;

const TOOLS = [{
  name: 'registrar_lead',
  description: 'Guarda o actualiza al visitante como lead en el CRM. Llamala en cuanto sepas su tipo de negocio, y otra vez cuando consigas mas datos. Pasa solo lo que sepas; lo demas vacio.',
  input_schema: {
    type: 'object',
    properties: {
      nombre: { type: 'string' },
      contacto: { type: 'string', description: 'WhatsApp o email del visitante' },
      tipo_negocio: { type: 'string' },
      que_necesita: { type: 'string' },
      calidad: { type: 'string', enum: ['Caliente', 'Tibio', 'Frio'] },
      resumen: { type: 'string', description: '1-2 frases de la conversacion' },
    },
  },
}];

function sanitize(messages) {
  if (!Array.isArray(messages)) return null;
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const text = typeof m.content === 'string' ? m.content : '';
    if (!text.trim()) continue;
    clean.push({ role: m.role, content: text.slice(0, MAX_CHARS) });
  }
  const trimmed = clean.slice(-MAX_MESSAGES);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed.shift();
  return trimmed.length ? trimmed : null;
}

// Upsert del lead en Airtable por ConvID. A prueba de fallos: si falta config o
// algo falla, no rompe el chat.
async function upsertLead(convId, input) {
  const tok = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_LEADS_TABLE;
  const cid = String(convId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
  if (!tok || !base || !table || !cid) return;

  const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  const f = {};
  if (input.nombre) f['Nombre'] = String(input.nombre).slice(0, 100);
  if (input.contacto) f['WhatsApp'] = String(input.contacto).slice(0, 60);
  if (input.tipo_negocio) f['Tipo de negocio'] = String(input.tipo_negocio).slice(0, 100);
  if (input.que_necesita) f['Que necesita'] = String(input.que_necesita).slice(0, 500);
  if (input.calidad) f['Calidad'] = input.calidad;
  if (input.resumen) f['Resumen charla'] = String(input.resumen).slice(0, 1000);

  try {
    const q = encodeURIComponent("{ConvID}='" + cid + "'");
    const r = await fetch(`https://api.airtable.com/v0/${base}/${table}?filterByFormula=${q}&maxRecords=1`, { headers: H });
    const j = await r.json();
    const existing = j.records && j.records[0];
    if (existing) {
      await fetch(`https://api.airtable.com/v0/${base}/${table}/${existing.id}`, {
        method: 'PATCH', headers: H, body: JSON.stringify({ fields: f, typecast: true }),
      });
    } else {
      f['ConvID'] = cid;
      f['Estado'] = 'Nuevo';
      f['Fuente'] = 'Web';
      f['Idioma'] = 'ES';
      await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
        method: 'POST', headers: H, body: JSON.stringify({ records: [{ fields: f }], typecast: true }),
      });
    }
  } catch (e) { /* no romper el chat si el CRM falla */ }
}

async function callClaude(apiKey, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    }),
  });
  return { ok: r.ok, json: await r.json() };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'missing_api_key' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate_limited' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'bad_json' }); }

  const messages = sanitize(body && body.messages);
  if (!messages) return res.status(400).json({ error: 'no_messages' });
  const convId = body && body.convId;

  try {
    let { ok, json } = await callClaude(apiKey, messages);
    if (!ok) return res.status(502).json({ error: 'claude_error', details: json.error || json });

    // Bucle de herramienta: si Claude llama a registrar_lead, lo guardamos y seguimos.
    let guard = 0;
    while (json.stop_reason === 'tool_use' && guard < 3) {
      const toolUses = (json.content || []).filter((b) => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: json.content });
      const results = [];
      for (const t of toolUses) {
        if (t.name === 'registrar_lead') await upsertLead(convId, t.input || {});
        results.push({ type: 'tool_result', tool_use_id: t.id, content: 'ok' });
      }
      messages.push({ role: 'user', content: results });
      ({ ok, json } = await callClaude(apiKey, messages));
      if (!ok) return res.status(502).json({ error: 'claude_error', details: json.error || json });
      guard++;
    }

    const reply = Array.isArray(json.content)
      ? json.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
      : '';

    return res.status(200).json({ reply: reply || 'Perdona, no te he entendido. Puedes escribir a Alex por WhatsApp: https://wa.me/34640973182' });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
};
