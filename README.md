# Roll SS Editor

Text based roleplay sunuculari icin siyah arka planli roll SS hazirlayici.

## Calistirma

```powershell
node server.js
```

Sonra `http://127.0.0.1:8765/` adresini ac. Uygulama web uzerinden client-side calisir; kayitlar kullanicinin kendi tarayici profilinde `localStorage` ve `IndexedDB` icinde tutulur.

## Kullanim

- Gercek chatlogdan gelen `* Isim Soyisim aksiyon` satiri `/me` gibi aynen korunur.
- Gercek chatlogdan gelen `* durum (( Isim Soyisim ))` satiri `/do` gibi algilanir.
- Elle hizli yazmak icin `** Isim Soyisim durum` girersen `/do` bicimine cevrilir: `* durum (( Isim Soyisim ))`.
- Basinda `*` olmayan satir normal chat olarak kalir.
- `Isim Soyisim: metin` ve `* Isim Soyisim: metin` bicimleri de desteklenir.
- `(( ... ))` OOC satirlari onizlemede gosterilmez.
- `[CH: ...]` turuncu, `[S: ...]` sari; `[?]`, `[Isyeri]`, `[Ev]`, `[Arac]` ve benzeri sistem satirlari yesil gosterilir.
- `ADM:` ile baslayan admin/ceza satirlari kirmizi gosterilir.
- `(Helpdesk)[Talep #...]` ile baslayan helpdesk satirlari kirmizi gosterilir.
- `Arindir` dugmesi OOC ve sistem satirlarini siler, sadece normal konusma ile me/do satirlarini birakir.
- Arindir ayrica `** ... - ID:`, `** ... fisildadi/fisildadin`, `* +`, `* pm`, `* ooc`, `LS LOTTO:`, `Catedral:` ve kapi/isyeri sistem aksiyonlarini temizler.
- `Aksiyon: ... (/doing)` satirlari da arindirmada temizlenir.
- Tekrarlayan `* Telefonu calmaktadir/titremektedir. (( Kisi ))` satirlari arindirmada kisi ve bildirim turu basina bir kez birakilir.
- Arac kilidi, kontak/motor, emniyet kemeri ve canta envanter tuketim satirlari arindirmada temizlenir.
- Telefon arama/bitirme, cam acma/kapama, esya verme, kimlik gosterme ve recete yazma sistem satirlari arindirmada temizlenir.
- Okunmamis kisa mesaj bildirimi ve arac surus modu degistirme satirlari arindirmada temizlenir.

## Sahne olusturucu

- `Resim ekle` ile bir veya daha fazla gorsel sec.
- Panodaki gorseli `Ctrl+V` ile yapistirarak da sahne ekleyebilirsin.
- Gorseller tek uzun sahne olarak birlestirilir; aralarina yumusak gecis uygulanir.
- Her sahneye birden fazla yazi kutusu ekleyebilirsin.
- Yazi kutularini gorsel uzerinde surukleyerek konumlandirabilir, sag alt koseden genisligini ayarlayabilirsin.
- Her yazi kutusunun font boyutu ayri ayarlanabilir.
- Sahne gorselinin boyutunu ve sag-sol konumunu sahne kontrollerinden ayarlayabilirsin.
- `*` ve `/do` satirlari RP rengiyle, normal chat satirlari chat rengiyle gosterilir.
- `Tek PNG indir` dugmesi tum sahneleri tek resim olarak indirir.

PNG indir dugmesi gorunen SS'i siyah arka planla disari aktarir.

## Notlar

SA-MP chat renkleri kaynaklarda yaygin olarak `0xRRGGBBAA` biciminde tanimlaniyor. RAGE:MP tarafinda chat stilleri istemci arayuzundeki CSS dosyalarindan ozellestirilebiliyor. Bu arac, ekran goruntusundeki roleplay chat hissine yakin bir varsayilan kullanir: siyah arka plan, kalin Arial/Helvetica, beyaz chat ve mor emote.
