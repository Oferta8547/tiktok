/* ReformaMax — captura e persistência de parâmetros UTM.
   Porte do padrão usado no checkout de referência (rotta_utm_params + __rmUtmQS).
   Não é pixel de anúncio: apenas guarda os parâmetros de origem na sessão
   para que cheguem íntegros ao backend, ao gateway e à UTMify. */
(function () {
  'use strict';

  var STORAGE_KEY = 'rotta_utm_params';
  var KEYS = [
    'src', 'sck',
    'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
    'utm_id', 'xcod', 'ttclid'
  ];

  function fromUrl() {
    var sp = new URLSearchParams(window.location.search);
    var out = {};
    var any = false;
    for (var i = 0; i < KEYS.length; i++) {
      var v = sp.get(KEYS[i]);
      out[KEYS[i]] = v;
      if (v !== null && v !== '') any = true;
    }
    return any ? out : null;
  }

  function fromStorage() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function capture() {
    var url = fromUrl();
    if (!url) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(url));
    } catch (e) {}
  }

  // Parâmetros efetivos: URL atual tem prioridade; senão, o que ficou na sessão.
  function getUtmParams() {
    var empty = {};
    for (var i = 0; i < KEYS.length; i++) empty[KEYS[i]] = null;
    return fromUrl() || fromStorage() || empty;
  }

  // Querystring (com "&" na frente) para anexar ao polling de status.
  function utmQS() {
    try {
      var d = getUtmParams() || {};
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
      var q = '';
      for (var i = 0; i < keys.length; i++) {
        var v = d[keys[i]];
        if (v) q += '&' + keys[i] + '=' + encodeURIComponent(v);
      }
      return q;
    } catch (e) { return ''; }
  }

  // Acrescenta os UTMs a uma URL interna (preserva a atribuição na navegação).
  function withUtm(url) {
    var d = getUtmParams() || {};
    var sp = new URLSearchParams();
    for (var i = 0; i < KEYS.length; i++) {
      if (d[KEYS[i]]) sp.set(KEYS[i], d[KEYS[i]]);
    }
    var qs = sp.toString();
    if (!qs) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + qs;
  }

  capture();

  window.__rmUtmParams = getUtmParams;
  window.__rmUtmQS = utmQS;
  window.__rmWithUtm = withUtm;
})();
