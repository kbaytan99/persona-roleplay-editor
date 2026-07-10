# Sahne Olusturucu

Text based roleplay sahnelerini tek canvas uzerinde duzenleyip tek PNG olarak disari aktaran client-side web uygulamasi.

Canli web adresi: https://kbaytan99.github.io/SS-EDITOR/

## Calistirma

```powershell
node server.js
```

Sonra `http://127.0.0.1:8765/` adresini ac. Uygulama web uzerinden client-side calisir; kayitlar kullanicinin kendi tarayici profilinde `localStorage` ve `IndexedDB` icinde tutulur.

## Kullanim

- `Resim ekle` ile bir veya daha fazla gorsel sec.
- Panodaki gorseli `Ctrl+V` ile yapistirarak da sahne ekleyebilirsin.
- `Bos sahne` ile sadece yazi/katman icin bos canvas olusturabilirsin.
- `RSE indir` ile sahne projesini `.rse` dosyasi olarak disari aktarabilirsin.
- `RSE yukle` ile daha once kaydedilen `.rse` dosyasini geri yukleyebilirsin.
- `.rse` dosyasi canvas ayarlarini, katmanlari, gomulu gorselleri, yazi kutularini, filtreleri, gecisleri ve secim bilgisini saklar.
- Gorseller tek canvas uzerinde katman olarak calisir; katman sirasi, pozisyonu ve gecis efektleri korunur.
- Her sahneye birden fazla yazi kutusu ekleyebilirsin.
- Yazi kutularini gorsel uzerinde surukleyerek konumlandirabilir, sag alt koseden genisligini ayarlayabilirsin.
- Her yazi kutusunun font boyutu ve arka plan/efekt stili ayri ayarlanabilir.
- Sahne gorselinin boyutunu, genisligini, yuksekligini ve X/Y konumunu katman kontrollerinden ayarlayabilirsin.
- `Tek PNG indir` dugmesi tum sahneleri tek resim olarak indirir.

## Notlar

- `*` ile baslayan emote satirlari mor RP rengiyle, normal chat satirlari beyaz gosterilir.
- `** Isim Soyisim durum` bicimi sahne yazisinda `* durum (( Isim Soyisim ))` formatina uyarlanir.
- `(( ... ))` OOC satirlari sahne yazisinda gosterilmez.
