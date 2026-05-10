/* ============================================================
   Tracking — Plausible (siempre) + Meta Pixel (con consent)
   - Plausible: cookieless, exento DSGVO/AEPD, siempre activo
   - Meta Pixel: solo si consent.marketing === true
   - CAPI server-side: enviar desde /api/capi-lead.js (Vercel Function)
   - Eventos: PageView (auto) + Lead (formularios) con event_id deduplicado
   ============================================================ */

// ============ CONFIG — rellenar antes de prod ============
const PLAUSIBLE_DOMAIN = '[TODO LUIS] lzr-coaching.de';   // Domain registrado en Plausible
const META_PIXEL_ID = '[TODO LUIS] 1234567890123456';     // Pixel ID de Meta
const CAPI_ENDPOINT = '/api/capi-lead';                    // Endpoint Vercel Function
// ==========================================================

// === Plausible (cookieless, sin consent requerido) ===
(function loadPlausible() {
  if (PLAUSIBLE_DOMAIN.startsWith('[TODO')) return; // no cargar si no configurado
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = PLAUSIBLE_DOMAIN;
  s.src = 'https://plausible.io/js/script.outbound-links.tagged-events.js';
  document.head.appendChild(s);
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
})();

// === Meta Pixel (sólo si consent.marketing) ===
function initMetaPixel() {
  if (META_PIXEL_ID.startsWith('[TODO')) return;
  if (window._fbqInitialized) return;
  window._fbqInitialized = true;
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
}

// Escuchar evento de consent del cookie-banner.js
document.addEventListener('lzr:consent:applied', (e) => {
  if (e.detail.marketing) initMetaPixel();
});
// Si ya hay consent guardado al cargar, init directo
document.addEventListener('DOMContentLoaded', () => {
  try {
    const c = JSON.parse(localStorage.getItem('lzr_consent_v1') || 'null');
    if (c && c.marketing) initMetaPixel();
  } catch (e) {}
});

// === Helper: trackLead con dedupe Pixel + CAPI ===
window.lzrTrackLead = async function (data) {
  // data: { name, email, phone, value, currency }
  const event_id = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  const consent = JSON.parse(localStorage.getItem('lzr_consent_v1') || 'null');
  const hasMarketing = consent && consent.marketing;

  // Pixel (browser-side) sólo si consent
  if (hasMarketing && typeof fbq === 'function') {
    fbq('track', 'Lead', {
      value: data.value || 0,
      currency: data.currency || 'EUR'
    }, { eventID: event_id });
  }

  // Plausible (siempre, sin PII)
  if (typeof plausible === 'function') {
    plausible('Lead', { props: { source: data.source || 'contact-form' } });
  }

  // CAPI server-side (siempre — el endpoint decide qué hashear y enviar a Meta)
  // El endpoint `/api/capi-lead` es responsable de respetar consent server-side
  try {
    await fetch(CAPI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id,
        event_name: 'Lead',
        consent: hasMarketing,  // server decide si propaga a Meta
        user_data: { email: data.email, phone: data.phone, name: data.name },
        custom_data: { value: data.value || 0, currency: data.currency || 'EUR' },
        event_source_url: window.location.href,
        client_user_agent: navigator.userAgent
      })
    });
  } catch (e) {
    console.warn('CAPI request failed (non-blocking):', e);
  }

  return event_id;
};
