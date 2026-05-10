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

  // Bloquear submit de formularios silenciosamente
  document.addEventListener('submit', function(e){
    e.preventDefault();
    return false;
  }, true);
})();
