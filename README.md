# Bereket Çiftliği

Türkçe arayüzlü, tarayıcıda çalışan küçük bir 3D çiftlik oyunu.

## Çalıştırma

Node.js 20.19+ veya 22.12+ kullanın.

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`

Üretim çıktısı `dist/` klasörüdür. Vite `base: './'` kullanır; çıktı GitHub Pages altında bir alt klasörde sunulabilir.

Bağımlılık sürümleri package.json içinde sabittir. Bu teslimatta komut çalıştırılmadığı için npm çözümlemesiyle üretilmiş bir package-lock.json yoktur. İlk kurulumdan sonra oluşan kilit dosyasını depoya ekleyin.

## Oynanış

Yeni çiftlik 6 × 6 hücre, 50 altın ve 5 buğday tohumu içerir.

| Ekin | Tohum | Büyüme | Satış |
| --- | ---: | ---: | ---: |
| Buğday | 5 altın | 30 saniye | 8 altın |
| Havuç | 10 altın | 60 saniye | 18 altın |
| Domates | 20 altın | 120 saniye | 40 altın |

- `1`, `2`, `3`: sürme, ekme ve hasat aracını seçer.
- Etkin araca yeniden basmak veya `Esc`: aracı bırakır.
- Araç seçiliyken bir hücreye dokunmak işlemi uygular.
- Araç seçilmeden hücre seçmek bağlamsal işlem kartını açar.
- Sürüklemek kamerayı kaydırır; tekerlek veya iki parmak yakınlaştırır.
- Pazar, ürünleri tek tek veya topluca satar; bir veya beş tohum alır.
- 500 altın karşılığında tarla 8 × 8 olur.
- Görevler yalnızca gerçekleşen hasat ve satış olaylarıyla ilerler.
- Mola görselleri durdurur; ekinler gerçek zamanda büyümeye devam eder.
- Hücre listesi, sahnenin klavye ve ekran okuyucuyla kullanılabilen karşılığıdır.

Bütün modeller prosedüreldir. Harici görsel, font, ses dosyası veya CDN kullanılmaz.

## Yapı

- `src/sim`: DOM, React ve Three.js içermeyen saf oyun kuralları.
- `src/store`: tek zustand deposu; oyun ve arayüz dilimleri.
- `src/save`: v1 şema doğrulaması, serileştirme, depolama ve sekme sahipliği.
- `src/scene`: instanced tarla ve ekinler, özel izometrik kamera, ışık ve dekor.
- `src/input`: 8 piksel dokunma eşiği, sürükleme, pinch ve klavye.
- `src/ui`: DOM arayüzü, odak tuzaklı diyaloglar ve bildirimler.
- `src/audio`: ilk kullanıcı hareketinden sonra açılan WebAudio efektleri.

Oyun saati requestAnimationFrame sürücüsüyle saniyede bir güncellenir. Oyun zamanlayıcıları için setTimeout veya setInterval kullanılmaz. Ekin aşamaları plantedAt üzerinden hesaplanır; kayıtta ayrı bir büyüme aşaması bulunmaz.

## Kayıt davranışı

Anahtar: `bereket-ciftligi:save:v1`.

Önce localStorage okunur. Yalnızca bu erişim hata verirse idb-keyval denenir; o da kullanılamazsa bellek kullanılır. Başarılı bir boş okuma başka bir depodan eski kayıt getirmez.

Kayıtlar eylemlerden 500 ms sonra, her 10 saniyede, görünürlük gizlendiğinde ve pagehide olayında yazılır. localStorage yazımı senkrondur. IndexedDB ve bellek geri dönüşleri kapanışta aynı dayanıklılık garantisini vermez; arayüz depolama modunu bildirir.

Bozuk kayıt `:corrupt:<timestamp>` anahtarına kopyalanır. Daha yeni sürümlerin kayıtları yüklenmez veya üzerine yazılmaz. V1 ilk yayımlanan şemadır; hayali eski sürüm geçişleri yoktur.

Çevrimdışı büyüme 7 günle sınırlanır. Aşan süre plantedAt zamanlarına eklenir. Saat geri alınırsa ekim zamanları yeniden bazlanır; ilerleme korunur ve dönüş özeti gösterilmez.

En son sekme BroadcastChannel ve storage olaylarıyla kayıt sahipliğini alır. Her değişiklik ve kayıt öncesinde sahiplik yeniden denetlenir. Eski sekme değişiklik yapamaz.

## Doğrulama durumu

Bu teslimatta yürütme sınırı gereği paket kurulumu, TypeScript derlemesi, Vitest ve tarayıcı testi çalıştırılmadı. Geçtikleri iddia edilmez. Proje TypeScript olduğundan Dart analiz ve biçimlendirme araçları uygulanmaz.

Testler oyun eylemlerini, büyüme sınırlarını, ekonomiyi, görevleri, çevrimdışı zamanı, kurtarma hediyesini, kayıt doğrulamasını, depolama geri dönüşlerini, sekme sahipliğini, mağaza bağlantılarını ve hareket ayrımını kapsar.

## Manuel kontrol akışları

- **F1 — İlk hasat:** yeni oyun aç; 50 altın ve 5 tohum gör; toprağı sür, buğday ek, 30 saniye bekle, hasat et; hücre sürülmüş kalmalı.
- **F2 — Ekonomi:** pazarda bir ve beş tohum al; ürünlerden birini ve tümünü sat; yetersiz altın metnini kontrol et; genişlet; eski hücreler yerinde kalmalı.
- **F3 — Görev ve kayıt:** 10 buğday hasat et; tamamlanmış görevi ödül almadan yeniden yükle; ödülü bir kez al; üç görevden sonra tamamlanma mesajını gör.
- **F4 — Dönüş ve kurtarma:** ekin ekip sayfayı kapat; sonra yeniden aç; dönüş özetini ve olgunlaşan sayısını kontrol et. Bozuk kayıt, gelecekteki sürüm ve ikinci sekme senaryolarını dene.
- **F5 — Erişilebilirlik ve hareket:** klavye araçları, Esc, hücre listesi ve diyalog odak tuzağını dene; sesi kapat; hareketi azalt; pinch ve pan sırasında araç uygulanmadığını kontrol et.

Ayrıca 360 px portre görünümünde iOS Safari güvenli alanlarını, 44 px dokunma hedeflerini ve konsol hatalarını denetleyin.

## Çizim bütçesi

Çim, sürülmüş toprak, oluklar ve her ekin/aşama grubu ayrı InstancedMesh kullanır. Olgunluk işaretleri hücre başına tek düşük poligonlu mesh'tir.

Tarayıcı konsolundaki `window.__bereketRenderer` son kare ve oturumdaki en yüksek çizim çağrısı sayısını verir. Kontrolü 8 × 8 tarlanın tümü ekili ve olgunken yapın; son kare çağrıları 150 veya altında olmalıdır. Sayaç gerçek renderer.info değerini raporlar; bu teslimatta ölçüm yapılmadı.

Sıfırlama sahne dünyasını yeniden kurar. Paylaşılan prosedürel geometri ve malzemeler açıkça dispose edilir; diğer sahne kaynakları R3F tarafından unmount sırasında serbest bırakılır.
