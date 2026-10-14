// Veritabanı katmanı: tüm veriler tarayıcının IndexedDB'sinde saklanır.
// Hiçbir veri dışarıya / bir sunucuya gönderilmez.
window.KDA = window.KDA || {};

KDA.vt = (function () {
  const VT_ADI = 'kocatepe-deneme-analiz';
  const SURUM = 1;
  const DEPOLAR = {
    ogrenciler: 'no',      // { no, ad, sinif }
    denemeler: 'id',       // { id, ad, tarih, yayinevi, seviye, sorular[], cevaplar{ogrNo: ['D','Y','B',...]} }
    kazanimlar: 'kod',     // { kod, aciklama, ders }
    ayarlar: 'anahtar',    // { anahtar, deger }
  };

  let baglanti = null;

  function ac() {
    if (baglanti) return Promise.resolve(baglanti);
    return new Promise((coz, reddet) => {
      const istek = indexedDB.open(VT_ADI, SURUM);
      istek.onupgradeneeded = () => {
        const vt = istek.result;
        for (const [ad, anahtar] of Object.entries(DEPOLAR)) {
          if (!vt.objectStoreNames.contains(ad)) vt.createObjectStore(ad, { keyPath: anahtar });
        }
      };
      istek.onsuccess = () => { baglanti = istek.result; coz(baglanti); };
      istek.onerror = () => reddet(istek.error);
    });
  }

  function islem(depolar, mod, fn) {
    return ac().then(vt => new Promise((coz, reddet) => {
      const tx = vt.transaction(depolar, mod);
      let sonuc;
      Promise.resolve(fn(tx)).then(s => { sonuc = s; });
      tx.oncomplete = () => coz(sonuc);
      tx.onerror = () => reddet(tx.error);
      tx.onabort = () => reddet(tx.error);
    }));
  }

  function istekSonucu(istek) {
    return new Promise((coz, reddet) => {
      istek.onsuccess = () => coz(istek.result);
      istek.onerror = () => reddet(istek.error);
    });
  }

  function tumu(depo) {
    return islem([depo], 'readonly', tx => istekSonucu(tx.objectStore(depo).getAll()));
  }

  function getir(depo, anahtar) {
    return islem([depo], 'readonly', tx => istekSonucu(tx.objectStore(depo).get(anahtar)));
  }

  // Birden çok kaydı tek seferde yazar
  function koy(depo, kayitlar) {
    const liste = Array.isArray(kayitlar) ? kayitlar : [kayitlar];
    return islem([depo], 'readwrite', tx => { liste.forEach(k => tx.objectStore(depo).put(k)); });
  }

  function sil(depo, anahtar) {
    return islem([depo], 'readwrite', tx => { tx.objectStore(depo).delete(anahtar); });
  }

  function hepsiniSil() {
    const adlar = Object.keys(DEPOLAR);
    return islem(adlar, 'readwrite', tx => { adlar.forEach(a => tx.objectStore(a).clear()); });
  }

  async function ayarGetir(anahtar, varsayilan) {
    const k = await getir('ayarlar', anahtar);
    return k ? k.deger : varsayilan;
  }

  function ayarKoy(anahtar, deger) {
    return koy('ayarlar', { anahtar, deger });
  }

  // Yedek: tüm veriyi tek bir JSON nesnesine toplar
  async function yedekAl() {
    const yedek = { uygulama: VT_ADI, surum: SURUM, tarih: new Date().toISOString() };
    for (const ad of Object.keys(DEPOLAR)) yedek[ad] = await tumu(ad);
    return yedek;
  }

  // Yedekten geri yükleme: mevcut verinin TAMAMI silinir, yedektekiler yazılır
  async function yedekYukle(yedek) {
    if (!yedek || yedek.uygulama !== VT_ADI) throw new Error('Bu dosya Kocatepe Deneme Analiz yedeği değil.');
    const adlar = Object.keys(DEPOLAR);
    await islem(adlar, 'readwrite', tx => {
      adlar.forEach(a => {
        const depo = tx.objectStore(a);
        depo.clear();
        (yedek[a] || []).forEach(k => depo.put(k));
      });
    });
  }

  return { tumu, getir, koy, sil, hepsiniSil, ayarGetir, ayarKoy, yedekAl, yedekYukle };
})();
