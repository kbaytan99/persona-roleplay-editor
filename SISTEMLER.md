# Sistem Sozlugu

Bu dosya, Persona icindeki her ozelligin **resmi/ortak adini** tutar.
Amac: "su ustteki mavi buton", "o kayan kutu" gibi ornek-bazli tarifler yerine,
hem sen hem ben ayni ismi kullanalim ki bir ozellik unutulmasin veya yanlis
anlasilmasin. Yeni bir ozellik eklendiginde buraya da bir satir eklenir.

Her madde: **Sistem Adi** — kisa aciklama. *(Koddaki karsiligi, arama icin.)*

## 1. Ana Yerlesim

- **Menu Cubugu** — ust barda Dosya/Duzen/Sahne/Ayarlar/Gorunum/Hakkinda
  basliklarindan olusan acilir-menu sistemi. *(`initMenuBar`, `.menu-bar`)*
- **Sahne Alani** (Canvas) — ortadaki, tum katmanlarin ustuste bindigi tek
  calisma yuzeyi. *(`.composite-stage`)*
- **Katman Yoneticisi** — sag taraftaki panel; tum resim ve yazi katmanlarinin
  listesi, siralama/kilit/silme kontrolleri. *(`#sceneLayersPanel`,
  `renderScenes`)*
- **Kisayollar Kutusu** — sag altta klavye kisayollarini listeleyen kutu.
  *(`.shortcut-hud`)*
- **Durum Mesaji** — menu cubugunun sagindaki tek satirlik bilgi/hata mesaji
  alani. *(`#sceneStatus`, `setSceneStatus`)*

## 2. Katman Sistemi

- **Resim Katmani** — icine yuklenen/yapistirilan bir gorseli tasiyan katman.
  *(`scene.type === "image"`)*
- **Yazi Katmani** — resimlerle ayni listede, bagimsiz hareket edebilen metin
  katmani (bir resmin "icinde" degildir). *(`scene.type === "text"`,
  `addTextLayer`)*
- **Katman Siralama** — "En ust / Uste / Alta / En alt" butonlari veya
  surukle-birak ile katmanlarin on-arka sirasini degistirme.
  *(`reorderScene`, `reorderSceneByDrop`)*
- **Katman Kilidi** — bir katmanin yanlislikla tasinmasini engelleyen kilit
  ikonu. *(`scene.isLocked`)*
- **Katman Paneli Genisletme** — Katman Yoneticisi'nin sol kenarindan
  surukleyerek genislik ayarlama. *(`startLayersPanelResize`)*

## 3. Duzenleme Kontrolleri

- **Pozisyon Kontrolleri** — bir resim katmaninin Boyut/Genislik/
  Yukseklik/X/Y degerleri. *(`createRangeControl`, Pozisyon bolumu)*
- **Filtre Sistemi** — Parlaklik/Kontrast/Doygunluk/Sicaklik/Blur; her resim
  katmani icin ayri ayarlanir. *(`getSceneImageFilter`)*
- **Gecis Efektleri** — Stil (Soft fade/Sinematik/Blur/Keskin), Boyut ve Yon;
  Ayarlar menusunde degistirilince **otomatik olarak tum katmanlara**
  uygulanir. *(`applyGlobalTransitionToAllScenes`)*
- **Akilli Hizalama** (Smart Guides) — bir katmani suruklerken kenara/merkeze
  yaklasinca beliren mor hizalama cizgileri. *(`snapStageBox`,
  `drawSmartGuides`)*
- **Yazi Kutusu Stilleri** — bir yazi katmaninin arka plan efekti (Siyah
  kutu/Kontur/Soft golge/Efektsiz). *(`textBlock.textStyle`)*

## 4. Secim Sistemi

- **Tekli/Coklu Secim** — bir veya birden fazla katmani tiklayarak secme.
  *(`setSelectedScene`, `selectedSceneIds`)*
- **Kutu ile Secim** (Marquee Select) — bos canvas alaninda suruklenerek
  cizilen kutunun kesistigi tum resim katmanlarini secme.
  *(`startSceneMarqueeSelect`)*
- **Sag Tik Menusu** (Context Menu) — canvas uzerinde sag tiklayinca cikan
  Kopyala/Kes/Yapistir/Cogalt/Sil/RSE menusu. *(`showSceneContextMenu`)*

## 5. Pano Sistemi (Kopyala/Kes/Yapistir)

- **Kopyala / Kes / Yapistir / Cogalt** — secili katman(lar)i panoya alma,
  silme veya aninda cogaltma. Cogalt (`Ctrl+D`) panoya dokunmadan calisir.
  *(`copySelectedScenes`, `cutSelectedScenes`, `pasteSceneClipboard`,
  `duplicateSelectedScenes`)*
- **Kademeli Kaydirma** — art arda yapistirinca her kopyanin bir oncekinden
  biraz daha kaydirilarak (offset) yerlestirilmesi, boylece ustuste
  binmemesi. *(`cloneSceneForPaste`, `sceneClipboardPasteCount`)*

## 6. Gorunum Kontrolleri

- **Yakinlastirma** (Zoom) — `Ctrl+Scroll`, `Ctrl 0/+/-` veya Gorunum menusu
  ile canvas yakinlastirma/uzaklastirma/sigdirma. *(`setSceneViewportZoom`,
  `fitSceneToViewport`)*
- **Canvas Kaydirma** (Panning) — `Space` basiliyken suruklayerek gezinme.
  *(`startSceneViewportPan`)*
- **Pencere Yonetimi** — Katman Yoneticisi'nin sabit (docked) ya da serbest
  (floating) pencere olarak tasinabilmesi. *(`.dockable-panel`, "Window
  Manager" bolumu)*

## 7. Dosya Sistemi

- **RSE Proje Formati** — tum sahne projesini (katmanlar, ayarlar, secim)
  tek `.rse` dosyasina kaydetme/geri yukleme. *(`exportSceneProject`,
  `importSceneProject`)*
- **PNG Disa Aktarma** — tum katmanlari tek bir PNG olarak birlestirip
  indirme. *(`downloadCompositeScene`)*
- **Otomatik Kaydetme** — degisikliklerin tarayicinin IndexedDB'sine
  arka planda otomatik yazilmasi. *(`scheduleSceneAutosave`,
  `saveLocalScenesNow`)*

## 8. Gecmis Sistemi

- **Geri Al / Ileri Al** (Undo/Redo) — `Ctrl+Z` / `Ctrl+Y`.
  *(`undoSceneHistory`, `redoSceneHistory`)*

## 9. Roleplay Metin Bicimlendirme

- **Emote Satiri** — `*` ile baslayan satirlar mor RP rengiyle gosterilir.
- **Isim/Durum Bicimi** — `** Isim Soyisim durum` yazimi otomatik olarak
  `* durum (( Isim Soyisim ))` seklinde gosterilir.
- **OOC Satiri** — `(( ... ))` ile yazilan satirlar sahne goruntusunde
  gizlenir.
  *(hepsi: `parseLines`, `buildSystemSegments`, `buildChatSegments`)*

## 10. Yardim Menusu

- **Kisayollari Goster/Gizle** — Kisayollar Kutusu'nu ac/kapat, artik Yardim
  menusunde. *(`showShortcuts`, `hideShortcuts`)*
- **Surum Numarasi** — Yardim menusunde gosterilen guncel versiyon.
  *(`appVersion`)*
- **Degisiklik Gunlugu** (Changelog) — "Son guncellemeler" listesi, her
  giris bir surum + baslik + detayli notlar iceriyor; yeni bir ozellik
  eklendiginde buraya ve `appChangelog`'a birer giris eklenir.
  *(`appChangelog`, `renderAboutPanel`)*

---

**Kural:** Yeni bir ozellik/sistem eklendiginde bu dosyaya kisa bir madde,
`appChangelog`'a bir degisiklik notu ve gerekirse Kisayollar Kutusu'na bir
satir eklenir — boylece hicbir sistem "bilinmeyen/isimsiz" kalmaz.
