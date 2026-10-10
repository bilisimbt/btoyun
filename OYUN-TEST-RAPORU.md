# Oyun testleri ve iyileştirmeler — 8–9 Ekim 2026

## Düzeltilen sorunlar

- Klavye ile ekrandaki düğme aynı anda kullanıldığında, birini bırakmak diğerini artık erken bırakmıyor.
- Tuş bırakılırken odak başka düğmeye geçse de kontrol takılı kalmıyor. Oyun dışındaki düğmelerdeki ok tuşları oyunu yönetmiyor.
- Dört klasik aksiyon oyununda fizik sabit zaman adımlarıyla ilerliyor; 15, 30, 60 ve 144 FPS senaryolarında aynı süre ve mesafe elde edildi.
- Meteor Kırıcı'da top, vuruştan sonra bloktan ayrılıyor. Tek temas artık dayanıklı bloğa iki vuruş sayılmıyor.
- Blok Ustası tahtasındaki 64 düğme her hamlede yeniden oluşturulmuyor. Klavye odağı yerleştirilen hücrede kalıyor.
- Puan ve can göstergeleri yalnızca değer değiştiğinde güncelleniyor. Aynı değerlerle yapılan 100 güncellemede önceden 300 ekran yazımı varken artık 0 yazım var.
- Klasik oyunların sabit arka planı önbelleğe alındı. Kapanan oyunların ekran öğeleri ve kontrolleri temizleniyor.
- Üç gelişmiş oyunun aynı değerlerle gelen gösterge güncellemeleri de atlanıyor.

## Tamamlanan kontroller

| Alan | Sonuç |
| --- | --- |
| Kontrol, çarpışma, odak, hız ve kaynak temizliği | 10 senaryo geçti |
| Robo Koşu, Neon Ralli, Zıplayan Küre, Meteor Kırıcı | Her oyun 3 farklı rastgele başlangıçta hedefe ulaştı; 12 oynanış senaryosu geçti |
| Blok Ustası | 80 geçerli hamle; 35 temizlenen çizgi; aynı anda satır ve sütun temizliği; bir oyun içinde tek rozet ödülü doğrulandı |
| Denge Sürüşü | 12 parkur; boşta denge, fren / geri, 30–60–144 FPS, hareketli platform, yeniden başlatma ve duraklatma geçti |
| Neon Tünel | 12 bölüm × 3 zorluk; iki açıklık sınırı; görsel ile çarpışma konumunun uyumu; duraklatma; sonsuz modda 50 kapı geçti |
| Ekranlar | 8 oyun × 3 ekran boyutu = 24 kontrol geçti: 390×844, 844×390, 1360×900 |
| Ekran kontrolleri | Dokunma ve dokunmayı iptal etme, duraklatma / devam, pencere / geniş görünüm, kapanış kontrol edildi; desteklenen masaüstü tam ekran açılıp kapandı |
| Tarayıcı hataları | Çalıştırılan senaryolarda JavaScript çalışma hatası görülmedi |

Testler yerel Microsoft Edge tarayıcısında otomatik oynanış ve kontrollü durum senaryolarıyla yapıldı. Telefon görünümleri tarayıcıda benzetildi; fiziksel telefonlarla veya bütün tarayıcılarla test yapılmadı. Bu rapor, öğretim etkinliklerinin tamamı için kapsamlı bir içerik değerlendirmesi değildir. Penaltı Arenası ekran ve kontrol denetimlerine dahil edildi; yeni şut çeşitlerinin tüm olasılıkları bu çalışmanın kapsamı değildir.
