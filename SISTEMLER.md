# Sistem Sozlugu

Bu dosya, Persona icindeki her ozelligin **resmi/ortak adini** tutar.
Amac: "su ustteki mavi buton", "o kayan kutu" gibi ornek-bazli tarifler yerine,
hem sen hem ben ayni ismi kullanalim ki bir ozellik unutulmasin veya yanlis
anlasilmasin. Yeni bir ozellik eklendiginde buraya da bir satir eklenir.

Her madde: **Sistem Adi** — kisa aciklama. *(Koddaki karsiligi, arama icin.)*

## 1. Ana Yerlesim

- **Menu Cubugu** — ust barda Dosya/Duzen/Sahne/Fikir/Ayarlar/Gorunum/Yardim
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
- **Arka Plan Sil** — Filtreler bolumundeki 0-100 cubuk; resim katmaninin
  koyu (siyah) arka planini otomatik seffaflastirir (luma key). 0 kapali;
  yukseldikce daha koyu tonlar silinir, kenarlar yumusak gecer. Orijinal
  resim degismez - sadece sahne gorunumunde ve PNG/ImgBB ciktisinda uygulanir.
  Filtreler'in "Sifirla" dugmesi bunu da 0'a dondurur. *(`getSceneBgKeyRange`,
  `getSceneImagePreviewFilter`, `getSceneKeyedSource`, `bgRemove`)*
- **Gecis Efektleri** — Stil (Soft fade/Sinematik/Blur/Keskin), Boyut ve Yon;
  Ayarlar menusunde degistirilince **otomatik olarak tum katmanlara**
  uygulanir. *(`applyGlobalTransitionToAllScenes`)*
- **Akilli Hizalama** (Smart Guides) — bir katmani suruklerken/
  boyutlandirirken canvas'in kenarina/merkezine VEYA diger herhangi bir
  katmanin kenar/merkez noktasina yaklasinca beliren mor hizalama
  cizgileri. *(`snapStageBox`, `getOtherLayerSnapTargets`,
  `drawSmartGuides`)*
- **Coklu Secimde Birlikte Surukleme** — birden fazla katman (resim+yazi
  karisik olabilir) seciliyken canvas'ta bunlardan birini suruklemek,
  kilitli olmayan tum secili katmanlari ayni miktarda birlikte tasir -
  katman listesindeki surukle-siralamanin canvas karsiligi.
  *(`getGroupDragSceneIds`, `applyGroupDragDelta`)*
- **Coklu Secimde Birlikte Ayar Degistirme** — birden fazla ayni turden
  katman (hepsi resim veya hepsi yazi) seciliyken, katman kartindaki
  hemen hemen her ayari (resimde Boyut/Genislik/Yukseklik/X/Y, Filtreler,
  Filtre sifirlama, Gecis efekti; yazida font boyutu, yazi stili, harf/
  satir bosluğu) degistirmek sadece o karti degil, secili tum ayni turdeki
  katmanlari birlikte gunceller - grup surukleme'nin ayarlar icin
  karsiligi. Kilitli katmanlar ve farkli turdeki (resim/yazi) katmanlar
  bundan etkilenmez; yazi icerigi (metnin kendisi) senkronize edilmez,
  sadece stil ayarlari. *(`applyToSelectedSiblings`,
  `withSelectedSiblings`)*
- **Coklu Secimde Birlikte Buyutme/Kucultme (canvas)** — birden fazla resim
  katmani seciliyken, canvas'taki kose/kenar tutamaclarindan birini
  suruklemek artik SADECE o katmani degil, secili tum kilitli-olmayan
  resim katmanlarini ayni oranda birlikte buyutup kucultur - her biri
  kendi merkezi etrafinda. Once bu tutamaclar suruklemeye baslar baslamaz
  secimi tek katmana sifirliyordu (grup surukleme'nin aksine); artik
  konum surukleme ile ayni "zaten grubun parcasiysa secimi bozma" kuralini
  izliyor. *(`startSceneImageScale`, `getGroupDragSceneIds`)*
- **Cetvel** (Sahne menusu) — acikken, yeni eklenen/yapistirilan her resim
  otomatik olarak bir referans resimle (secili resim varsa o, yoksa
  listedeki en ustteki resim) ayni Boyut/Genislik/Yukseklik/X degerlerini
  alir; Y konumu ise yeni resmin kendi en-boy oranina gore yeniden
  hesaplanip canvas'in ust/alt kenarini asmayacak sekilde sinirlanir - ayni
  boyut, ama tasma yok. Kapaliyken hicbir sey degismez (normal varsayilan
  boyut/konum). Tercih tarayicida kalici. *(`cetvelEnabled`,
  `findCetvelReferenceScene`, `computeCetvelImagePlacement`)*
- **Yazi Kutusu Stilleri** — bir yazi katmaninin arka plan efekti: Siyah
  kutu, Kontur, Soft golge, Efektsiz, Yari saydam kutu, Kalin kontur, Neon
  parlama. Listede en cok onerilen iki stil (Siyah kutu, Soft golge) yildiz
  (★) ile isaretli. *(`textBlock.textStyle`, `drawStyledText`)*
- **Yapiskan Yazi Varsayilanlari** — bir yazi katmaninin font boyutu/stili/
  harf-satir bosluguna yapilan her degisiklik hatirlanir (`localStorage`'da
  kalici) ve bir sonraki yeni yazi katmani (buton veya yapistirma ile)
  otomatik olarak ayni degerlerle baslar - her seferinde varsayilana
  sifirlanmaz. *(`rememberTextLayerDefaults`, `lastTextLayerDefaults`,
  `createSceneBlock`)*
- **Imlecte Yeni Yazi Katmani** — "Yazi ekle" veya panodan yapistirma ile
  eklenen yeni bir yazi katmani, fare o an canvas'in uzerindeyse farenin
  bulundugu noktada belirir; degilse sahnenin tam ortasinda.
  *(`getTextLayerSpawnPosition`)*

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
  binmemesi. Yapistirilan/cogaltilan katman, hafifce ust uste bindigi
  orijinalin ONUNE yerlesir, boylece dogrudan tiklanip surukelenebilir
  (arkasina yerlesseydi orijinal tiklamalari yerine gecerdi).
  *(`cloneSceneForPaste`, `sceneClipboardPasteCount`)*

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
  tek `.rse` dosyasina kaydetme/geri yukleme. Yuklerken katman ID'lerinin
  benzersizligi zorunlu kilinir (celisen ID yeniden uretilir) ve sayisal
  katman alanlari (boyut, konum, filtreler, gecis) gecersiz/asiri deger
  girildiginde guvenli varsayilanlara sabitlenir; bu, elle degistirilmis
  veya bozuk bir dosyanin secim/silme davranisini bozmasini engeller.
  Ayrica: dosya boyutu 200 MB'i asamaz, proje `version` alani tam
  eslesmelidir (uyumsuz/eksikse dosya reddedilir), resim katmanlarinin
  `dataUrl`'u gercekten bir `data:image/` adresi olmalidir (aksi halde
  bos katman sayilir - boylece bozuk bir dosya uygulamayi sessizce dis bir
  URL'ye istek attirmiyor), ve hic katmani olmayan bir dosya da acikca
  reddedilir. *(`exportSceneProject`, `importSceneProject`,
  `normalizeImportedScene`, `deduplicateImportedSceneIds`)*
- **Panodan Yapistir (OS clipboard)** — gercek bir yazma alaninda odak yokken
  Ctrl+V ile yapistirmak, panoda ne varsa ona gore davranir: bir gorsel
  varsa yeni bir resim katmani, duz metin varsa (RP log'u vb.) o metni
  icinde tasiyan yeni bir yazi katmani olusturur. Odak bir yazma alaninda
  (katman adi, yazi kutusu, katman-ici yerinde duzenleme) ise yapistirma
  her zamanki gibi o alani doldurur, yeni katman olusturmaz. Uygulama ici
  kopyalanmis katmanlarin yapistirilmasi (Ctrl+C/Ctrl+V ile "Kopyala"/
  "Yapistir") bundan ayri, klavye seviyesinde ele alinir - bir katman
  kopyalanmisken Ctrl+V her zaman onu yapistirir. *(`handlePaste`,
  `addTextLayer`, `addSceneImageBlobs`)*
- **PNG Disa Aktarma** — tum katmanlari tek bir PNG olarak birlestirip
  gecici Blob URL uzerinden indirme; render/PNG hatalari arayuzde bildirilir
  ve ayni anda tek indirme calisir. *(`downloadCompositeScene`,
  `canvasToPngBlob`)*
- **Sahneyi Kopyala** — tum katmanlari birlestirip PNG'yi hicbir yere
  yuklemeden/paylasmadan dogrudan isletim sistemi panosuna yazar
  (`ClipboardItem`); baska bir uygulamaya (sohbet, yapay zeka araci, gorsel
  duzenleyici) direkt yapistirmak icin. Tarayici desteklemiyorsa acik bir
  hata mesaji gosterir. *(`handleCopyScene`, `buildCompositeCanvas`)*
- **Cikti Piksel Butcesi** — `buildCompositeCanvas` (PNG indirme ve ImgBB
  yukleme, ikisi de) cikti genisligi x yuksekligi 40 milyon pikseli
  asarsa oranini koruyarak otomatik kucultur; kullaniciya durum
  cubugunda haber verilir. Cok buyuk Cikti genisligi/Arka plan yuksekligi
  degerlerinin (32767'ye kadar izin veriliyor) tarayicinin canvas bellek
  sinirlarini zorlayip sessizce bos/bozuk gorsel uretmesini engeller.
  *(`clampCanvasPixelBudget`, `sceneCanvasMaxPixels`)*
- **ImgBB'ye Yukle + BBCode Kopyala** — tum katmanlari birlestirip PNG
  olarak dogrudan ImgBB'ye yukler, donen linki forum BBCode'una
  (`[url=...][img]...[/img][/url]`) sarip panoya kopyalar. Backend
  olmadigi icin dogrudan tarayicidan (CORS ile) yukleniyor. Kisayolu:
  `Ctrl+Shift+U`. Ayni anda tek yukleme calisir; istek 45 saniyede zaman
  asimina ugrar ve 32 MB'yi asan PNG gonderilmeden durdurulur. Panoya
  yazma basarisiz olursa (izin reddi vb.) BBCode, durum cubugunda
  kirpilmak yerine sag ustte acilan kucuk bir kutuda (toast) tam
  metinle ve tek-tikla-kopyala butonuyla gosterilir.
  *(`uploadCompositeSceneToImgbb`, `buildCompositeCanvas`,
  `showImgbbFallbackToast`)*
- **Yukleme Gecmisi** — ImgBB butonunun yanindaki kucuk "Gecmis" ikonu,
  gecmiste yapilan yuklemeleri (kucuk onizleme + tarih/saat + linki
  tekrar kopyala) listeler. Ayri bir IndexedDB'de (`roll-ss-editor-uploads`)
  saklanir, en fazla 50 kayit tutulur (eskiler otomatik silinir). Amac:
  ImgBB (ya da baglanti) gecici olarak erisilemez olursa gecmis linklere
  hala ulasilabilmesi. *(`recordUploadHistory`, `readUploadHistory`,
  `showUploadHistoryPanel`)*
- **Discord Webhook Entegrasyonu** — ayri bir buton degil, ImgBB yukleme
  akisinin bir parcasi: Ayarlar menusunde bir Discord webhook URL'i
  girilmisse (sadece `localStorage`'da saklanir), "Yukle ve BBCode
  kopyala" ile her basarili ImgBB yuklemesinden sonra ayni link ve BBCode
  otomatik olarak o webhook'a da duz metin mesaj olarak gonderilir (PNG
  tekrar yuklenmez - Discord, mesajdaki gorsel linkinden kendi onizlemesini
  cikarir). Webhook girilmemisse hicbir sey olmaz, sessizce atlanir; girilip
  gecersizse veya istek basarisiz olursa durum cubugundaki ana yukleme
  mesajinin sonuna kisa bir not eklenir. *(`sendDiscordLinkMessage`,
  `isValidDiscordWebhookUrl`, `uploadCompositeSceneToImgbb`)*
- **Otomatik Kaydetme** — degisikliklerin tarayicinin IndexedDB'sine
  arka planda otomatik yazilmasi. *(`scheduleSceneAutosave`,
  `saveLocalScenesNow`)*
- **Ilk Acilis Ornek Sahnesi** — bu tarayicida IndexedDB'de hic kayit
  yokken (gercekten ilk ziyaret) otomatik eklenen, jenerik (marka/oyuna
  ozgu olmayan, ozel cizilmis) bir arka plan + ornek RP yazisindan olusan
  sahne. Bir kereye mahsus; kullanici "Sahneleri sil" ile bilerek
  bosaltirsa tekrar gelmez. *(`createExampleScenes`, `loadLocalScenes`)*

## 8. Gecmis Sistemi

- **Geri Al / Ileri Al** (Undo/Redo) — `Ctrl+Z` / `Ctrl+Y`. Her sahne
  gecmis kaydi sig (shallow) kopyalanir; degismeyen katmanlarin buyuk
  `dataUrl` (resim) degerleri farkli gecmis kayitlari arasinda ayni
  string referansini paylasir, tekrar kopyalanmaz. Tekrarlanan/degismemis
  durum gecmise eklenmez (ucuz alan-alan esitlik kontrolu ile).
  *(`undoSceneHistory`, `redoSceneHistory`, `pushSceneHistory`,
  `cloneSceneForHistory`, `historyEntriesEqual`)*

## 9. Roleplay Metin Bicimlendirme

- **Emote Satiri** — `*` ile baslayan satirlar mor RP rengiyle gosterilir.
- **Isim/Durum Bicimi** — `** Isim Soyisim durum` yazimi otomatik olarak
  `* durum (( Isim Soyisim ))` seklinde gosterilir.
- **OOC Satiri** — `(( ... ))` ile yazilan satirlar sahne goruntusunde
  gizlenir.
  *(hepsi: `parseLines`, `buildSystemSegments`, `buildChatSegments`)*
- **Sahnede Cift Tikla Duzenle** — Bir yazi katmaninin canvas uzerindeki
  gorunumune cift tiklamak, o anki formatli (renkli/OOC gizlenmis) onizlemeyi
  gecici olarak duz metin `<textarea>` ile degistirir; disari tiklamak
  (blur) degisikligi kaydedip zengin onizlemeyi yeniden cizer, Escape ise
  degisiklikleri atar. Katman Yoneticisi'ndeki asil textarea ile ayni
  `scene.text` alanini paylasir, ikisi de birbirini gunceller.
  *(`startInlineSceneTextEdit`, `renderSceneTextBlock`)*
- **Harf/Satir Bosluğu** — Her yazi katmani icin ayri harf araligi
  (`letterSpacing`, piksel) ve satir yuksekligi carpani (`lineHeight`)
  ayarlanabilir; hem canli HTML onizlemede (`style.letterSpacing`/
  `style.lineHeight`) hem PNG disa aktarmada (`context.letterSpacing`,
  `lineHeight = fontSize * scene.lineHeight`) ayni deger kullanilir. RSE
  import bu iki alani da guvenli araliga sabitler.
  *(`updateSceneTextStyle`, `drawSceneTextBlock`, `createTextLayerControls`)*

## 10. Dil Sistemi (i18n)

- **Turkce / Ingilizce / Rusca / Ispanyolca** — Tum menu, katman yoneticisi,
  kisayollar kutusu, Hakkinda paneli ve durum cubugu mesajlari
  `scripts/i18n.js` icindeki tek bir duz `key -> {tr, en, ru, es}`
  sozlukten geliyor. Statik `index.html` metinleri `data-i18n` /
  `data-i18n-title` / `data-i18n-placeholder` attribute'lari ile
  isaretlenmis; JS'in urettigi dinamik metinler (katman kartlari, durum
  mesajlari, context menu) render aninda dogrudan `t(key, vars)` cagiriyor.
  Degisiklik gunlugu (`appChangelog`) kapsanmiyor - o bir gelistirici
  gunlugu, sadece Turkce kaliyor. Fikir menusundeki senaryo metinleri
  (`scripts/rp-ideas.js`) su an sadece tr/en; ru/es secilince Turkce'ye
  geri duser.
- **Varsayilan dil** — Ilk ziyarette `navigator.language`'a gore otomatik
  secilir (tr/ru/es baslangicina gore, digerlerinde Ingilizce). Kullanici
  Ayarlar menusundeki acilir listeden degistirebilir; secim
  `localStorage`'da (`personaLanguage`) kalici olur. Dil degisince
  `<html lang>` de guncellenir - CSS `text-transform: uppercase` Turkce'ye
  ozgu i/İ buyutme kuralini uyguladigi icin, `lang` guncellenmezse
  Ingilizce metin yanlislikla "SİNGLE" gibi noktali I ile buyuyebiliyordu.
  *(`getLanguage`, `setLanguage`, `t`, `translateStaticDom`, `onLanguageChange`)*

## 11. Fikir Menusu

> v3.19.0'dan itibaren bu iki menu (Fikir + Promptlar) ayri menu tetikleyicileri
> degil, tek bir "Icerik" menusunun (`data-menu="icerik"`) icinde iki alt
> bolum olarak gosteriliyor (aralarinda `<hr class="menu-dropdown-divider">`).
> Tum element ID'leri (`ideaCategorySelect`, `ideaNewBtn`, `ideaDisplay`,
> `promptCategorySelect`, `promptCopyBtn`, `promptDisplay`) ve JS fonksiyonlari
> degismedi - sadece menu cubugundaki konumlari birlesti (8 menuden 7'ye
> indi).

- **RP Senaryo Onerileri** — Legal (PD, MD, Diger: Mekanik/Taksi/Hukumet) ve
  Illegal (Ceteler, Kartel, Soygun) kategorilerinden birini secip
  "Yeni fikir" ile o kategoriden rastgele kisa bir rol yapma senaryosu
  onerisi gosterir. Kucuk, elle secilmis bir baslangic listesi (kategori
  basina 6 fikir); sadece esinlenme icindir - hicbir sahne/katmani
  degistirmez, secilen fikri otomatik bir yazi katmanina eklemez. Icerik
  `scripts/rp-ideas.js`'de, her fikir kendi tr/en metniyle birlikte tutulur.
  *(`renderIdeaCategoryOptions`, `showRandomIdea`, `rpIdeaCategories`)*

## 12. Promptlar Menusu

- **Yapay Zeka Prompt Sablonlari** — disaridaki bir AI sohbetine (ChatGPT,
  Claude vb.) kopyala-yapistir yapilmak uzere hazirlanmis 4 hazir prompt:
  Chat log'lu/Chat log'suz x Resimli/Resimsiz kombinasyonlari. Her prompt,
  AI'a Persona'nin kendi metin motorunun (`scripts/rp-text.js`) anladigi
  bicimde ("*" emote satiri, "** Isim durum" kisayolu, "(( ... ))" OOC)
  yazmasi icin acik talimatlar icerir. Kategoriler AI'in ne uydurmasi
  gerektigini degil, kullanicinin AI'a NE VERECEGINI belirtir: "Chat
  log'lu" AI'a gercek bir chat log yapistirilacagini, "Resimli" gercek bir
  gorsel/ekran goruntusu verilecegini soyler - AI hicbir zaman kendi
  gorselini veya sahte chat log'unu uydurmaz, sadece verilen gercek
  icerigi okuyup Persona formatina uygun metin yazar. "Promptu kopyala" ile
  secili kategori panoya kopyalanir. Icerik su an sadece Turkce
  (`scripts/prompt-library.js`); sadece esinlenme/uretim yardimcisidir,
  hicbir sahne/katmani degistirmez. *(`renderPromptCategoryOptions`,
  `showSelectedPrompt`, `copySelectedPrompt`, `promptCategories`)*

## 13. Yardim Menusu

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

## 14. Dosya Yapisi (app.js bolunmesi)

- **Modul sinirlari** — `app.js` (2026-07-13, v3.19.0) tek parca ~5500
  satirdan gercek bir bootstrap dosyasina (~490 satir: state/DOM tanimlari +
  olay dinleyici kurulumu) indirildi. Kod artik su dosyalara ayrilmis
  durumda, her biri kendi sorumluluk alanini kapsiyor:
  - **`scripts/storage.js`** — localStorage ayar kaliciligi, IndexedDB sahne
    autosave + yukleme gecmisi, eski kullanici profili migrasyonu.
  - **`scripts/scene-model.js`** — sahne CRUD, secim, pano, geri al/ileri al
    gecmisi, Cetvel, yapiskan yazi varsayilanlari, RSE disa/ice aktarma,
    PNG/ImgBB/Discord ciktisi.
  - **`scripts/canvas.js`** — pointer etkilesimleri (pan/zoom/marquee/
    surukle/boyutlandir/olcekle/akilli hizalama), composite render'lama
    (`drawSceneLayerImage`/`drawSceneTextBlock`), sahne cikti boyutu
    getter'lari.
  - **`scripts/layer-panel.js`** — `renderScenes` ana dongusu, tum katman
    karti insaatcilari (resim+yazi), surukle-siralama, liste marquee-secim,
    paylasilan UI kontrol yardimcilari (`createRangeControl` vb.).
  - **`scripts/menu-ui.js`** — menu cubugu wiring, sag tik baglam menusu,
    Yardim/Fikir/Promptlar panel icerigi, Kisayollar goster/gizle, katman
    paneli boyutlandirma/serbest pencere tutamaclari.
  - **`scripts/changelog.js`** — `appChangelog` salt veri dizisi.
  - **`app.js`** — sadece DOM/state tanimlari (hepsi `export`'lu, diger
    modullerin okuyup gerektiginde `set*Raw` setter'lariyla yazdigi tek
    kaynak) ve en alttaki bootstrap olay dinleyici kurulumu.
- **Coklu-dongusel import** — modul cifti/uclusu birbirini import ediyor
  (or. `app.js` <-> `storage.js` <-> `scene-model.js`) - ES module'ler bunu
  destekliyor cunku hicbir modulun ust-seviye kodu import ettigi bir
  fonksiyonu HEMEN cagirmiyor, sadece daha sonra bir event handler icinde.
  `selectedSceneId`/`selectedSceneIds`/`hoveredSceneId`/
  `shouldAutoFitSceneViewport` gibi app.js'in sahip oldugu ama baska
  modullerin de degistirmesi gereken degiskenler icin `setSelectedSceneIdRaw`/
  `setSelectedSceneIdsRaw`/`setHoveredSceneIdRaw`/
  `setShouldAutoFitSceneViewport` setter'lari kullaniliyor (import edilen
  bir binding'e dogrudan atama yapilamiyor - ES module kurali).
- **`scripts/verify-release.mjs`** artik `app.js` ve `scripts/*.js`
  icindeki TUM `import ... from "..."` satirlarini tarayip her birinin
  `?v=` cache-buster'inin `appVersion` ile eslesip esleşmedigini kontrol
  ediyor (eskiden sadece `app.js`'in kendi importlarina bakiyordu).

---

**Kural (bolme sonrasi):** Yeni bir sahne-veri/CRUD islevi `scene-model.js`'e,
yeni bir canvas render/etkilesim ozelligi `canvas.js`'e, yeni bir katman
karti kontrolu `layer-panel.js`'e, yeni bir menu/panel/kisayol ozelligi
`menu-ui.js`'e, yeni bir kalicilik/depolama ihtiyaci `storage.js`'e gider —
`app.js`'e sadece yeni bir DOM referansi/state degiskeni veya bootstrap
kurulum satiri eklenir, yeni is mantigi fonksiyonlari eklenmez.

**Kural:** Yeni bir ozellik/sistem eklendiginde bu dosyaya kisa bir madde,
`appChangelog`'a bir degisiklik notu ve gerekirse Kisayollar Kutusu'na bir
satir eklenir — boylece hicbir sistem "bilinmeyen/isimsiz" kalmaz.
