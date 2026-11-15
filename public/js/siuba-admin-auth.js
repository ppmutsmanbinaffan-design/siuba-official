/*
 * SIUBA - Pelindung halaman admin statis (CMS Landing, Manajemen PSB, Registrasi RFID).
 * - Mengambil token login SIUBA (localStorage / sessionStorage 'siuba_auth_token').
 * - Menambahkan header Authorization: Bearer <token> otomatis ke setiap fetch '/api/...'.
 * - Jika belum login / sesi habis (401), diarahkan ke halaman login.
 */
(function () {
  var TOKEN_KEY = 'siuba_auth_token';

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function goLogin() {
    var back = encodeURIComponent(location.pathname + location.search);
    location.replace('/login?redirect=' + back);
  }

  if (!getToken()) {
    goLogin();
    return;
  }

  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var isApi = url.indexOf('/api/') === 0 || url.indexOf(location.origin + '/api/') === 0;
    if (!isApi) return originalFetch(input, init);

    init = init || {};
    var headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
    if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + getToken());
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    init.headers = headers;

    return originalFetch(input, init).then(function (res) {
      if (res.status === 401) goLogin();
      if (res.status === 403) {
        console.warn('SIUBA: akun Anda tidak memiliki izin untuk aksi ini (' + url + ').');
      }
      return res;
    });
  };

  // Helper escape HTML untuk dipakai saat menyusun innerHTML
  window.siubaEsc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
})();
