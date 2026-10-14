// Dosya okuma (CSV / Excel) ve yayınevi şablonuna göre dönüştürme.
window.KDA = window.KDA || {};

KDA.iceaktar = (function () {
  // Uygulamanın tanıdığı ders adları; dosyadaki farklı yazımlar bunlara eşlenir.
  const DERSLER = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'T.C. İnkılap Tarihi', 'Sosyal Bilgiler', 'Din Kültürü', 'İngilizce'];
  const DERS_ESANLAMLI = {
    'turkce': 'Türkçe',
    'matematik': 'Matematik', 'mat': 'Matematik',
    'fen': 'Fen Bilimleri', 'fen bilimleri': 'Fen Bilimleri',
    'sosyal': 'Sosyal Bilgiler', 'sosyal bilgiler': 'Sosyal Bilgiler',
    'inkilap': 'T.C. İnkılap Tarihi', 'inkilap tarihi': 'T.C. İnkılap Tarihi',
    'tc inkilap tarihi': 'T.C. İnkılap Tarihi', 't c inkilap tarihi ve ataturkculuk': 'T.C. İnkılap Tarihi',
    'inkilap tarihi ve ataturkculuk': 'T.C. İnkılap Tarihi',
    'din': 'Din Kültürü', 'din kulturu': 'Din Kültürü', 'din kulturu ve ahlak bilgisi': 'Din Kültürü',
    'ingilizce': 'İngilizce', 'yabanci dil': 'İngilizce', 'ing': 'İngilizce',
  };

  // Yayınevi şablonları. Her alan, dosyadaki sütun başlığına eşlenir.
  // İleride Ayarlar ekranından yeni şablon eklenebilecek.
  const SABLONLAR = [
    {
      id: 'ornek-yayinlari',
      ad: 'Örnek Yayınları (soru bazlı liste)',
      yayinevi: 'Örnek Yayınları',
      aciklama: 'Her satırda bir öğrencinin bir sorusu vardır.',
      alanlar: {
        ogrNo: 'OgrenciNo', ad: 'AdSoyad', sinif: 'Sinif', ders: 'Ders', soruNo: 'SoruNo',
        kazanim: 'KazanimKodu', kazanimAciklama: 'KazanimAciklama',
        dogruCevap: 'DogruCevap', ogrCevap: 'OgrenciCevabi', durum: '',
      },
    },
  ];

  const ALAN_ADLARI = {
    ogrNo: 'Öğrenci no', ad: 'Ad soyad', sinif: 'Sınıf/şube', ders: 'Ders', soruNo: 'Soru no',
    kazanim: 'Kazanım kodu', kazanimAciklama: 'Kazanım açıklaması',
    dogruCevap: 'Doğru cevap', ogrCevap: 'Öğrenci cevabı', durum: 'Doğru/Yanlış/Boş',
  };
  const ZORUNLU = ['ogrNo', 'ad', 'ders', 'soruNo'];

  // Karşılaştırma için: küçük harf, Türkçe karakterleri sadeleştir, boşluk/noktalama at
  function sade(metin) {
    return String(metin == null ? '' : metin)
      .replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function dersAdi(ham) {
    const s = sade(ham);
    if (DERS_ESANLAMLI[s]) return DERS_ESANLAMLI[s];
    const bulunan = DERSLER.find(d => sade(d) === s);
    return bulunan || String(ham).trim();
  }

  // ---- CSV okuma ----
  function ayiracBul(ilkSatir) {
    const adaylar = [';', '\t', ','];
    let en = ';', enSayi = -1;
    adaylar.forEach(a => { const n = ilkSatir.split(a).length; if (n > enSayi) { en = a; enSayi = n; } });
    return en;
  }

  function csvCoz(metin) {
    metin = metin.replace(/^﻿/, '');
    const ilkSatir = metin.split(/\r?\n/, 1)[0] || '';
    const ayirac = ayiracBul(ilkSatir);
    const satirlar = [];
    let satir = [], alan = '', tirnak = false;
    for (let i = 0; i < metin.length; i++) {
      const c = metin[i];
      if (tirnak) {
        if (c === '"') {
          if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false;
        } else alan += c;
      } else if (c === '"') tirnak = true;
      else if (c === ayirac) { satir.push(alan); alan = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && metin[i + 1] === '\n') i++;
        satir.push(alan); satirlar.push(satir); satir = []; alan = '';
      } else alan += c;
    }
    if (alan !== '' || satir.length) { satir.push(alan); satirlar.push(satir); }
    return satirlar.filter(s => s.some(h => String(h).trim() !== ''));
  }

  // Satır dizisini { başlık: değer } nesnelerine çevirir
  function nesneyeCevir(tablo) {
    if (!tablo.length) return { basliklar: [], satirlar: [] };
    const basliklar = tablo[0].map(b => String(b).trim());
    const satirlar = tablo.slice(1).map(s => {
      const o = {};
      basliklar.forEach((b, i) => { o[b] = s[i] == null ? '' : String(s[i]).trim(); });
      return o;
    });
    return { basliklar, satirlar };
  }

  // UTF-8 bozuk görünüyorsa Türkçe Windows kodlamasıyla (1254) yeniden dene
  function metinCoz(tampon) {
    const utf8 = new TextDecoder('utf-8').decode(tampon);
    if (!utf8.includes('�')) return utf8;
    try { return new TextDecoder('windows-1254').decode(tampon); } catch (e) { return utf8; }
  }

  async function dosyaOku(dosya) {
    const ad = dosya.name.toLowerCase();
    const tampon = await dosya.arrayBuffer();
    if (ad.endsWith('.xlsx') || ad.endsWith('.xls') || ad.endsWith('.ods')) {
      if (!window.XLSX) throw new Error('Excel okuyucu yüklenemedi.');
      const kitap = XLSX.read(tampon, { type: 'array' });
      const sayfa = kitap.Sheets[kitap.SheetNames[0]];
      const tablo = XLSX.utils.sheet_to_json(sayfa, { header: 1, raw: false, defval: '' });
      return nesneyeCevir(tablo.filter(s => s.some(h => String(h).trim() !== '')));
    }
    if (ad.endsWith('.csv') || ad.endsWith('.txt')) return nesneyeCevir(csvCoz(metinCoz(tampon)));
    throw new Error('Bu dosya türü desteklenmiyor. Lütfen Excel (.xlsx) veya CSV dosyası seçin.');
  }

  function metindenOku(metin) {
    return nesneyeCevir(csvCoz(metin));
  }

  // Şablondaki sütun adlarını dosyadaki gerçek başlıklarla eşleştirir (büyük/küçük harf, Türkçe karakter fark etmez)
  function sutunlariEsle(sablon, basliklar) {
    const esleme = {}, eksik = [];
    for (const [alan, sutun] of Object.entries(sablon.alanlar)) {
      if (!sutun) continue;
      const bulunan = basliklar.find(b => sade(b) === sade(sutun));
      if (bulunan) esleme[alan] = bulunan;
      else if (ZORUNLU.includes(alan)) eksik.push(`${ALAN_ADLARI[alan]} ("${sutun}")`);
    }
    if (!esleme.durum && !(esleme.dogruCevap && esleme.ogrCevap)) {
      eksik.push('Doğru/Yanlış/Boş sütunu ya da Doğru cevap + Öğrenci cevabı sütunları');
    }
    return { esleme, eksik };
  }

  function durumBul(satir, esleme) {
    if (esleme.durum) {
      const d = sade(satir[esleme.durum]);
      if (['d', 'dogru', '1', 'true', 'evet'].includes(d)) return 'D';
      if (['y', 'yanlis', '0', 'false', 'hayir'].includes(d)) return 'Y';
      return 'B';
    }
    const ogr = String(satir[esleme.ogrCevap] || '').trim().toUpperCase();
    const dogru = String(satir[esleme.dogruCevap] || '').trim().toUpperCase();
    if (!ogr || ogr === '-' || ogr === '*') return 'B';
    return ogr === dogru ? 'D' : 'Y';
  }

  // Okunan satırları uygulamanın deneme yapısına dönüştürür.
  function donustur(veri, sablon) {
    const { esleme, eksik } = sutunlariEsle(sablon, veri.basliklar);
    const sonuc = { hatalar: [], uyarilar: [], ogrenciler: [], sorular: [], cevaplar: {}, kazanimlar: [], esleme };
    if (eksik.length) {
      sonuc.hatalar.push('Dosyada şu sütunlar bulunamadı: ' + eksik.join(', ') +
        '. Doğru yayınevi şablonunu seçtiğinizden emin olun.');
      return sonuc;
    }
    const soruHaritasi = new Map(); // "ders|no" → soru
    const ogrHaritasi = new Map();
    const kazanimHaritasi = new Map();
    const hamCevap = new Map(); // ogrNo → Map("ders|no" → durum)
    let atlanan = 0;

    veri.satirlar.forEach(satir => {
      const no = String(satir[esleme.ogrNo] || '').trim();
      const ders = dersAdi(satir[esleme.ders]);
      const soruNo = parseInt(satir[esleme.soruNo], 10);
      if (!no || !ders || !Number.isFinite(soruNo)) { atlanan++; return; }
      const anahtar = ders + '|' + soruNo;
      const kazanim = esleme.kazanim ? String(satir[esleme.kazanim] || '').trim() : '';
      if (!soruHaritasi.has(anahtar)) {
        soruHaritasi.set(anahtar, {
          ders, no: soruNo, kazanim,
          dogruCevap: esleme.dogruCevap ? String(satir[esleme.dogruCevap] || '').trim().toUpperCase() : '',
        });
      }
      if (kazanim && !kazanimHaritasi.has(kazanim)) {
        kazanimHaritasi.set(kazanim, { kod: kazanim, ders, aciklama: esleme.kazanimAciklama ? String(satir[esleme.kazanimAciklama] || '').trim() : '' });
      }
      if (!ogrHaritasi.has(no)) {
        ogrHaritasi.set(no, { no, ad: String(satir[esleme.ad] || '').trim(), sinif: esleme.sinif ? String(satir[esleme.sinif] || '').trim() : '' });
        hamCevap.set(no, new Map());
      }
      hamCevap.get(no).set(anahtar, durumBul(satir, esleme));
    });

    const dersSirasi = d => { const i = DERSLER.indexOf(d); return i < 0 ? 99 : i; };
    sonuc.sorular = [...soruHaritasi.values()].sort((a, b) => dersSirasi(a.ders) - dersSirasi(b.ders) || a.ders.localeCompare(b.ders, 'tr') || a.no - b.no);
    sonuc.ogrenciler = [...ogrHaritasi.values()];
    sonuc.kazanimlar = [...kazanimHaritasi.values()];
    for (const [no, harita] of hamCevap) {
      sonuc.cevaplar[no] = sonuc.sorular.map(s => harita.get(s.ders + '|' + s.no) || 'B');
    }

    if (atlanan) sonuc.uyarilar.push(`${atlanan} satır öğrenci no, ders veya soru no eksik olduğu için atlandı.`);
    if (!sonuc.ogrenciler.length) sonuc.hatalar.push('Dosyada okunabilen öğrenci bulunamadı.');
    const bilinmeyen = [...new Set(sonuc.sorular.map(s => s.ders))].filter(d => !DERSLER.includes(d));
    if (bilinmeyen.length) sonuc.uyarilar.push('Tanınmayan ders adı: ' + bilinmeyen.join(', ') + '. Olduğu gibi kaydedilecek.');
    const kazanimsiz = sonuc.sorular.filter(s => !s.kazanim).length;
    if (kazanimsiz) sonuc.uyarilar.push(`${kazanimsiz} sorunun kazanım kodu yok; bu sorular kazanım analizinde görünmeyecek.`);
    return sonuc;
  }

  return { SABLONLAR, ALAN_ADLARI, DERSLER, dosyaOku, metindenOku, donustur, sade };
})();
