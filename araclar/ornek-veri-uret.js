// Uydurma örnek veri üretici.
// Çalıştırma: node araclar/ornek-veri-uret.js
// Çıktı: ornek-veri/*.csv ve js/ornek-veri.js
// Tüm isimler, numaralar ve sonuçlar UYDURMADIR; gerçek öğrenciyle ilgisi yoktur.

const fs = require('fs');
const path = require('path');

// Sabit tohumlu rastgele sayı üreteci (her çalıştırmada aynı veri çıksın)
let tohum = 20260914;
function rastgele() {
  tohum = (tohum * 1664525 + 1013904223) % 4294967296;
  return tohum / 4294967296;
}

const ogrenciler = [
  ['101', 'Ada Yıldız'], ['102', 'Bora Kaya'], ['103', 'Cemre Aksoy'],
  ['104', 'Deniz Tunç'], ['105', 'Ege Sarıkaya'], ['106', 'Fulya Demirel'],
  ['107', 'Göktuğ Ercan'], ['108', 'Hira Bulut'], ['109', 'İlkay Torun'],
  ['110', 'Kerem Ova'],
];
const SINIF = '8-A';

// Ders → soru sayısı ve örnek kazanımlar (ünite düzeyinde, örnek amaçlı)
const dersler = [
  { ad: 'Türkçe', soru: 20, kazanimlar: [
    ['T.8.1', 'Sözcükte ve söz öbeklerinde anlam'],
    ['T.8.2', 'Cümlede anlam'],
    ['T.8.3', 'Paragrafta ana fikir ve yardımcı fikir'],
    ['T.8.4', 'Fiilimsiler'],
    ['T.8.5', 'Cümlenin ögeleri'],
  ] },
  { ad: 'Matematik', soru: 20, kazanimlar: [
    ['M.8.1', 'Çarpanlar ve katlar'],
    ['M.8.2', 'Üslü ifadeler'],
    ['M.8.3', 'Kareköklü ifadeler'],
    ['M.8.4', 'Veri analizi'],
    ['M.8.5', 'Basit olayların olma olasılığı'],
  ] },
  { ad: 'Fen Bilimleri', soru: 20, kazanimlar: [
    ['F.8.1', 'Mevsimler ve iklim'],
    ['F.8.2', 'DNA ve genetik kod'],
    ['F.8.3', 'Basınç'],
    ['F.8.4', 'Madde ve endüstri'],
  ] },
  { ad: 'T.C. İnkılap Tarihi', soru: 10, kazanimlar: [
    ['İTA.8.1', 'Bir kahraman doğuyor'],
    ['İTA.8.2', 'Millî uyanış'],
  ] },
  { ad: 'Din Kültürü', soru: 10, kazanimlar: [
    ['DKAB.8.1', 'Kader inancı'],
    ['DKAB.8.2', 'Zekât ve sadaka'],
  ] },
  { ad: 'İngilizce', soru: 10, kazanimlar: [
    ['E.8.1', 'Friendship'],
    ['E.8.2', 'Teen life'],
    ['E.8.3', 'In the kitchen'],
  ] },
];

const denemeler = [
  { dosya: 'ornek-yayinlari-deneme-1.csv', ad: '1. Deneme', tarih: '2026-09-19' },
  { dosya: 'ornek-yayinlari-deneme-2.csv', ad: '2. Deneme', tarih: '2026-09-26' },
  { dosya: 'ornek-yayinlari-deneme-3.csv', ad: '3. Deneme', tarih: '2026-10-03' },
];

const SECENEKLER = ['A', 'B', 'C', 'D'];

// Her öğrencinin ders bazında yeteneği (0.3–0.9) ve kazanım zorlukları
const yetenek = {};
ogrenciler.forEach(([no]) => {
  yetenek[no] = {};
  const genel = 0.35 + rastgele() * 0.45;
  dersler.forEach(d => { yetenek[no][d.ad] = Math.min(0.92, Math.max(0.2, genel + (rastgele() - 0.5) * 0.3)); });
});
const zorluk = {};
dersler.forEach(d => d.kazanimlar.forEach(([kod]) => { zorluk[kod] = (rastgele() - 0.5) * 0.4; }));

const BASLIK = ['OgrenciNo', 'AdSoyad', 'Sinif', 'Ders', 'SoruNo', 'KazanimKodu', 'KazanimAciklama', 'DogruCevap', 'OgrenciCevabi'];
const dosyalar = {};

denemeler.forEach((deneme, di) => {
  // Bu denemenin cevap anahtarı ve soru-kazanım eşleşmesi
  const sorular = [];
  dersler.forEach(d => {
    for (let i = 1; i <= d.soru; i++) {
      const k = d.kazanimlar[Math.floor((i - 1) * d.kazanimlar.length / d.soru)];
      sorular.push({ ders: d.ad, no: i, kod: k[0], aciklama: k[1], dogru: SECENEKLER[Math.floor(rastgele() * 4)] });
    }
  });
  const satirlar = [BASLIK.join(';')];
  ogrenciler.forEach(([no, ad]) => {
    sorular.forEach(s => {
      // Denemeler ilerledikçe hafif gelişim
      const p = yetenek[no][s.ders] - zorluk[s.kod] + di * 0.05;
      const r = rastgele();
      let cevap;
      if (r < p) cevap = s.dogru;
      else if (r < p + (1 - p) * 0.3) cevap = ''; // boş
      else cevap = SECENEKLER.filter(x => x !== s.dogru)[Math.floor(rastgele() * 3)];
      satirlar.push([no, ad, SINIF, s.ders, s.no, s.kod, s.aciklama, s.dogru, cevap].join(';'));
    });
  });
  dosyalar[deneme.dosya] = satirlar.join('\n') + '\n';
});

const kok = path.join(__dirname, '..');
for (const [ad, icerik] of Object.entries(dosyalar)) {
  fs.writeFileSync(path.join(kok, 'ornek-veri', ad), icerik);
}
const js = '// Bu dosya araclar/ornek-veri-uret.js ile otomatik üretilmiştir. Elle düzenlemeyin.\n' +
  '// İçindeki tüm isimler ve sonuçlar UYDURMADIR.\n' +
  'window.KDA = window.KDA || {};\n' +
  'KDA.ornekVeri = ' + JSON.stringify(denemeler.map(d => ({
    dosya: d.dosya, ad: d.ad, tarih: d.tarih, yayinevi: 'Örnek Yayınları', icerik: dosyalar[d.dosya],
  }))) + ';\n';
fs.writeFileSync(path.join(kok, 'js', 'ornek-veri.js'), js);
console.log('Örnek veri üretildi:', Object.keys(dosyalar).join(', '));
