# Persona

Text based roleplay sahnelerini tek canvas uzerinde duzenleyip tek PNG olarak
disari aktaran client-side web uygulamasi. Latince "persona", Roma tiyatrosunda
oyuncunun sesini sahneye tasidigi maskenin adiydi — bu uygulama da bir gorsel
ile bir replik/karakteri tek sahnede birlestiriyor.

Canli web adresi: https://kbaytan99.github.io/persona-roleplay-editor/

## Calistirma

```powershell
node server.js
```

Sonra `http://127.0.0.1:8765/` adresini ac. Uygulama web uzerinden client-side calisir; kayitlar kullanicinin kendi tarayici profilinde `localStorage` ve `IndexedDB` icinde tutulur.

## Yayin oncesi kontrol

Ilk komut surum numarasi, changelog, CSS/JS/SVG cache-buster degerleri ve
yerel asset yollarini; ardindaki komutlar JavaScript sozdizimini kontrol eder:

```powershell
node scripts/verify-release.mjs
node --check app.js
node --check scripts/rp-text.js
node --check scripts/utils.js
node --check server.js
```

Bu kontroller gecmeden `main` veya `gh-pages` guncellenmemelidir.

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

## Dosya yapisi

Build araci yok, tum dosyalar dogrudan tarayiciya sunulur (ES module
`import`/`export` ile). Kod alanlarina gore boluk halinde:

- `index.html` — sayfa iskeleti, tum `<link>`/`<script>` etiketleri
- `app.js` — uygulamanin cekirdegi: sahne/katman durumu, render dongusu,
  tum etkilesimler (surukleme, secim, docking, pano, gecmis, RSE, PNG)
- `scripts/rp-text.js` — RP metin ayristirma/bicimlendirme (emote/OOC/
  sistem satiri tespiti, kelime kaydirma, canvas'a yazi cizme) — saf
  fonksiyonlar, sahne durumuna dokunmaz
- `scripts/utils.js` — genel yardimci fonksiyonlar (`clampNumber`)
- `styles/*.css` — eskiden tek bir 3600 satirlik `style.css` idi, donem/
  alana gore 6 dosyaya bolundu (`base`, `canvas-stage`, `layer-manager`,
  `scene-skin`, `theme-skin`, `layer-manager-polish`); `index.html`'de
  hangi sirada yuklendigi onemli (sonrakiler oncekileri override edebilir,
  tek dosyadaki cascade davranisiyla ayni)
- `server.js` — sadece lokal gelistirme icin statik dosya sunucusu

## Sistem sozlugu

Uygulamadaki her ozelligin resmi/ortak adi icin [SISTEMLER.md](SISTEMLER.md)
dosyasina bak — yeni bir ozellik eklerken oraya da bir madde ekle.

## Notlar

- `*` ile baslayan emote satirlari mor RP rengiyle, normal chat satirlari beyaz gosterilir.
- `** Isim Soyisim durum` bicimi sahne yazisinda `* durum (( Isim Soyisim ))` formatina uyarlanir.
- `(( ... ))` OOC satirlari sahne yazisinda gosterilmez.
