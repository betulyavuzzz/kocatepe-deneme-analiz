# Kocatepe Deneme Analiz

Kocatepe Ortaokulu için deneme sınavı analiz sistemi. Yayınevlerinden gelen sonuç dosyalarını içeri alır,
öğrenci karnesi ve kazanım tablosu üretir. Kurulum gerektirmez; tarayıcıda açılır.

**Veriler yalnızca kullanılan bilgisayarın tarayıcısında (IndexedDB) saklanır, hiçbir sunucuya gönderilmez.**
Gerçek öğrenci verisi bu depoya asla eklenmez (bkz. `.gitignore`).

## İlk sürümde neler var

- **Deneme yükle:** Excel (.xlsx) veya CSV dosyası seç → yayınevi şablonu seç → önizle → kaydet.
  Şimdilik tek şablon var: *Örnek Yayınları (soru bazlı liste)*.
- **Öğrenci karnesi:** net gelişim grafiği (sınıf ortalamasıyla), ders ders net tablosu,
  çalışması gereken ve güçlü olduğu kazanımlar. Yazdırılabilir.
- **Kazanım analizi:** kazanım × deneme başarı tablosu; tüm sınıf ya da tek öğrenci için, ders filtresiyle.
  %0–49 Eksik (kırmızı), %50–74 Gelişmeli (sarı), %75–100 İyi (yeşil).
- **Ayarlar:** net hesabı (3 yanlış / 4 yanlış / düşülmesin), yedek al / yedekten yükle, tüm verileri sil.
- **Örnek veri:** uydurma isimlerle 8-A sınıfı, 10 öğrenci, 3 deneme. “Deneme yükle” ekranındaki
  *Örnek veriyi yükle* düğmesiyle tek tıkla yüklenir. Aynı veriler `ornek-veri/` klasöründe CSV olarak da var;
  yükleme ekranını denemek için bunları kullanabilirsiniz.

## Örnek Yayınları dosya biçimi

Her satır bir öğrencinin bir sorusudur. Ayırıcı `;`, `,` ya da sekme olabilir:

```
OgrenciNo;AdSoyad;Sinif;Ders;SoruNo;KazanimKodu;KazanimAciklama;DogruCevap;OgrenciCevabi
101;Ada Yıldız;8-A;Türkçe;1;T.8.1;Sözcükte ve söz öbeklerinde anlam;A;A
```

Öğrenci cevabı boşsa soru “boş” sayılır.

## Klasörler

| Klasör | İçerik |
|---|---|
| `index.html` | Uygulama sayfası |
| `js/` | Uygulama kodu (`vt.js` veritabanı, `iceaktar.js` dosya okuma/şablon, `hesap.js` net ve kazanım hesapları, `grafik.js`, `app.js` ekranlar) |
| `css/stil.css` | Görünüm ve yazdırma ayarları |
| `vendor/` | Excel okuyucu (SheetJS, Apache 2.0) – çevrimdışı çalışsın diye depoda |
| `ornek-veri/`, `js/ornek-veri.js` | Uydurma örnek veri (`node araclar/ornek-veri-uret.js` ile yeniden üretilir) |

## Sonraki adımlar

Sınıf görünümü, A4 geri bildirim sayfası ve toplu PDF, arayüzden yayınevi şablonu tanımlama,
öğretim yılı / şube yönetimi, kazanım listesi düzenleme.
