// Demo mode — anula todo tracking, formularios reales y external requests no-críticos
(function(){
  // Stubs que no hacen nada
  var noop = function(){};
  window.fbq    = noop;
  window.gtag   = noop;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push = noop;

  // Bloquear scripts de tracking conocidos
  var blockedHosts = [
    'connect.facebook.net',
    'google-analytics.com',
    'googletagmanager.com',
    'static.hotjar.com',
    'clarity.ms',
    'cdn.amplitude.com'
  ];
  var origCreateElement = document.createElement.bind(document);
  document.createElement = function(tag){
    var el = origCreateElement(tag);
    if (tag.toLowerCase() === 'script') {
      var origSet = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src') ||
                    Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'src');
      try {
        Object.defineProperty(el, 'src', {
          set: function(v){
            for (var i=0;i<blockedHosts.length;i++){
              if (v && v.indexOf(blockedHosts[i]) !== -1) return;
            }
            if (origSet && origSet.set) origSet.set.call(this, v);
            else this.setAttribute('src', v);
          },
          get: function(){ return this.getAttribute('src') || ''; }
        });
      } catch(e){}
    }
    return el;
  };

  // Interceptar fetch a endpoints internos (CAPI, formularios)
  var origFetch = window.fetch;
  window.fetch = function(url, opts){
    var u = (typeof url === 'string') ? url : (url && url.url) || '';
    if (u.indexOf('/api/meta-conversion') !== -1 ||
        u.indexOf('/api/contact') !== -1 ||
        u.indexOf('/api/reservar') !== -1 ||
        u.indexOf('/api/booking') !== -1 ||
        u.indexOf('squareup.com') !== -1 ||
        u.indexOf('airtable.com') !== -1) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, demo: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      }));
    }
    return origFetch.apply(this, arguments);
  };

  // Avisar al hacer submit de cualquier form
  document.addEventListener('submit', function(e){
    e.preventDefault();
    alert('🛈 Modo demo: este formulario no envía datos reales.\n\nEs una vista interactiva del proyecto.');
    return false;
  }, true);

  // Banner discreto arriba
  document.addEventListener('DOMContentLoaded', function(){
    var bar = document.createElement('div');
    bar.innerHTML = '<strong>● DEMO</strong> &nbsp;Vista interactiva del proyecto · sin tracking · sin envío de datos';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(124,58,237,0.95);color:#fff;font:600 12px/1 -apple-system,sans-serif;letter-spacing:0.04em;padding:8px 16px;text-align:center;z-index:2147483647;backdrop-filter:blur(8px);';
    document.body.appendChild(bar);
    document.body.style.paddingTop = (parseFloat(getComputedStyle(document.body).paddingTop || '0') + 30) + 'px';
  });
})();
