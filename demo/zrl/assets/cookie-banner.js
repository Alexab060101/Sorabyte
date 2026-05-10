/* ============================================================
   Cookie Banner — vanilla JS, ~5KB
   Cumple: TDDDG §25 (DE), DSGVO Art. 7, AEPD (ES)
   - Equal prominence (Aceptar / Rechazar mismo peso visual)
   - Reject all en primera capa (VG Hannover 2025)
   - Hooks: Google Consent Mode v2 + Meta Pixel grant/revoke
   - Plausible NO requiere consentimiento → siempre activo
   ============================================================ */
(function () {
  const STORAGE_KEY = 'lzr_consent_v1';
  const CONSENT_VERSION = 1;

  const t = {
    de: {
      title: 'Cookies & Datenschutz',
      body: 'Wir nutzen technisch notwendige Cookies (immer aktiv) sowie — mit Ihrer Einwilligung — Cookies für Marketing (Meta Pixel). Plausible Analytics ist cookielos und immer aktiv. Sie können Ihre Auswahl jederzeit ändern.',
      accept: 'Alle akzeptieren',
      reject: 'Alle ablehnen',
      settings: 'Einstellungen',
      save: 'Auswahl speichern',
      necessary: 'Technisch notwendig',
      necessaryDesc: 'Sitzungs-Cookies, ohne die die Seite nicht funktioniert. Immer aktiv.',
      marketing: 'Marketing (Meta Pixel + Conversions API)',
      marketingDesc: 'Misst Conversions zur Optimierung von Werbeanzeigen. Daten gehen an Meta Platforms Ireland Ltd.',
      privacyLink: 'Datenschutzerklärung',
      legalLink: 'Impressum'
    },
    es: {
      title: 'Cookies y privacidad',
      body: 'Usamos cookies técnicamente necesarias (siempre activas) y — con tu consentimiento — cookies de marketing (Meta Pixel). Plausible Analytics es sin cookies y siempre activo.',
      accept: 'Aceptar todas',
      reject: 'Rechazar todas',
      settings: 'Ajustes',
      save: 'Guardar selección',
      necessary: 'Técnicamente necesarias',
      necessaryDesc: 'Cookies de sesión, sin las cuales la web no funciona. Siempre activas.',
      marketing: 'Marketing (Meta Pixel + Conversions API)',
      marketingDesc: 'Mide conversiones para optimizar anuncios. Datos enviados a Meta Platforms Ireland Ltd.',
      privacyLink: 'Política de privacidad',
      legalLink: 'Aviso legal'
    },
    en: {
      title: 'Cookies & Privacy',
      body: 'We use technically necessary cookies (always active) and — with your consent — marketing cookies (Meta Pixel). Plausible Analytics is cookieless and always active.',
      accept: 'Accept all',
      reject: 'Reject all',
      settings: 'Settings',
      save: 'Save selection',
      necessary: 'Technically necessary',
      necessaryDesc: 'Session cookies without which the site does not function. Always active.',
      marketing: 'Marketing (Meta Pixel + Conversions API)',
      marketingDesc: 'Measures conversions to optimize ads. Data sent to Meta Platforms Ireland Ltd.',
      privacyLink: 'Privacy Policy',
      legalLink: 'Imprint'
    }
  };

  const lang = (document.documentElement.lang || 'de').slice(0, 2).toLowerCase();
  const L = t[lang] || t.de;

  function getConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.v !== CONSENT_VERSION) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function setConsent(c) {
    const payload = { v: CONSENT_VERSION, t: Date.now(), ...c };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyConsent(payload);
    document.dispatchEvent(new CustomEvent('lzr:consent', { detail: payload }));
  }

  function applyConsent(c) {
    // Google Consent Mode v2 hook (si se usa GA4 en futuro)
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: c.marketing ? 'granted' : 'denied',
        ad_user_data: c.marketing ? 'granted' : 'denied',
        ad_personalization: c.marketing ? 'granted' : 'denied',
        analytics_storage: 'granted'
      });
    }
    // Meta Pixel grant/revoke
    if (typeof window.fbq === 'function') {
      window.fbq('consent', c.marketing ? 'grant' : 'revoke');
    }
    // Hook custom para n8n / otras integraciones
    document.dispatchEvent(new CustomEvent('lzr:consent:applied', { detail: c }));
  }

  function buildBanner() {
    const wrap = document.createElement('div');
    wrap.className = 'lzr-cookie-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-labelledby', 'lzr-cb-title');
    wrap.innerHTML = `
      <div class="lzr-cb-card">
        <h3 id="lzr-cb-title">${L.title}</h3>
        <p>${L.body}</p>
        <div class="lzr-cb-buttons">
          <button type="button" class="lzr-cb-btn lzr-cb-reject" data-action="reject">${L.reject}</button>
          <button type="button" class="lzr-cb-btn lzr-cb-settings" data-action="settings">${L.settings}</button>
          <button type="button" class="lzr-cb-btn lzr-cb-accept" data-action="accept">${L.accept}</button>
        </div>
        <div class="lzr-cb-settings-panel" hidden>
          <div class="lzr-cb-row">
            <label><input type="checkbox" checked disabled /> <strong>${L.necessary}</strong></label>
            <p>${L.necessaryDesc}</p>
          </div>
          <div class="lzr-cb-row">
            <label><input type="checkbox" id="lzr-cb-marketing" /> <strong>${L.marketing}</strong></label>
            <p>${L.marketingDesc}</p>
          </div>
          <div class="lzr-cb-buttons">
            <button type="button" class="lzr-cb-btn lzr-cb-save" data-action="save">${L.save}</button>
          </div>
        </div>
        <div class="lzr-cb-links">
          <a href="datenschutz.html">${L.privacyLink}</a> · <a href="impressum.html">${L.legalLink}</a>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;
      if (action === 'accept') { setConsent({ necessary: true, marketing: true }); wrap.remove(); }
      if (action === 'reject') { setConsent({ necessary: true, marketing: false }); wrap.remove(); }
      if (action === 'settings') { wrap.querySelector('.lzr-cb-settings-panel').hidden = false; }
      if (action === 'save') {
        const m = wrap.querySelector('#lzr-cb-marketing').checked;
        setConsent({ necessary: true, marketing: m });
        wrap.remove();
      }
    });
  }

  // Banner trigger desde footer (re-abrir preferencias)
  window.lzrOpenCookieSettings = function () {
    if (!document.querySelector('.lzr-cookie-banner')) buildBanner();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const c = getConsent();
    if (c) {
      applyConsent(c);
    } else {
      buildBanner();
    }
  });
})();
