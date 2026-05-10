const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;

function sha256(s) {
  return crypto.createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event_id, event_name, consent, user_data = {}, custom_data = {}, event_source_url, client_user_agent } = body;

    if (!consent) return res.status(200).json({ ok: true, sent: false, reason: 'no consent' });

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ ok: false, error: 'CAPI not configured' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
    const cookieHeader = req.headers.cookie || '';

    const hashed = {};
    if (user_data.email) hashed.em = [sha256(user_data.email)];
    if (user_data.name)  hashed.fn = [sha256(user_data.name.split(' ')[0])];
    if (ip)              hashed.client_ip_address = ip;
    hashed.client_user_agent = client_user_agent || req.headers['user-agent'];
    const fbc = cookieHeader.match(/_fbc=([^;]+)/);
    const fbp = cookieHeader.match(/_fbp=([^;]+)/);
    if (fbc) hashed.fbc = fbc[1];
    if (fbp) hashed.fbp = fbp[1];

    const payload = {
      data: [{
        event_name: event_name || 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        event_source_url,
        action_source: 'website',
        user_data: hashed,
        custom_data: { currency: 'EUR', value: Number(custom_data.value) || 0 }
      }],
      ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {})
    };

    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await r.json();

    if (!r.ok) return res.status(200).json({ ok: false, sent: false, meta_error: json });
    return res.status(200).json({ ok: true, sent: true, events_received: json.events_received });

  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) });
  }
};
