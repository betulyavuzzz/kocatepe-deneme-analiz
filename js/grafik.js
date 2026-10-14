// Basit SVG çizgi grafik: öğrencinin toplam neti ve sınıf ortalaması.
// Harici kütüphane kullanılmaz (çevrimdışı çalışsın, veri dışarı çıkmasın).
window.KDA = window.KDA || {};

KDA.grafik = (function () {
  const NS = 'http://www.w3.org/2000/svg';

  function el(ad, ozellik, ust) {
    const e = document.createElementNS(NS, ad);
    for (const [k, v] of Object.entries(ozellik || {})) e.setAttribute(k, v);
    if (ust) ust.appendChild(e);
    return e;
  }

  // noktalar: [{ etiket, alt, ogrenci, ortalama }]
  function netGelisimi(kap, noktalar, maksimum) {
    kap.innerHTML = '';
    if (!noktalar.length) { kap.textContent = 'Grafik için deneme yok.'; return; }
    const G = 640, Y = 260, sol = 44, sag = 56, ust = 20, alt = 48;
    const svg = el('svg', { viewBox: `0 0 ${G} ${Y}`, class: 'grafik-svg', role: 'img',
      'aria-label': 'Denemelere göre toplam net gelişimi' }, kap);
    const enBuyuk = Math.max(maksimum || 0, ...noktalar.map(n => Math.max(n.ogrenci, n.ortalama || 0)));
    const ustSinir = Math.max(10, Math.ceil(enBuyuk / 10) * 10);
    const x = i => noktalar.length === 1 ? (sol + G - sag) / 2 : sol + i * (G - sol - sag) / (noktalar.length - 1);
    const y = v => ust + (Y - ust - alt) * (1 - Math.max(0, v) / ustSinir);

    // Yatay kılavuz çizgileri
    const adim = ustSinir <= 40 ? 10 : 20;
    for (let v = 0; v <= ustSinir; v += adim) {
      el('line', { x1: sol, x2: G - sag, y1: y(v), y2: y(v), class: v === 0 ? 'eksen' : 'kilavuz' }, svg);
      const t = el('text', { x: sol - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'eksen-yazi' }, svg);
      t.textContent = v;
    }
    noktalar.forEach((n, i) => {
      const t = el('text', { x: x(i), y: Y - alt + 20, 'text-anchor': 'middle', class: 'eksen-yazi' }, svg);
      t.textContent = n.etiket;
      const t2 = el('text', { x: x(i), y: Y - alt + 36, 'text-anchor': 'middle', class: 'eksen-yazi soluk' }, svg);
      t2.textContent = n.alt || '';
    });

    const yol = anahtar => noktalar.map((n, i) => `${i ? 'L' : 'M'}${x(i)},${y(n[anahtar])}`).join(' ');
    if (noktalar.some(n => n.ortalama != null)) el('path', { d: yol('ortalama'), class: 'seri-ortalama' }, svg);
    el('path', { d: yol('ogrenci'), class: 'seri-ogrenci' }, svg);
    noktalar.forEach((n, i) => {
      if (n.ortalama != null) el('circle', { cx: x(i), cy: y(n.ortalama), r: 4, class: 'nokta-ortalama' }, svg);
      el('circle', { cx: x(i), cy: y(n.ogrenci), r: 5, class: 'nokta-ogrenci' }, svg);
    });
    // Yalnızca son noktaya doğrudan etiket
    const son = noktalar.length - 1;
    const etiket = el('text', { x: x(son), y: y(noktalar[son].ogrenci) - 12, 'text-anchor': 'middle', class: 'deger-yazi' }, svg);
    etiket.textContent = noktalar[son].ogrenci.toLocaleString('tr-TR');

    // Üzerine gelince açıklama
    const ipucu = document.createElement('div');
    ipucu.className = 'ipucu';
    ipucu.hidden = true;
    kap.appendChild(ipucu);
    const genislik = noktalar.length === 1 ? G - sol - sag : (G - sol - sag) / (noktalar.length - 1);
    const dikey = el('line', { y1: ust, y2: Y - alt, class: 'imlec', visibility: 'hidden' }, svg);
    noktalar.forEach((n, i) => {
      const alan = el('rect', { x: x(i) - genislik / 2, y: 0, width: genislik, height: Y, fill: 'transparent' }, svg);
      const goster = () => {
        dikey.setAttribute('x1', x(i)); dikey.setAttribute('x2', x(i)); dikey.setAttribute('visibility', 'visible');
        ipucu.innerHTML = `<strong>${n.etiket}</strong> <span class="soluk">${n.alt || ''}</span><br>` +
          `Öğrenci: <b>${n.ogrenci.toLocaleString('tr-TR')}</b> net` +
          (n.ortalama != null ? `<br>Sınıf ort.: <b>${n.ortalama.toLocaleString('tr-TR')}</b> net` : '');
        ipucu.hidden = false;
        const oran = kap.clientWidth / G;
        ipucu.style.left = Math.min(kap.clientWidth - 170, Math.max(0, x(i) * oran - 80)) + 'px';
        ipucu.style.top = Math.max(0, y(n.ogrenci) * oran - 80) + 'px';
      };
      alan.addEventListener('mouseenter', goster);
      alan.addEventListener('touchstart', goster, { passive: true });
      alan.addEventListener('mouseleave', () => { ipucu.hidden = true; dikey.setAttribute('visibility', 'hidden'); });
    });
  }

  return { netGelisimi };
})();
