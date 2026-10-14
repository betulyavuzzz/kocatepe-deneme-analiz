// Uygulamanın ekranları: Deneme yükle, Öğrenci karnesi, Kazanım analizi, Ayarlar.
window.KDA = window.KDA || {};

(function () {
  const { vt, iceaktar, hesap, grafik } = KDA;
  const ana = document.getElementById('ana');

  // Bellekteki veri (her değişiklikten sonra veritabanından yeniden okunur)
  const veri = { ogrenciler: [], denemeler: [], kazanimlar: new Map(), yanlisKatsayi: 3 };
  const durum = { secilenOgrenci: null, kazanimDers: '', kazanimKapsam: '', onizleme: null };

  // HTML'e yazılan her dış metin (dosyadan gelen isimler vb.) bu fonksiyondan geçer
  function esc(m) {
    return String(m == null ? '' : m).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function sayi(x) { return x == null ? '—' : x.toLocaleString('tr-TR'); }
  function tarihYaz(t) {
    if (!t) return '';
    const [y, a, g] = t.split('-');
    return `${g}.${a}.${y}`;
  }
  function bugun() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function adSirala(a, b) { return a.ad.localeCompare(b.ad, 'tr'); }

  async function veriYukle() {
    const [ogr, den, kaz, k] = await Promise.all([
      vt.tumu('ogrenciler'), vt.tumu('denemeler'), vt.tumu('kazanimlar'), vt.ayarGetir('yanlisKatsayi', 3),
    ]);
    veri.ogrenciler = ogr.sort(adSirala);
    veri.denemeler = den.sort((a, b) => (a.tarih || '').localeCompare(b.tarih || '') || a.ad.localeCompare(b.ad, 'tr'));
    veri.kazanimlar = new Map(kaz.map(x => [x.kod, x]));
    veri.yanlisKatsayi = Number(k);
  }

  function bildir(mesaj, tur = 'bilgi') {
    const kutu = document.getElementById('bildirim');
    kutu.className = 'bildirim ' + tur;
    kutu.textContent = mesaj;
    kutu.hidden = false;
    clearTimeout(bildir.zaman);
    bildir.zaman = setTimeout(() => { kutu.hidden = true; }, 5000);
  }

  // Dönüştürülmüş bir dosyayı yeni deneme olarak kaydeder
  async function denemeKaydet(sonuc, bilgi) {
    const ayni = veri.denemeler.find(d => d.ad === bilgi.ad && d.tarih === bilgi.tarih);
    if (ayni) throw new Error(`"${bilgi.ad}" (${tarihYaz(bilgi.tarih)}) adlı deneme zaten kayıtlı.`);
    const deneme = {
      id: 'd' + Date.now() + Math.floor(Math.random() * 1000),
      ad: bilgi.ad, tarih: bilgi.tarih, yayinevi: bilgi.yayinevi, seviye: bilgi.seviye,
      sorular: sonuc.sorular, cevaplar: sonuc.cevaplar, eklenme: new Date().toISOString(),
    };
    await vt.koy('denemeler', deneme);
    await vt.koy('ogrenciler', sonuc.ogrenciler);
    // Kazanım listesine yalnızca yeni kodları ya da açıklaması boş olanları ekle
    const yeni = sonuc.kazanimlar.filter(k => {
      const eski = veri.kazanimlar.get(k.kod);
      return !eski || (!eski.aciklama && k.aciklama);
    });
    if (yeni.length) await vt.koy('kazanimlar', yeni);
    await veriYukle();
  }

  async function ornekVeriyiYukle() {
    const sablon = iceaktar.SABLONLAR[0];
    let eklenen = 0;
    for (const o of KDA.ornekVeri || []) {
      if (veri.denemeler.some(d => d.ad === o.ad && d.tarih === o.tarih)) continue;
      const sonuc = iceaktar.donustur(iceaktar.metindenOku(o.icerik), sablon);
      if (sonuc.hatalar.length) throw new Error(sonuc.hatalar.join(' '));
      await denemeKaydet(sonuc, { ad: o.ad, tarih: o.tarih, yayinevi: o.yayinevi, seviye: '8' });
      eklenen++;
    }
    bildir(eklenen ? `${eklenen} örnek deneme yüklendi.` : 'Örnek denemeler zaten yüklü.', 'basari');
    ciz();
  }

  // ======================= 1. DENEME YÜKLE =======================
  function yukleEkrani() {
    const sablonSecenek = iceaktar.SABLONLAR.map(s => `<option value="${esc(s.id)}">${esc(s.ad)}</option>`).join('');
    const bos = !veri.denemeler.length;
    ana.innerHTML = `
      <h2>Deneme yükle</h2>
      ${bos ? `
      <div class="kart vurgu">
        <p><strong>Henüz hiç deneme yüklenmedi.</strong> Sistemi denemek için uydurma isimlerle hazırlanmış örnek veriyi yükleyebilirsiniz
        (8-A sınıfı, 10 öğrenci, 3 deneme).</p>
        <button class="dugme" id="ornekYukle">Örnek veriyi yükle</button>
      </div>` : ''}
      <div class="kart">
        <ol class="adimlar">
          <li>
            <label for="dosya">Yayınevinden gelen sonuç dosyasını seçin <span class="soluk">(Excel .xlsx veya CSV)</span></label>
            <input type="file" id="dosya" accept=".xlsx,.xls,.ods,.csv,.txt">
          </li>
          <li>
            <label for="sablon">Yayınevi şablonu</label>
            <select id="sablon">${sablonSecenek}</select>
            <p class="soluk kucuk" id="sablonAciklama"></p>
          </li>
          <li>
            <span class="etiket">Deneme bilgileri</span>
            <div class="satir">
              <label>Deneme adı <input type="text" id="denemeAd" placeholder="Örn. 4. Deneme"></label>
              <label>Tarih <input type="date" id="denemeTarih" value="${bugun()}"></label>
              <label>Sınıf seviyesi
                <select id="denemeSeviye">${[5, 6, 7, 8].map(s => `<option ${s === 8 ? 'selected' : ''}>${s}</option>`).join('')}</select>
              </label>
            </div>
          </li>
        </ol>
        <button class="dugme" id="onizle">Önizle</button>
      </div>
      <div id="onizlemeAlani"></div>
      <h3>Kayıtlı denemeler</h3>
      ${bos ? '<p class="soluk">Kayıtlı deneme yok.</p>' : `
      <table class="tablo">
        <thead><tr><th>Tarih</th><th>Deneme</th><th>Yayınevi</th><th class="sag">Öğrenci</th><th class="sag">Soru</th><th></th></tr></thead>
        <tbody>${veri.denemeler.map(d => `
          <tr><td>${tarihYaz(d.tarih)}</td><td>${esc(d.ad)}</td><td>${esc(d.yayinevi)}</td>
          <td class="sag">${Object.keys(d.cevaplar).length}</td><td class="sag">${d.sorular.length}</td>
          <td class="sag"><button class="dugme kucuk-dugme ikincil" data-sil="${esc(d.id)}">Sil</button></td></tr>`).join('')}
        </tbody>
      </table>`}
    `;

    const sablonSec = document.getElementById('sablon');
    const aciklamaYaz = () => {
      const s = iceaktar.SABLONLAR.find(x => x.id === sablonSec.value);
      document.getElementById('sablonAciklama').textContent = s.aciklama + ' Beklenen sütunlar: ' +
        Object.entries(s.alanlar).filter(([, v]) => v).map(([, v]) => v).join(', ');
    };
    sablonSec.addEventListener('change', aciklamaYaz);
    aciklamaYaz();

    const dosyaGirdi = document.getElementById('dosya');
    dosyaGirdi.addEventListener('change', () => {
      const ad = document.getElementById('denemeAd');
      if (!ad.value && dosyaGirdi.files[0]) ad.value = dosyaGirdi.files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    });

    if (bos) document.getElementById('ornekYukle').addEventListener('click', () => ornekVeriyiYukle().catch(h => bildir(h.message, 'hata')));

    document.getElementById('onizle').addEventListener('click', async () => {
      const dosya = dosyaGirdi.files[0];
      if (!dosya) { bildir('Lütfen önce bir dosya seçin.', 'hata'); return; }
      const ad = document.getElementById('denemeAd').value.trim();
      if (!ad) { bildir('Lütfen deneme adını yazın.', 'hata'); return; }
      const sablon = iceaktar.SABLONLAR.find(x => x.id === sablonSec.value);
      try {
        const okunan = await iceaktar.dosyaOku(dosya);
        const sonuc = iceaktar.donustur(okunan, sablon);
        durum.onizleme = { sonuc, bilgi: { ad, tarih: document.getElementById('denemeTarih').value, yayinevi: sablon.yayinevi, seviye: document.getElementById('denemeSeviye').value } };
        onizlemeCiz();
      } catch (h) {
        bildir('Dosya okunamadı: ' + h.message, 'hata');
      }
    });

    ana.querySelectorAll('[data-sil]').forEach(b => b.addEventListener('click', async () => {
      const d = veri.denemeler.find(x => x.id === b.dataset.sil);
      if (!confirm(`"${d.ad}" denemesi ve tüm sonuçları silinsin mi?`)) return;
      await vt.sil('denemeler', d.id);
      await veriYukle();
      bildir('Deneme silindi.');
      ciz();
    }));
  }

  function onizlemeCiz() {
    const alan = document.getElementById('onizlemeAlani');
    const { sonuc, bilgi } = durum.onizleme;
    const dersler = [...new Set(sonuc.sorular.map(s => s.ders))];
    const soruSay = d => sonuc.sorular.filter(s => s.ders === d).length;
    const ogrenciler = [...sonuc.ogrenciler].sort(adSirala);
    const ornek = { id: 'onizleme', sorular: sonuc.sorular, cevaplar: sonuc.cevaplar };
    alan.innerHTML = `
      <div class="kart">
        <h3>Önizleme: ${esc(bilgi.ad)} <span class="soluk">(${tarihYaz(bilgi.tarih)})</span></h3>
        ${sonuc.hatalar.map(h => `<p class="mesaj hata">✖ ${esc(h)}</p>`).join('')}
        ${sonuc.uyarilar.map(u => `<p class="mesaj uyari">⚠ ${esc(u)}</p>`).join('')}
        ${sonuc.hatalar.length ? '' : `
        <div class="ozet-kutular">
          <div class="ozet"><span class="buyuk">${ogrenciler.length}</span> öğrenci</div>
          <div class="ozet"><span class="buyuk">${sonuc.sorular.length}</span> soru</div>
          <div class="ozet"><span class="buyuk">${sonuc.kazanimlar.length}</span> kazanım</div>
        </div>
        <p>Dersler: ${dersler.map(d => `${esc(d)} (${soruSay(d)} soru)`).join(' · ')}</p>
        <div class="tablo-kap">
        <table class="tablo">
          <thead><tr><th>No</th><th>Ad soyad</th><th>Sınıf</th>${dersler.map(d => `<th class="sag">${esc(d)}<br><span class="soluk kucuk">D / Y / B</span></th>`).join('')}</tr></thead>
          <tbody>${ogrenciler.map(o => {
            const oz = hesap.ogrenciOzeti(ornek, o.no, veri.yanlisKatsayi);
            return `<tr><td>${esc(o.no)}</td><td>${esc(o.ad)}</td><td>${esc(o.sinif)}</td>${dersler.map(d => {
              const x = oz.dersler[d];
              return `<td class="sag">${x.d} / ${x.y} / ${x.b}</td>`;
            }).join('')}</tr>`;
          }).join('')}</tbody>
        </table>
        </div>
        <button class="dugme" id="kaydet">Kaydet</button>
        <button class="dugme ikincil" id="vazgec">Vazgeç</button>`}
      </div>`;
    if (sonuc.hatalar.length) return;
    document.getElementById('kaydet').addEventListener('click', async () => {
      try {
        await denemeKaydet(sonuc, bilgi);
        durum.onizleme = null;
        bildir(`"${bilgi.ad}" kaydedildi.`, 'basari');
        ciz();
      } catch (h) { bildir(h.message, 'hata'); }
    });
    document.getElementById('vazgec').addEventListener('click', () => { durum.onizleme = null; alan.innerHTML = ''; });
  }

  // ======================= 2. ÖĞRENCİ KARNESİ =======================
  function karneEkrani() {
    if (!veri.ogrenciler.length) { bosEkran('Öğrenci karnesi'); return; }
    if (!veri.ogrenciler.some(o => o.no === durum.secilenOgrenci)) durum.secilenOgrenci = veri.ogrenciler[0].no;
    const ogr = veri.ogrenciler.find(o => o.no === durum.secilenOgrenci);
    const k = veri.yanlisKatsayi;
    const sinifArkadaslari = veri.ogrenciler.filter(o => o.sinif === ogr.sinif).map(o => o.no);
    const girdigi = veri.denemeler.filter(d => d.cevaplar[ogr.no]);
    const dersler = [...new Set(girdigi.flatMap(hesap.denemeDersleri))];

    const satirlar = girdigi.map(d => ({
      deneme: d,
      oz: hesap.ogrenciOzeti(d, ogr.no, k),
      ort: hesap.sinifOrtalamasi(d, sinifArkadaslari, k),
    }));

    const tablo = hesap.kazanimTablosu(girdigi, [ogr.no]);
    const kazanimlar = [...tablo.values()].map(s => ({ ...s, yuzde: hesap.yuzde(s.dogru, s.toplam), aciklama: (veri.kazanimlar.get(s.kod) || {}).aciklama || '' }));
    const eksikler = kazanimlar.filter(x => x.yuzde < 50).sort((a, b) => a.yuzde - b.yuzde);
    const gucluler = kazanimlar.filter(x => x.yuzde >= 75).sort((a, b) => b.yuzde - a.yuzde);
    const kazanimListesi = liste => liste.length ? `
      <table class="tablo">
        <thead><tr><th>Ders</th><th>Kazanım</th><th class="sag">Doğru / Soru</th><th class="sag">Başarı</th></tr></thead>
        <tbody>${liste.map(x => `<tr><td>${esc(x.ders)}</td><td><span class="kod">${esc(x.kod)}</span> ${esc(x.aciklama)}</td>
          <td class="sag">${x.dogru} / ${x.toplam}</td><td class="sag"><span class="rozet ${hesap.seviye(x.yuzde).sinif}">%${x.yuzde}</span></td></tr>`).join('')}
        </tbody></table>` : '<p class="soluk">Bu grupta kazanım yok.</p>';

    ana.innerHTML = `
      <div class="ust-cubuk yazdirma">
        <label>Öğrenci
          <select id="ogrSec">${veri.ogrenciler.map(o => `<option value="${esc(o.no)}" ${o.no === ogr.no ? 'selected' : ''}>${esc(o.ad)} (${esc(o.no)} · ${esc(o.sinif)})</option>`).join('')}</select>
        </label>
        <button class="dugme ikincil" id="yazdir">Yazdır</button>
      </div>
      <section class="karne">
        <div class="karne-baslik">
          <div>
            <h2>${esc(ogr.ad)}</h2>
            <p class="soluk">Öğrenci no: ${esc(ogr.no)} · Sınıf: ${esc(ogr.sinif)} · ${girdigi.length} deneme</p>
          </div>
          <div class="ozet"><span class="buyuk">${satirlar.length ? sayi(satirlar[satirlar.length - 1].oz.toplam.net) : '—'}</span> son deneme neti</div>
        </div>

        <h3>Toplam net gelişimi</h3>
        <div class="lejant"><span class="lj ogrenci"></span> ${esc(ogr.ad)} <span class="lj ortalama"></span> ${esc(ogr.sinif)} sınıf ortalaması</div>
        <div class="grafik" id="grafik"></div>

        <h3>Ders ders netler</h3>
        <div class="tablo-kap">
        <table class="tablo">
          <thead><tr><th>Deneme</th>${dersler.map(d => `<th class="sag">${esc(d)}</th>`).join('')}<th class="sag">Toplam net</th><th class="sag">Sınıf ort.</th></tr></thead>
          <tbody>${satirlar.map(({ deneme, oz, ort }) => `
            <tr><td>${esc(deneme.ad)}<br><span class="soluk kucuk">${tarihYaz(deneme.tarih)}</span></td>
            ${dersler.map(d => {
              const x = oz.dersler[d];
              return x ? `<td class="sag"><b>${sayi(x.net)}</b><br><span class="soluk kucuk">${x.d}D ${x.y}Y ${x.b}B</span></td>` : '<td class="sag soluk">—</td>';
            }).join('')}
            <td class="sag"><b>${sayi(oz.toplam.net)}</b><br><span class="soluk kucuk">${oz.toplam.soru} soru</span></td>
            <td class="sag">${sayi(ort.toplam)}</td></tr>`).join('')}
          </tbody>
        </table>
        </div>
        <p class="soluk kucuk">Net = Doğru − Yanlış${k > 0 ? ' ÷ ' + k : ' (yanlışlar düşülmüyor)'}. Sınıf ortalaması ${esc(ogr.sinif)} şubesindeki öğrencilerden hesaplanır.</p>

        <h3>Çalışması gereken kazanımlar <span class="soluk kucuk">(başarı %50'nin altında)</span></h3>
        ${kazanimListesi(eksikler)}
        <h3>Güçlü olduğu kazanımlar <span class="soluk kucuk">(başarı %75 ve üzeri)</span></h3>
        ${kazanimListesi(gucluler)}
      </section>`;

    grafik.netGelisimi(document.getElementById('grafik'), satirlar.map(({ deneme, oz, ort }) => ({
      etiket: deneme.ad, alt: tarihYaz(deneme.tarih), ogrenci: oz.toplam.net, ortalama: ort ? ort.toplam : null,
    })), Math.max(...satirlar.map(s => s.oz.toplam.soru)) * 0.5);

    document.getElementById('ogrSec').addEventListener('change', e => { durum.secilenOgrenci = e.target.value; ciz(); });
    document.getElementById('yazdir').addEventListener('click', () => window.print());
  }

  // ======================= 3. KAZANIM ANALİZİ =======================
  function kazanimEkrani() {
    if (!veri.denemeler.length) { bosEkran('Kazanım analizi'); return; }
    const dersler = [...new Set(veri.denemeler.flatMap(hesap.denemeDersleri))];
    const siniflar = [...new Set(veri.ogrenciler.map(o => o.sinif))].sort((a, b) => a.localeCompare(b, 'tr'));
    if (!durum.kazanimKapsam) durum.kazanimKapsam = 'sinif:' + (siniflar[0] || '');
    const [tur, deger] = durum.kazanimKapsam.split(/:(.*)/s);
    const nolar = tur === 'ogr' ? [deger] : veri.ogrenciler.filter(o => o.sinif === deger).map(o => o.no);
    const tablo = hesap.kazanimTablosu(veri.denemeler, nolar, durum.kazanimDers || null);
    const dersSira = d => dersler.indexOf(d);
    const satirlar = [...tablo.values()].sort((a, b) => dersSira(a.ders) - dersSira(b.ders) || a.kod.localeCompare(b.kod, 'tr', { numeric: true }));
    const hucre = h => {
      if (!h || !h.toplam) return '<td class="hucre yok">—</td>';
      const y = hesap.yuzde(h.dogru, h.toplam);
      const s = hesap.seviye(y);
      return `<td class="hucre ${s.sinif}" title="${h.dogru} doğru / ${h.toplam} cevap · ${s.etiket}">%${y}</td>`;
    };

    ana.innerHTML = `
      <h2>Kazanım analizi</h2>
      <div class="ust-cubuk yazdirma">
        <label>Kimin için
          <select id="kapsam">
            <optgroup label="Sınıf">${siniflar.map(s => `<option value="sinif:${esc(s)}" ${durum.kazanimKapsam === 'sinif:' + s ? 'selected' : ''}>${esc(s)} – tüm sınıf</option>`).join('')}</optgroup>
            <optgroup label="Öğrenci">${veri.ogrenciler.map(o => `<option value="ogr:${esc(o.no)}" ${durum.kazanimKapsam === 'ogr:' + o.no ? 'selected' : ''}>${esc(o.ad)} (${esc(o.no)})</option>`).join('')}</optgroup>
          </select>
        </label>
        <label>Ders
          <select id="ders"><option value="">Tüm dersler</option>${dersler.map(d => `<option ${d === durum.kazanimDers ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        </label>
        <button class="dugme ikincil" id="yazdir">Yazdır</button>
      </div>
      <div class="lejant">
        <span class="rozet dusuk">%0–49 Eksik</span> <span class="rozet orta">%50–74 Gelişmeli</span> <span class="rozet iyi">%75–100 İyi</span>
        <span class="soluk kucuk">Hücre: o kazanımdaki soruların yüzde kaçı doğru cevaplanmış. Üzerine gelince ayrıntı görünür.</span>
      </div>
      <div class="tablo-kap">
      <table class="tablo kazanim-tablo">
        <thead><tr><th>Ders</th><th>Kazanım</th>${veri.denemeler.map(d => `<th class="ortala">${esc(d.ad)}<br><span class="soluk kucuk">${tarihYaz(d.tarih)}</span></th>`).join('')}<th class="ortala">Genel</th></tr></thead>
        <tbody>${satirlar.map(s => `<tr><td>${esc(s.ders)}</td><td><span class="kod">${esc(s.kod)}</span> ${esc((veri.kazanimlar.get(s.kod) || {}).aciklama || '')}</td>
          ${veri.denemeler.map(d => hucre(s.denemeler[d.id])).join('')}${hucre(s)}</tr>`).join('') ||
          `<tr><td colspan="${veri.denemeler.length + 3}" class="soluk">Bu seçim için kazanım verisi yok.</td></tr>`}
        </tbody>
      </table>
      </div>`;
    document.getElementById('kapsam').addEventListener('change', e => { durum.kazanimKapsam = e.target.value; ciz(); });
    document.getElementById('ders').addEventListener('change', e => { durum.kazanimDers = e.target.value; ciz(); });
    document.getElementById('yazdir').addEventListener('click', () => window.print());
  }

  // ======================= 4. AYARLAR =======================
  function ayarlarEkrani() {
    ana.innerHTML = `
      <h2>Ayarlar</h2>
      <div class="kart">
        <h3>Net hesabı</h3>
        <label>Kaç yanlış bir doğruyu götürsün?
          <select id="katsayi">
            ${[[3, '3 yanlış 1 doğruyu götürür'], [4, '4 yanlış 1 doğruyu götürür'], [0, 'Yanlışlar düşülmesin']].map(([v, t]) =>
              `<option value="${v}" ${veri.yanlisKatsayi === v ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="kart">
        <h3>Yedek</h3>
        <p>Veriler yalnızca bu bilgisayardaki tarayıcıda saklanır. Başka bilgisayara taşımak ya da yıl sonu arşivi için yedek alın.
        Yedek dosyası öğrenci bilgisi içerir; güvenli bir yerde saklayın ve internete yüklemeyin.</p>
        <button class="dugme" id="yedekAl">Yedek al (indir)</button>
        <label class="dugme ikincil dosya-dugme">Yedekten geri yükle<input type="file" id="yedekYukle" accept=".json" hidden></label>
      </div>
      <div class="kart tehlike">
        <h3>Tüm verileri sil</h3>
        <p>Bu bilgisayardaki tüm denemeler, öğrenciler ve ayarlar silinir. Geri alınamaz; önce yedek almanız önerilir.</p>
        <button class="dugme tehlike-dugme" id="hepsiniSil">Tüm verileri sil</button>
      </div>`;

    document.getElementById('katsayi').addEventListener('change', async e => {
      await vt.ayarKoy('yanlisKatsayi', Number(e.target.value));
      await veriYukle();
      bildir('Net hesabı güncellendi.', 'basari');
    });
    document.getElementById('yedekAl').addEventListener('click', async () => {
      const yedek = await vt.yedekAl();
      const blob = new Blob([JSON.stringify(yedek)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kocatepe-deneme-yedek-${bugun()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    document.getElementById('yedekYukle').addEventListener('change', async e => {
      const dosya = e.target.files[0];
      if (!dosya) return;
      if (!confirm('Yedek yüklenirse bu bilgisayardaki mevcut verilerin tamamı yedektekilerle değiştirilir. Devam edilsin mi?')) return;
      try {
        await vt.yedekYukle(JSON.parse(await dosya.text()));
        await veriYukle();
        bildir('Yedek yüklendi.', 'basari');
        ciz();
      } catch (h) { bildir('Yedek yüklenemedi: ' + h.message, 'hata'); }
    });
    document.getElementById('hepsiniSil').addEventListener('click', async () => {
      if (!confirm('Tüm veriler kalıcı olarak silinsin mi?')) return;
      await vt.hepsiniSil();
      await veriYukle();
      bildir('Tüm veriler silindi.');
      ciz();
    });
  }

  function bosEkran(baslik) {
    ana.innerHTML = `<h2>${baslik}</h2>
      <div class="kart vurgu"><p>Henüz deneme yüklenmedi. Önce <a href="#yukle">Deneme yükle</a> ekranından bir deneme ya da örnek veri yükleyin.</p></div>`;
  }

  // ======================= Gezinme =======================
  const EKRANLAR = { yukle: yukleEkrani, karne: karneEkrani, kazanim: kazanimEkrani, ayarlar: ayarlarEkrani };

  function ciz() {
    const ad = location.hash.replace('#', '') || 'yukle';
    const ekran = EKRANLAR[ad] || yukleEkrani;
    document.querySelectorAll('nav a').forEach(a => a.classList.toggle('secili', a.getAttribute('href') === '#' + ad));
    ekran();
  }

  window.addEventListener('hashchange', ciz);
  veriYukle().then(ciz).catch(h => {
    ana.innerHTML = `<div class="kart tehlike"><p>Tarayıcı veritabanı açılamadı: ${esc(h.message)}.
      Gizli/özel pencerede açtıysanız normal pencerede deneyin.</p></div>`;
  });
})();
