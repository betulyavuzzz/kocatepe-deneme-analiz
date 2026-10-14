// Net, ortalama ve kazanım başarı hesapları.
window.KDA = window.KDA || {};

KDA.hesap = (function () {
  // yanlisKatsayi: kaç yanlışın bir doğruyu götürdüğü (0 = yanlışlar neti etkilemez)
  function net(d, y, yanlisKatsayi) {
    return yanlisKatsayi > 0 ? d - y / yanlisKatsayi : d;
  }

  function yuvarla(x, basamak = 2) {
    const k = Math.pow(10, basamak);
    return Math.round(x * k) / k;
  }

  function denemeDersleri(deneme) {
    return [...new Set(deneme.sorular.map(s => s.ders))];
  }

  // Bir öğrencinin bir denemedeki ders ders doğru/yanlış/boş/net özeti
  function ogrenciOzeti(deneme, ogrNo, yanlisKatsayi) {
    const cevap = deneme.cevaplar[ogrNo];
    if (!cevap) return null;
    const dersler = {};
    deneme.sorular.forEach((s, i) => {
      const o = dersler[s.ders] || (dersler[s.ders] = { d: 0, y: 0, b: 0, soru: 0 });
      o.soru++;
      if (cevap[i] === 'D') o.d++; else if (cevap[i] === 'Y') o.y++; else o.b++;
    });
    const toplam = { d: 0, y: 0, b: 0, soru: 0 };
    for (const o of Object.values(dersler)) {
      o.net = yuvarla(net(o.d, o.y, yanlisKatsayi));
      toplam.d += o.d; toplam.y += o.y; toplam.b += o.b; toplam.soru += o.soru;
    }
    toplam.net = yuvarla(net(toplam.d, toplam.y, yanlisKatsayi));
    return { dersler, toplam };
  }

  // Denemeye giren öğrencilerin ortalama netleri (ders ders ve toplam)
  function sinifOrtalamasi(deneme, ogrNolari, yanlisKatsayi) {
    const ozetler = ogrNolari.map(no => ogrenciOzeti(deneme, no, yanlisKatsayi)).filter(Boolean);
    if (!ozetler.length) return null;
    const ort = { dersler: {}, toplam: 0, kisi: ozetler.length };
    denemeDersleri(deneme).forEach(d => {
      ort.dersler[d] = yuvarla(ozetler.reduce((t, o) => t + (o.dersler[d] ? o.dersler[d].net : 0), 0) / ozetler.length);
    });
    ort.toplam = yuvarla(ozetler.reduce((t, o) => t + o.toplam.net, 0) / ozetler.length);
    return ort;
  }

  // Kazanım × deneme başarı tablosu.
  // ogrNolari: hesaba katılacak öğrenciler (tek öğrenci ya da tüm sınıf)
  // Dönüş: Map(kazanimKodu → { ders, denemeler: { denemeId: { dogru, toplam } }, dogru, toplam })
  function kazanimTablosu(denemeler, ogrNolari, dersFiltresi) {
    const tablo = new Map();
    denemeler.forEach(deneme => {
      deneme.sorular.forEach((s, i) => {
        if (!s.kazanim) return;
        if (dersFiltresi && s.ders !== dersFiltresi) return;
        let satir = tablo.get(s.kazanim);
        if (!satir) { satir = { kod: s.kazanim, ders: s.ders, denemeler: {}, dogru: 0, toplam: 0 }; tablo.set(s.kazanim, satir); }
        const hucre = satir.denemeler[deneme.id] || (satir.denemeler[deneme.id] = { dogru: 0, toplam: 0 });
        ogrNolari.forEach(no => {
          const c = deneme.cevaplar[no];
          if (!c) return;
          hucre.toplam++; satir.toplam++;
          if (c[i] === 'D') { hucre.dogru++; satir.dogru++; }
        });
      });
    });
    return tablo;
  }

  function yuzde(dogru, toplam) {
    return toplam ? Math.round(100 * dogru / toplam) : null;
  }

  // Başarı yüzdesine göre seviye: renk tek başına bilgi taşımasın diye etiketle birlikte kullanılır
  function seviye(y) {
    if (y == null) return { sinif: 'yok', etiket: '—' };
    if (y < 50) return { sinif: 'dusuk', etiket: 'Eksik' };
    if (y < 75) return { sinif: 'orta', etiket: 'Gelişmeli' };
    return { sinif: 'iyi', etiket: 'İyi' };
  }

  return { net, yuvarla, denemeDersleri, ogrenciOzeti, sinifOrtalamasi, kazanimTablosu, yuzde, seviye };
})();
