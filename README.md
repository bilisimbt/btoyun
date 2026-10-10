# BToyun

Bilişim dersi için eğitsel etkinlikler ve tarayıcı oyunları. Bu paket, 9 Ekim 2026 tarihinde hazırlanan; ödül rozetleri, kutlama efektleri ve geniş / tam ekran oyun görünümünü içeren sürümdür.

## GitHub'a yükleme ve yayınlama

1. ZIP paketini bilgisayarında aç.
2. GitHub'da `btoyun` adında, **Public** bir depo oluştur. Ücretsiz hesabın varsa bu yol GitHub Pages için uygundur.
3. Paketin **içindeki dosya ve klasörleri** deponun köküne yükle. `index.html` doğrudan kökte olmalı; bütün paketi ek bir klasörün altında bırakma. ZIP dosyasının kendisini yüklemek siteyi yayınlamaz.
4. `assets` klasörünü bütün alt klasörleriyle yükle. `.github/workflows/pages.yml` dosyasını da dahil et. Bazı dosya seçiciler noktayla başlayan klasörleri gizleyebilir.
5. Depoda **Settings → Pages → Build and deployment → Source → GitHub Actions** seç.
6. **Actions** bölümünde “BToyun'u GitHub Pages'te yayınla” akışını aç. İlk yükleme Pages'i etkinleştirmeden yapıldıysa **Run workflow** ile `main` dalında çalıştır.
7. Yayın tamamlanınca adresi **Settings → Pages** ekranında görebilirsin. Normal bir proje deposunda adres `https://KULLANICI_ADIN.github.io/btoyun/` şeklindedir.

`.github` klasörünü dosya yükleme ekranına ekleyemezsen **Add file → Create new file** ile `.github/workflows/pages.yml` yolunda yeni dosya oluştur ve paketteki aynı dosyanın içeriğini yapıştır.

Akış `main` dalındaki yeni yüklemelerde otomatik çalışır. Başka bir varsayılan dal kullanırsan `.github/workflows/pages.yml` içindeki `branches: [main]` satırını o dalın adına göre değiştir.

Kurulum, GitHub'ın [resmî Pages yönergesi](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) ile uyumludur.

### Daha basit yayınlama seçeneği

Otomatik akışı kullanmadan da yayınlayabilirsin: **Settings → Pages → Source → Deploy from a branch**, ardından `main` ve **/(root)** seç. Bu yöntemde `index.html`, `assets/` ve `.nojekyll` yeterlidir. Aynı anda tek yayınlama yöntemini seç.

## Bilgisayarda açma

Oyunların bir bölümü JavaScript modülleri kullanır. `index.html` dosyasını çift tıklayarak açmak yerine yerel bir web sunucusu kullan.

**Node.js 20 veya üzeri** varsa paket klasöründe:

```sh
npm start
```

Ardından `http://127.0.0.1:8080/` adresini aç. `npm install` gerekmez; yerel sunucunun ek bağımlılığı yoktur. Sunucuyu kapatmak için **Ctrl+C** kullan.

Python 3 kuruluysa alternatif olarak:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

## Paketin yapısı

```text
index.html                  Ana sayfa
assets/                     Etkinlikler, oyunlar, stiller ve görseller
  play/vendor/              Phaser ve Three.js; lisanslarıyla birlikte
.github/workflows/pages.yml GitHub Pages otomatik yayınlama
.nojekyll                   Statik dosya yayını
package.json                İsteğe bağlı yerel sunucu komutu
tools/serve.mjs              Yerel sunucu
THIRD_PARTY_NOTICES.md       Oyun kütüphaneleri hakkında bilgi
PAKET-BILGISI.json           Kaynak sürümü ve dosya özeti
```

Siteyi yayınlamak için derleme veya sunucu tarafı uygulama gerekmez. Bütün oyun dosyaları, görseller ve oyun kütüphaneleri pakette bulunur. Bağlantılar depo alt yoluyla çalışabilecek şekilde göreli olarak korunmuştur.

## Oyun iyileştirmeleri ve testler

Kontrol sahipliği, düşük FPS fiziği, Meteor Kırıcı çarpışmaları, Blok Ustası klavye odağı ve ekran güncellemeleri iyileştirildi. Kontrollerin kapsamı ve sonuçları [OYUN-TEST-RAPORU.md](OYUN-TEST-RAPORU.md) dosyasında yer alır.

## İçerik ve oyunlar

- 5–8. sınıflara yönelik mevcut ders etkinlikleri ve algoritma oyunları.
- Penaltı Arenası: plase, sert şut, aşırtma ve falso seçenekleri.
- Denge Sürüşü ve Neon Tünel: bölümler ve oyun ayarları.
- Robo Koşu, Neon Ralli, Blok Ustası, Zıplayan Küre ve Meteor Kırıcı.
- 15 rozet, başarı kutlamaları, geniş görünüm ve tarayıcının desteklediği tam ekran.
- Müzik kullanılmaz; yalnızca kısa oyun sesleri vardır.

## Kayıtlar

Rozetler, rekorlar, ilerleme ve ayarlar ziyaretçinin tarayıcısındaki `localStorage` alanında tutulur. GitHub Pages merkezi öğrenci hesabı veya sonuç veritabanı sunmaz. Mevcut ChatGPT Site adresindeki tarayıcı kayıtları farklı alan adına otomatik taşınmaz; yeni adreste ayrı kayıtlar oluşur. Tarayıcı verileri temizlenirse yerel kayıtlar da silinir.

Öğretmen alanında eklenen kişisel etkinlikler de tarayıcıya bağlıdır. Mevcut dışa / içe aktarma seçeneklerini kullanarak bunları taşıyabilirsin. Bu ZIP paketi uygulama dosyalarını içerir; ziyaretçilerin tarayıcı verilerini içermez.

## Düzenleme

Ana sayfa `index.html`, eğitim içerikleri `assets/*.js`, üç gelişmiş oyun ise `assets/play/` içindedir. Görselleri değiştirdiğinde aynı dosya adını koruyabilir veya ilgili referansı güncelleyebilirsin. Değişen dosyanın `?v=` sürüm numarasını artırmak, ziyaretçinin eski dosyayı önbellekten kullanmasını engellemeye yardımcı olur.

Üçüncü taraf kütüphanelerinin lisans metinleri `assets/play/vendor/` içinde korunmuştur. Projenin özgün dosyalarına bu paketle ayrıca bir açık kaynak lisansı atanmaz.
