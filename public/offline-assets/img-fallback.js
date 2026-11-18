/*
 * SIUBA — pengganti gambar saat offline.
 * Jika sebuah <img> gagal dimuat (mis. foto contoh dari internet saat jaringan pondok offline),
 * ganti dengan gambar hijau bertuliskan keterangan (alt) agar tampilan tetap rapi.
 */
(function () {
  function placeholder(label) {
    var text = String(label || 'Foto').replace(/[<>&"]/g, '').slice(0, 48);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14492b"/><stop offset="1" stop-color="#071f12"/></linearGradient>' +
      '<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0L40 20L20 40L0 20Z" fill="none" stroke="#a3e635" stroke-opacity=".08"/></pattern></defs>' +
      '<rect width="800" height="500" fill="url(#g)"/><rect width="800" height="500" fill="url(#p)"/>' +
      '<circle cx="400" cy="210" r="38" fill="none" stroke="#a3e635" stroke-opacity=".55" stroke-width="3"/>' +
      '<path d="M382 222l12-14 10 11 7-8 13 11z" fill="#a3e635" fill-opacity=".55"/>' +
      '<text x="400" y="300" text-anchor="middle" font-family="Urbanist, Arial, sans-serif" font-size="26" font-weight="700" fill="#ecfccb" fill-opacity=".85">' + text + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  document.addEventListener(
    'error',
    function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || img.dataset.siubaFallback) return;
      img.dataset.siubaFallback = '1';
      img.removeAttribute('srcset');
      img.src = placeholder(img.alt);
    },
    true
  );
})();
