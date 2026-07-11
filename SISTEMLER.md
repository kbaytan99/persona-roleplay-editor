# Sistem Sozlugu

Bu dosya, Persona icindeki her ozelligin **resmi/ortak adini** tutar.
Amac: "su ustteki mavi buton", "o kayan kutu" gibi ornek-bazli tarifler yerine,
hem sen hem ben ayni ismi kullanalim ki bir ozellik unutulmasin veya yanlis
anlasilmasin. Yeni bir ozellik eklendiginde buraya da bir satir eklenir.

Her madde: **Sistem Adi** — kisa aciklama. *(Koddaki karsiligi, arama icin.)*

## 1. Ana Yerlesim

- **Menu Cubugu** — ust barda Dosya/Duzen/Sahne/Ayarlar/Gorunum/Yardim
  basliklarindan olusan acilir-menu sistemi. *(`initMenuBar`, `.menu-bar`)*
- **Marka Simgesi** — camgobegi-mor gecisli, tiyatro maskesi bicimli logo;
  favicon ve menu cubugu/Yardim panelindeki ikon. *(`icon.svg`)*
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
  kolun (grip) tutup surukleyerek katmanlarin on-arka sirasini degistirme.
  Birden fazla katman seciliyken herhangi birini suruklemek hepsini birlikte
  (aralarindaki sirayi koruyarak) tasir. Fare tabanli HTML5 surukle-birak
  degil, pointer-event tabanli oldugu icin dokunmatik ekranlarda da calisir.
  *(`reorderScene`, `startLayerDragReorder`, `reorderScenesByDrag`)*
- **Katman Kilidi** — bir katmani duzenlemeye karsi tamamen kapatan kilit
  ikonu: kilitli katman silinemez (tekli/coklu sil, kes, tumunu temizle),
  yeniden adlandirilamaz, canvas'ta suruklenip boyutlandirilamaz ve
  genisletilmis karttaki tum kontroller devre disi kalir.
  *(`scene.isLocked`)*
- **Katman Paneli Genisletme** — Katman Yoneticisi'nin sol kenarindan
  surukleyerek genislik ayarlama. *(`startLayersPanelResize`)*
- **Katman Karti Genislet/Daralt** — her katman karti varsayilan daraltilmis
  gelir (kucuk resim onizlemesi/yazi rozeti + tek satir ozet); basliktaki
  camgobegi renkli ok (kilit/sil butonlarindan ayirt edilsin diye) ile
  detaylar (Pozisyon/Filtreler/Gecis ya da font/stil/yazi) acilip kapanir.
  Yeni eklenen katmanlar otomatik genisletilmis gelir.
  *(`expandedLayerIds`, `renderScenes`, `.layer-expand-btn`)*
- **Katman Listesinde Surukleyerek Secim** — Katman Yoneticisi'nde bos
  alanda surukleyerek dosya gezgini gibi coklu katman secme; liste kenara
  yaklasinca otomatik kayar. *(`startLayerListMarqueeSelect`)*

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
- **Coklu Secimde Birlikte Surukleme** — birden fazla katman (resim+yazi
  karisik olabilir) seciliyken canvas'ta bunlardan birini suruklemek,
  kilitli olmayan tum secili katmanlari ayni miktarda birlikte tasir -
  katman listesindeki surukle-siralamanin canvas karsiligi.
  *(`getGroupDragSceneIds`, `applyGroupDragDelta`)*
- **Yazi Kutusu Stilleri** — bir yazi katmaninin arka plan efekti: Siyah
  kutu, Kontur, Soft golge, Efektsiz, Yari saydam kutu, Kalin kontur, Neon
  parlama. Listede en cok onerilen iki stil (Siyah kutu, Soft golge) yildiz
  (★) ile isaretli. *(`textBlock.textStyle`, `drawStyledText`)*

## 4. Secim Sistemi

- **Tekli/Coklu Secim** — bir katmana tiklayarak tek secim; `Ctrl`/`Cmd` +
  tiklama ile secime tek tek katman ekleme/cikarma; `Shift` + tiklama ile
  son secilen katmandan (anchor) o ana kadar araliktaki tum katmanlari
  secme (Windows/Photoshop mantigi). *(`setSelectedScene`,
  `toggleSceneSelection`, `selectSceneRange`, `selectedSceneIds`)*
- **Kutu ile Secim** (Marquee Select) — canvas'in bos bir noktasindan (ya da
  canvas'in disindaki bos gorunum alanindan) suruklenerek cizilen kutunun
  kesistigi tum resim ve yazi katmanlarini birlikte secme.
  *(`startSceneMarqueeSelect`)*
- **Sag Tik Menusu** (Context Menu) — canvas uzerinde sag tiklayinca cikan
  Kopyala/Kes/Yapistir/Cogalt/Sil/RSE menusu; canvas'in bos alaninda da
  aciliyor. Kilitli olmayan bir resim katmaninin uzerinde sag tiklarsa
  menu ayrica Pozisyon (Boyut/Genislik/Yukseklik) ve Filtreler
  (Parlaklik/Kontrast/Doygunluk) kontrollerini de ekliyor - katman
  panelini acmaya gerek kalmadan hizli ayar icin.
  *(`showSceneContextMenu`)*

## 5. Pano Sistemi (Kopyala/Kes/Yapistir)

- **Kopyala / Kes / Yapistir / Cogalt** — secili katman(lar)i panoya alma,
  silme veya aninda cogaltma. Cogalt (`Ctrl+D`) panoya dokunmadan calisir.
  Yapistirma (`Ctrl+V`) dogrudan klavye kisayoluyla calisir (tarayicinin
  yerel "paste" olayina bagli degildir - o olay sadece odak belirli bir
  yerdeyken tetiklenir); yerel paste olayi artik sadece isletim sistemi
  panosundan gercek bir resim yapistirmak icin kullaniliyor.
  *(`copySelectedScenes`, `cutSelectedScenes`, `pasteSceneClipboard`,
  `duplicateSelectedScenes`, `isScenePasteShortcut`)*
- **Kademeli Kaydirma** — art arda yapistirinca her kopyanin bir oncekinden
  biraz daha kaydirilarak (offset) yerlestirilmesi, boylece ustuste
  binmemesi. *(`cloneSceneForPaste`, `sceneClipboardPasteCount`)*

## 6. Gorunum Kontrolleri

- **Yakinlastirma** (Zoom) — `Ctrl+Scroll`, `Ctrl 0/+/-` veya Gorunum menusu
  ile canvas yakinlastirma/uzaklastirma/sigdirma. *(`setSceneViewportZoom`,
  `fitSceneToViewport`)*
- **Canvas Kaydirma** (Panning) — `Space` basiliyken suruklayerek gezinme.
  *(`startSceneViewportPan`)*
- **Pencere Yonetimi** — Katman Yoneticisi'nin baslik cubugundan
  surukleyerek sag/sol/alt kenara yaslanmasi (dock) ya da ekranda serbest
  (floating) bir pencere olarak birakilmasi; hangi kenara yaklastigini
  gosteren mavi vurgu ve son secilen kenar/boyutun hatirlanmasi. Ust kenara
  yaslama kasten desteklenmiyor — dikey bir kart listesi icin genis-kisa bir
  serit kotu bir yerlesim oluyordu. *(`applyLayersDock`,
  `getSavedLayersDock`, "Window Manager" bolumu)*

## 7. Dosya Sistemi

- **RSE Proje Formati** — tum sahne projesini (katmanlar, ayarlar, secim)
  tek `.rse` dosyasina kaydetme/geri yukleme. *(`exportSceneProject`,
  `importSceneProject`)*
- **PNG Disa Aktarma** — tum katmanlari tek bir PNG olarak birlestirip
  indirme. *(`downloadCompositeScene`)*
- **ImgBB'ye Yukle + BBCode Kopyala** — tum katmanlari birlestirip PNG
  olarak dogrudan ImgBB'ye yukler, donen linki forum BBCode'una
  (`[url=...][img]...[/img][/url]`) sarip panoya kopyalar. Backend
  olmadigi icin dogrudan tarayicidan (CORS ile) yukleniyor.
  *(`uploadCompositeSceneToImgbb`, `buildCompositeCanvas`)*
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
  eklendiginde buraya ve `appChangelog`'a birer giris eklenir. Tek seferde
  bir surum gosterilir, `<`/`>` oklariyla daha yeni/daha eski surumler
  arasinda gezinilir; panel her acildiginda en yeniden baslar.
  *(`appChangelog`, `renderAboutPanel`, `aboutChangelogPage`)*

---

**Kural:** Yeni bir ozellik/sistem eklendiginde bu dosyaya kisa bir madde,
`appChangelog`'a bir degisiklik notu ve gerekirse Kisayollar Kutusu'na bir
satir eklenir — boylece hicbir sistem "bilinmeyen/isimsiz" kalmaz.
