# Klan Sistemi Geliştirme Planı

## Genel Bakış
Klan sistemi, kullanıcıların gruplar halinde bir araya gelmesini, rekabet etmesini ve sosyal etkileşimde bulunmasını sağlayacak. Sistem, Firebase veritabanını kullanarak uygulanacak.

## Özellikler (1-8)
1. Klan oluşturma (isim, amblem, açıklama)
2. Klan üyeliği (davet veya başvuru)
3. Klan rolleri (lider, yardımcı, üye)
4. Klan profili ve istatistikleri
5. Klan içi sohbet (özel, modereli)
6. Klan lider tablosu (toplam skor)
7. Klan başarıları ve rozetler
8. Klan mağazası (özel eşyalar)

## Adımlar

### 1. Veritabanı Yapısı
- [ ] `clans` koleksiyonu oluştur (isim, açıklama, amblem, lider, üyeler, oluşturulma tarihi)
- [ ] Kullanıcı profillerine `clanId`, `clanRole` alanları ekle
- [ ] Klan sohbeti için `clan_chats` koleksiyonu

### 2. Temel Klan Yönetimi
- [ ] Klan oluşturma sayfası (`CreateClanPage.tsx`)
- [ ] Klan listesi sayfası (`ClanListPage.tsx`)
- [ ] Klan profili sayfası (`ClanPage.tsx`)
- [ ] Klan üyeliği yönetimi (katılma, ayrılma, davet)

### 3. Klan Rolleri ve İzinler
- [ ] Lider, yardımcı, üye rolleri
- [ ] Rol bazlı izinler (üyeleri yönetme, ayarları değiştirme)

### 4. Klan Sohbeti
- [ ] Klan içi özel sohbet sayfası
- [ ] Moderasyon entegrasyonu (mevcut sistemi kullan)

### 5. Klan Lider Tablosu
- [ ] Leaderboard sayfasını güncelle (klan skorları)
- [ ] Klan bazlı sıralama

### 6. Klan Başarıları
- [ ] Klan başarıları sistemi (mevcut achievement sistemine benzer)
- [ ] Rozetler ve ödüller

### 7. Klan Mağazası
- [ ] Shop sayfasını güncelle (klan eşyaları)
- [ ] Özel avatar çerçeveleri, rozetler vb.

### 8. Test ve Entegrasyon
- [ ] Tüm özelliklerin test edilmesi
- [ ] UI/UX tutarlılığı
- [ ] Moderasyon ve güvenlik kontrolleri

## Teknik Detaylar
- Firebase Firestore kullanılacak
- Mevcut AuthContext ve userProfile yapısı kullanılacak
- Moderasyon için mevcut advancedModeration sistemi entegre edilecek
- UI için mevcut Tailwind CSS ve Lucide ikonları kullanılacak

## Öncelik Sırası
1. Veritabanı yapısı ve temel yönetim
2. Klan sohbeti
3. Lider tablosu ve başarılar
4. Mağaza entegrasyonu
