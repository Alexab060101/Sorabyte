// Chatbot de Sorabyte - proxy al Claude Messages API
// El widget de la web manda el historial; aqui se llama a Claude con el
// "cerebro" de Sorabyte (recepcionista) y se devuelve la respuesta.
// La API key vive en process.env.ANTHROPIC_API_KEY (nunca en el navegador).

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 400;          // respuestas cortas de chat, tope de gasto
const MAX_MESSAGES = 24;         // longitud maxima de conversacion
const MAX_CHARS = 1500;          // longitud maxima por mensaje del usuario
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 12;             // peticiones por IP por minuto

// Rate limit best-effort en memoria (las instancias warm de Vercel lo comparten).
// La proteccion real es el limite de gasto en la consola de Anthropic.
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
- Es "desde" porque hay un extra opcional: la mascota, que es un asistente con IA (como el que esta hablando ahora mismo en la web de Sorabyte). Atiende a tus visitantes y capta clientes 24/7. Cuesta 197 EUR una vez mas 29 EUR al mes (la IA y que siga funcionando). No lo llames "mantenimiento", es un asistente que trabaja por ti todo el dia.
- La web en si NO tiene cuota mensual: es pago unico.
- Lo unico recurrente (mensual) son: la mascota (29 EUR/mes, si la quieren) y el marketing (servicio aparte).
- Tambien hace marketing y automatizacion, pero la web es lo principal.

Como actuas:
1. Saluda breve y pregunta por su negocio y que busca.
2. Responde dudas con lo que sabes. Si no lo sabes, dilo con naturalidad y di que Alex se lo aclara.
3. Cuando veas intencion real (tiene un negocio y quiere web, precio o cita), invitale a escribir a Alex por WhatsApp con este enlace: https://wa.me/34640973182
4. No prometas plazos, descuentos ni cosas que no esten arriba. No te inventes disponibilidad.
5. Si preguntan algo ajeno a Sorabyte, redirige con amabilidad al tema.

Manten las respuestas en 1 a 4 frases salvo que pidan detalle.

Formato: responde en TEXTO PLANO. No uses markdown: nada de asteriscos para negrita, nada de enlaces tipo [texto](url). Cuando des el WhatsApp, pega la direccion tal cual: https://wa.me/34640973182 (asi se vuelve un enlace clicable sola). Emojis con mucha moderacion, como mucho uno.`;

function sanitize(messages) {
  if (!Array.isArray(messages)) return null;
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const text = typeof m.content === 'string' ? m.content : '';
    if (!text.trim()) continue;
    clean.push({ role: m.role, content: text.slice(0, MAX_CHARS) });
  }
  // recortar a las ultimas MAX_MESSAGES y asegurar que arranca en user
  const trimmed = clean.slice(-MAX_MESSAGES);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed.shift();
  return trimmed.length ? trimmed : null;
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
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'bad_json' });
  }

  const messages = sanitize(body && body.messages);
  if (!messages) return res.status(400).json({ error: 'no_messages' });

  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // cache_control en el system: si supera el minimo cacheable, Claude lo reusa
    // entre peticiones y abarata el coste. Si no, no pasa nada.
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'claude_error', details: j.error || j });

    const reply = Array.isArray(j.content)
      ? j.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
      : '';

    return res.status(200).json({ reply: reply || 'Perdona, no te he entendido. Puedes escribir a Alex por WhatsApp: https://wa.me/34640973182' });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
};
