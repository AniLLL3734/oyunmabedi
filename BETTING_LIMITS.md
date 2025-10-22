# Bahis Limitleri

Bu belge, oyunlarda uygulanan bahis limitlerini açıklamaktadır.

## Uygulanan Limitler

### Galaktik Ganimet (Slot Machine)
- **Minimum Bahis:** 5 puan
- **Maksimum Bahis:** 500 puan

### Şans Zarı (Advanced Dice)
- **Minimum Bahis:** 10 puan
- **Maksimum Bahis:** 1000 puan

## Özellikler

1. **Anlık Kontrol:** Bahis miktarları her oyun sırasında kontrol edilir.
2. **Kullanıcı Bildirimi:** Kullanıcılar minimum ve maksimum bahis limitlerini oyun ekranında görebilirler.
3. **Limit Aşımı:** Kullanıcılar limitleri aşmaya çalıştıklarında işlem yapılmaz ve bilgilendirilirler.

## Teknik Detaylar

Limitler istemci tarafında (client-side) uygulanmıştır:
- Minimum ve maksimum değerler input alanlarında belirtilmiştir
- Oyun başlatılmadan önce değerler kontrol edilir
- Kullanıcı dostu hata mesajları gösterilir

## Neden Bu Limitler Uygulandı?

1. **Oyun Dengesi:** Aşırı yüksek veya düşük bahisler oyun dengesini bozabiliyordu.
2. **Adil Oyun Ortamı:** Tüm kullanıcılar için daha adil bir oyun ortamı sağlar.
3. **Sorumluluk:** Kullanıcıların kontrolsüz bahis yapmasını engeller.