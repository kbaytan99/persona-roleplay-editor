"use strict";

// Version history shown in the Yardim/About panel. Pure data, no logic -
// kept separate so app.js changes don't get buried under a 500+ line
// changelog diff every release.

export const appChangelog = [
  {
    version: "3.20.0",
    date: "2026-07-13",
    title: "Buyuk ic temizlik: app.js 5 dosyaya bolundu",
    notes: [
      "Kullaniciya donuk hicbir davranis degisikligi yok - bu tamamen bir kod duzenleme surumu. app.js tek parca ~5500 satirdan gercek bir bootstrap dosyasina (~490 satir) indirildi; kod artik scripts/storage.js (kalicilik), scripts/scene-model.js (sahne CRUD/secim/gecmis/Cetvel/RSE/ImgBB), scripts/canvas.js (render + pointer etkilesimleri), scripts/layer-panel.js (katman karti UI'i) ve scripts/menu-ui.js (menu/panel/kisayol chrome) arasinda bolunmus durumda.",
      "Her modul tarayicida tek tek canli test edildi (menu acma, katman ekle/sil/surukle/kilitle, geri al/ileri al, Cetvel, ImgBB/RSE, Kisayollar, dil degistirme) - hicbir regresyon bulunmadi. scripts/verify-release.mjs artik tum dosyalardaki cache-buster'lari tarayacak sekilde guncellendi.",
    ],
  },
  {
    version: "3.19.0",
    date: "2026-07-13",
    title: "Menu duzenlendi: Fikir + Promptlar tek 'Icerik' menusunde",
    notes: [
      "Menu cubugu 8'den 7 menuye indi: yapisi neredeyse ayni olan 'Fikir' ve 'Promptlar' menuleri tek bir 'Icerik' menusunde birlestirildi (ic ice iki bolum olarak, aralarinda ayirici cizgiyle) - tum ID'ler/fonksiyonlar degismedi, sadece nerede oldugu degisti.",
    ],
  },
  {
    version: "3.18.1",
    date: "2026-07-12",
    title: "Promptlar duzeltildi: AI gorsel/chat log uydurmuyor artik",
    notes: [
      "Promptlar menusundeki 4 sablon yanlis kurgulanmisti: 'Resimli' varyantlar AI'a kendi gorsel onerisini uydurmasini soyluyordu, 'Chat log'lu' varyantlar da AI'a sahte bir chat log uydurmasini soyluyordu. Dogrusu: bu kategoriler senin AI'a GERCEK bir chat log yapistiracagini veya gercek bir gorsel/ekran goruntusu verecegini belirtiyor - AI hicbir zaman gorsel veya chat log uretmiyor, sadece senin verdigin gercek log/goruntuyu okuyup Persona formatina uygun metin yaziyor.",
    ],
  },
  {
    version: "3.18.0",
    date: "2026-07-12",
    title: "Yeni: Promptlar menusu - AI'a hazir prompt sablonlari",
    notes: [
      "Menu cubuguna yeni bir 'Promptlar' menusu eklendi: Chat log'lu/Chat log'suz ve Resimli/Resimsiz kombinasyonlarindan 4 hazir prompt sablonu, dogrudan ChatGPT/Claude gibi bir yapay zekaya kopyala-yapistir yapmak icin. Her prompt, AI'a Persona'nin anladigi bicimde ('*' emote satiri, '** Isim durum' kisayolu, '(( ... ))' OOC) yazmasi icin talimat verir; 'Resimli' varyantlar ayrica bir arka plan gorseli onerisi de ister. 'Promptu kopyala' ile secili kategori tek tikla panoya kopyalanir.",
    ],
  },
  {
    version: "3.17.1",
    date: "2026-07-12",
    title: "Hata: Canvas'ta kose tutamaciyla buyutme grubu bozuyordu",
    notes: [
      "Bir onceki surumde katman kartindaki kaydiricilar coklu secimde birlikte calisiyordu, ama canvas uzerindeki kose/kenar tutamaciyla dogrudan surukleyerek buyutup kucultmek hala sadece surukledigin tek katmani etkiliyordu - ustelik secimi de o tek katmana sifirliyordu. Artik canvas'tan buyutme/kucultme de, konum surukleme gibi, secili tum kilitli-olmayan resim katmanlarini ayni oranda birlikte buyutup kucultuyor ve secimi bozmuyor.",
    ],
  },
  {
    version: "3.17.0",
    date: "2026-07-12",
    title: "Coklu secimde ayarlar birlikte degisiyor",
    notes: [
      "Birden fazla ayni turden katman (hepsi resim veya hepsi yazi) seciliyken, katman kartindaki neredeyse her ayari degistirmek artik hepsini birlikte gunceller: resimde Boyut/Genislik/Yukseklik/X/Y buyutme-kucultme, Filtreler (Parlaklik/Kontrast/Doygunluk/Sicaklik/Blur) ve sifirlama, Gecis efekti; yazida font boyutu, yazi stili, harf ve satir bosluğu. Kilitli katmanlar ve farkli turdeki katmanlar etkilenmez, yazi icerigi senkronize edilmez - sadece stil/boyut ayarlari.",
    ],
  },
  {
    version: "3.16.0",
    date: "2026-07-12",
    title: "Yeni: Cetvel - yeni resimleri referansla ayni boyuta getir",
    notes: [
      "Sahne menusune 'Cetvel: boyut esleştirme' eklendi. Acikken, yeni eklenen/yapistirilan her resim otomatik olarak bir referans resimle (secili resim varsa o, yoksa listedeki en ustteki resim) ayni Boyut/Genislik/Yukseklik/X degerlerini alir; dikey konumu ise canvas'in ust veya alt kenarini asmayacak sekilde otomatik ayarlanir. Tek tusla acilip kapanir, tercih tarayicida kalici.",
    ],
  },
  {
    version: "3.15.0",
    date: "2026-07-12",
    title: "Yazi katmanlarinda yapiskan varsayilanlar + imlecte spawn",
    notes: [
      "Bir yazi katmaninin font boyutu/stili/harf-satir bosluguna yaptigin son degisiklik artik hatirlaniyor ve bir sonraki yeni yazi katmani (buton veya yapistirma ile) otomatik olarak ayni ayarlarla geliyor - her seferinde varsayilana sifirlanmiyor. Tercih tarayicida kalici.",
      "Yeni bir yazi katmani eklerken (Yazi ekle veya panodan yapistirma) fare o an canvas'in uzerindeyse katman farenin bulundugu yerde beliriyor; degilse sahnenin tam ortasinda - eskiden hep sabit bir noktada (sol ust) beliriyordu.",
    ],
  },
  {
    version: "3.14.1",
    date: "2026-07-12",
    title: "Yapistirilan katman tekrar en basa (1. sira) gelsin",
    notes: [
      "Onceki surumde panodan yapistirilan bir katman (gorsel veya metin) listenin sonuna ekleniyordu. Bu geri alindi: yapistirilan katman artik yine 'Yazi ekle'/'Resim ekle' butonlari gibi listenin basina (1. sira, en one) geliyor - onceki degisiklik yanlis yonde bir duzeltmeydi.",
    ],
  },
  {
    version: "3.14.0",
    date: "2026-07-12",
    title: "Yeni: Sahneyi kopyala (hicbir yere yuklemeden)",
    notes: [
      "Dosya menusune 'Sahneyi kopyala' eklendi: birlesik PNG'yi hicbir servise yuklemeden veya paylasmadan dogrudan panoya kopyalar. ChatGPT gibi baska bir uygulamaya direkt yapistirmak icin - ImgBB, Discord veya indirme gerekmez.",
    ],
  },
  {
    version: "3.13.3",
    date: "2026-07-12",
    title: "Hata: Discord mesaji ayni gorseli iki kez onizliyordu",
    notes: [
      "BBCode metni ayni linki iki kez icerdigi icin ([url=X][img]X[/img][/url]) Discord her yuklemede ayni resmi alt alta iki kez onizliyordu. BBCode artik bir kod blogu icinde gonderiliyor - Discord kod bloklarindaki linkleri onizlemedigi icin artik sadece tek bir onizleme cikiyor, BBCode metni de eskisi gibi tam ve kopyalanabilir kaliyor.",
    ],
  },
  {
    version: "3.13.2",
    date: "2026-07-12",
    title: "Kucuk temizlik",
    notes: [
      "Gecmis bir gelistirme oturumuna ait ic iletisim dosyasi (CODEX_ILETISIM.md) ve degisiklik gunlugundeki bir referans kaldirildi; kullaniciya donuk bir davranis degisikligi yok.",
    ],
  },
  {
    version: "3.13.1",
    date: "2026-07-12",
    title: "Discord paylasimi ayri buton olmaktan cikti, ImgBB yuklemesine tasindi",
    notes: [
      "Ayri 'Discord'a paylas' butonu kaldirildi. Ayarlar'da bir Discord webhook URL'i girilmisse, 'Yukle ve BBCode kopyala' ile yapilan her ImgBB yuklemesi artik ayni link ve BBCode'u otomatik olarak Discord'a da (duz metin mesaj olarak) gonderiyor - PNG ikinci kez yuklenmiyor, Discord linkten kendi onizlemesini cikariyor. Webhook girilmemisse hicbir sey degismiyor.",
    ],
  },
  {
    version: "3.13.0",
    date: "2026-07-12",
    title: "Yukleme gecmisi + Discord'a paylas",
    notes: [
      "ImgBB butonunun yanina bir 'Gecmis' ikonu eklendi: gecmiste yapilan yuklemeleri (kucuk onizleme, tarih/saat, linki tekrar kopyala) listeler. Ayri bir IndexedDB'de saklanir, son 50 yukleme tutulur - amac ImgBB gecici erisilemez olursa eski linklere hala ulasilabilmesi.",
      "Dosya menusune 'Discord'a paylas' eklendi: PNG'yi Ayarlar'da girilen kendi Discord webhook'una dogrudan dosya eki + basit bir embed olarak gonderir. ImgBB'ye ihtiyac duymaz. Webhook URL'i sadece bu tarayicida saklanir.",
    ],
  },
  {
    version: "3.12.0",
    date: "2026-07-12",
    title: "Rusca ve Ispanyolca dil destegi + yapistirma sira hatasi duzeltildi",
    notes: [
      "Ayarlar menusundeki dil secimine Rusca ve Ispanyolca eklendi (artik Turkce/Ingilizce/Rusca/Ispanyolca arasinda secim yapilabiliyor); tum arayuz metinleri bu iki dile de cevrildi.",
      "Hata duzeltildi: panodan bir gorsel veya metin yapistirmak, yeni katmani otomatik olarak listenin en basina (1. sira, en onde) koyuyordu. Artik yapistirilan katman listenin SONUNA ekleniyor - 'Yazi ekle'/'Resim ekle' gibi acik ekleme butonlari hala en basa koyuyor, sadece Ctrl+V ile panodan yapistirma davranisi degisti.",
    ],
  },
  {
    version: "3.11.0",
    date: "2026-07-12",
    title: "Yeni: Fikir menusu (rol yapma senaryo onerileri)",
    notes: [
      "Menu cubuguna yeni bir 'Fikir' menusu eklendi: Legal (PD, MD, Diger) ve Illegal (Ceteler, Kartel, Soygun) kategorilerinden birini secip 'Yeni fikir' ile kisa bir rol yapma senaryosu onerisi gorebilirsin. Sadece esinlenme icin - hicbir katmani/sahneyi degistirmiyor, secilen fikri otomatik yazi katmanina eklemiyor.",
      "Kucuk, elle secilmis bir baslangic listesi (6 kategori, kategori basina 6 fikir); zamanla genisletilebilir.",
    ],
  },
  {
    version: "3.10.0",
    date: "2026-07-12",
    title: "Metin yapıştırınca otomatik yazı katmanı olustursun",
    notes: [
      "Panoda bir gorsel yerine duz metin varken ve odak gercek bir yazma alaninda (katman adi, yazi kutusu vb.) degilken Ctrl+V yapistirmak artik o metni icinde tasiyan yeni bir yazi katmani olusturuyor - tipki panoda bir gorsel varken yeni bir resim katmani olusturdugu gibi. Bir yazma alaninda odaklanmisken yapistirma her zamanki gibi o alani doldurmaya devam ediyor.",
      "Kucuk iki hata duzeltildi: yeni yazi katmani ve katman cogaltma/yapistirma varsayilan isimleri (\"Yazi katmani N\", \"... kopya\") dil sistemine tasinmamis, ASCII Turkce olarak kalmisti - simdi diger tum arayuz metinleri gibi dogru Turkce/Ingilizce ceviriyor.",
    ],
  },
  {
    version: "3.9.2",
    date: "2026-07-12",
    title: "Hata: Satir bosluğu kaydiricisi canli onizlemede etkisizdi",
    notes: [
      "Bir yazi katmaninin Satir bosluğu degeri degistirildiginde katman kutusunun kendisi dogru satir yuksekligini aliyordu, ama icindeki her metin satiri (<p>) global bir stil kurali (\"p { line-height: 1.35 }\") yuzunden bunu miras almiyordu - tipki daha once yazi boyutu icin cozulen ayni hatanin bir benzeri. Simdi duzeltildi; kaydirici artik gercekten canli onizlemeye yansiyor (PNG disa aktarma zaten etkilenmemisti).",
    ],
  },
  {
    version: "3.9.1",
    date: "2026-07-12",
    title: "Pano yedegi, canvas bellek siniri, RSE sertlestirme",
    notes: [
      "ImgBB yuklemesinde panoya kopyalama basarisiz olursa BBCode artik durum cubugunda kirpilmiyor; sag ustte, icinde tam BBCode'un oldugu, tek tikla kopyalanabilen kucuk bir kutu (toast) aciliyor.",
      "Cikti canvas'i (PNG indirme ve ImgBB yukleme) icin toplam piksel butcesi eklendi (40 milyon piksel). Cok buyuk cikti genisligi/yuksekligi kombinasyonlari artik tarayiciyi zorlamak yerine oranini koruyarak otomatik kucultuluyor, durum cubugunda haber veriliyor.",
      "RSE import artik dosya boyutu (200 MB ust siniri), proje surumu (`version` alani tam eslesmeli) ve resim katmanlarinin `dataUrl` alaninin gercekten bir data: goruntu adresi oldugunu (herhangi bir dis URL degil) dogruluyor; bos katman listesi iceren bir dosya da artik acikca reddediliyor.",
    ],
  },
  {
    version: "3.9.0",
    date: "2026-07-12",
    title: "Sahnede cift tikla duzenleme + harf/satir bosluk kontrolleri",
    notes: [
      "Bir yazi katmanina canvas uzerinde cift tiklamak artik dogrudan yerinde duzenlemeye aciyor - Katman Yoneticisi'ni acmaya gerek yok. Yaziyi bitirmek icin disari tikla veya Escape'e bas (Escape degisiklikleri geri alir).",
      "Yazi katmanlarina Harf bosluğu ve Satir bosluğu kaydiricilari eklendi; hem canli onizlemede hem tek PNG disa aktarmada uygulaniyor. RSE import artik bu iki alani da gecersiz/asiri degerlere karsi dogruluyor.",
      "Kucuk bir hata duzeltildi: RSE dosyasi ice aktarilirken yazi stili (or. Neon parlama, Kalin kontur) sadece Siyah kutu/Efektsiz'e izin veren eksik bir listeye karsi kontrol ediliyordu, digerleri sessizce Siyah kutu'ya sifirlaniyordu.",
    ],
  },
  {
    version: "3.8.0",
    date: "2026-07-12",
    title: "Dil sistemi: Turkce ve Ingilizce",
    notes: [
      "Uygulama artik iki dilde calisiyor: Turkce ve Ingilizce. Dil, Ayarlar menusundeki acilir listeden degistirilebilir; secim tarayicida hatirlanir. Ilk acilista tarayici diline gore otomatik secilir (Turkce degilse Ingilizce).",
      "Turkce metinlerdeki eksik/Ingilizce klavye uyumlu karakterler (i, s, g, u, o, c) duzeltildi; menuler, katman yoneticisi, kisayollar kutusu, Hakkinda paneli ve durum cubugu mesajlari artik dogru Turkce karakterlerle gosteriliyor.",
    ],
  },
  {
    version: "3.7.3",
    date: "2026-07-12",
    title: "Gecmis bellek kullanimi ve RSE dosyasi dogrulamasi",
    notes: [
      "Geri al/ileri al gecmisi artik her adimda tum sahneleri (buyuk resim verileri dahil) iki kez JSON olarak kopyalamiyor; degismeyen resimler snapshot'lar arasinda ayni veriyi paylasiyor, bu da cok sayida yuksek cozunurluklu resimde bellek ve CPU yukunu azaltiyor.",
      "RSE dosyasi yuklerken katman ID'lerinin benzersizligi artik zorunlu kilindi; ayni ID'ye sahip iki katman iceren bozuk/elle degistirilmis bir dosya artik secim ve silme davranisini bozmuyor. Sayisal katman alanlari (boyut, konum, filtreler, gecis) da artik gecersiz veya asiri degerlere karsi guvenli sinirlarla dogrulaniyor.",
    ],
  },
  {
    version: "3.7.2",
    date: "2026-07-12",
    title: "ImgBB yukleme kilidi ve yayin dogrulama korumasi",
    notes: [
      "ImgBB yuklemesi artik tek seferde yalnizca bir kez calisiyor. Ctrl+Shift+U tusuna basili tutmak veya menu ogesine art arda tiklamak paralel yuklemeler baslatip kotayi gereksiz tuketemiyor; islem sirasinda menu ogesi devre disi ve mesgul olarak isaretleniyor.",
      "Gorsel cozme, PNG uretme, ImgBB istegi ve pano yazma asamalarinin ayri zaman asimlari var. API JSON olmayan/gecersiz ya da guvenli ve beklenen ImgBB alan adinda bir gorsel adresi icermeyen yanit verirse anlasilir hata gosteriliyor; 32 MB'yi asan PNG dosyalari da gonderilmeden durduruluyor.",
      "Tek PNG indirme artik buyuk base64 URL uretmek yerine gecici Blob URL kullaniyor; render/PNG hatalari yakalanip arayuzde bildiriliyor ve art arda indirme engelleniyor.",
      "Yayin oncesinde uygulama surumu, changelog, tum CSS/JS/SVG cache-buster degerleri ve yerel asset yollarinin uyumunu denetleyen scripts/verify-release.mjs eklendi.",
    ],
  },
  {
    version: "3.7.1",
    date: "2026-07-11",
    title: "Kisayollar kutusundan ImgBB satiri kaldirildi",
    notes: [
      "Ctrl+Shift+U kisayolu Kisayollar Kutusu'nda ayrica listeleniyordu ama zaten Dosya menusundeki 'Yukle ve BBCode kopyala' ogesinin yaninda gorunuyor - kutudan tekrar eden satir kaldirildi, menudeki kisayol yazisi kaldi.",
    ],
  },
  {
    version: "3.7.0",
    date: "2026-07-11",
    title: "Z-index skalasi, olu CSS temizligi, ImgBB kisayolu",
    notes: [
      "Bu oturumda tekrar tekrar ayni bug sinifina (yanlis elemani secen tiklamalar) rastlanmasinin sebebi z-index degerlerinin 6 dosyaya dagilmis, tek bir kaynak olmadan yonetilmesiydi. base.css'in basina belgelenmis bir z-index skalasi (--z-menu-bar, --z-floating-panel, vb.) eklendi, tum ust-katman (chrome) degerleri buna tasindi. Ayrica .composite-stage kendi izole stacking context'i haline getirildi - boylece cok sayida katmanla (yuzlerce olsa bile) katman icerigi z-index'i hicbir zaman menu/panel gibi ust katman elemanlarinin degerleriyle carpismiyor.",
      "v1.4.0'da kaldirilan eski dikey arac kutusu arayuzunden kalma, artik hicbir yerde kullanilmayan onlarca olu CSS kurali (.editor-panel, .scene-card, .helper-text, .primary-action, .brand-row, .section-title, .actions-row vb.) 3 dosyadan temizlendi. Bu arada gercekten gorunen bir hata da bulundu: ust menudeki kucuk Persona logosu, ayni olu koddan kalma bir kuralla yanlislikla 52x52px'lik, mor kenarlikli bir kutuya sahipti ve 44px'lik menu cubugunun disina tasiyordu - artik dogru boyutunda (18x23px).",
      "Dosya menusundeki 'Yukle ve BBCode kopyala' icin klavye kisayolu eklendi: Ctrl+Shift+U. Kisayollar Kutusu'na ve menu ogesine de eklendi.",
    ],
  },
  {
    version: "3.6.0",
    date: "2026-07-11",
    title: "Akilli hizalama artik diger resimlere de calisiyor + yapistirilan/cogaltilan katman artik onde",
    notes: [
      "Akilli hizalama (mor cizgiler) sadece canvas'in kenarina/ortasina hizalanirken cikiyordu, diger katmanlarin kenar/orta noktalarina hizalanirken hic cikmiyordu. Artik bir katmani suruklerken (ya da boyutlandirirken) diger tum katmanlarin kenar ve orta noktalari da hizalama hedefi - Figma/Photoshop'taki gibi.",
      "Yapistirilan (Ctrl+V) veya cogaltilan (Ctrl+D) bir katman, kopyalandigi orijinalin hafifce kaydirilmis bir kopyasi oldugu icin ikisi neredeyse tamamen ust uste biniyordu - ama yapistirilan/cogaltilan katman yanlislikla orijinalin ARKASINA yerlesiyordu. Bu yuzden yeni yapistirilan seyi surukleyip tasimaya calisinca aslinda altindaki orijinal resim hareket ediyordu. Artik yapistirilan/cogaltilan katman orijinalin ONUNE yerlesiyor, dogrudan tiklanip surukelenebiliyor.",
    ],
  },
  {
    version: "3.5.0",
    date: "2026-07-11",
    title: "Ilk acilista ornek sahne",
    notes: [
      "Persona'yi bu tarayicida hic kullanmamis biri ilk actiginda artik bomboş bir canvas yerine, bir resim katmani (jenerik, gecelik bir sokak silueti - herhangi bir oyun/dizi gorseli degil, ozel olarak cizilmis) ve bir yazi katmanindan (emote + diyalog + isim etiketi ornegi) olusan basit bir ornek sahneyle karsilasiyor. Bu, sadece tarayicida hic kayit yokken bir kereye mahsus gosteriliyor - Sahneleri sil ile her seyi bilerek temizleyen bir kullaniciya tekrar dayatilmiyor.",
    ],
  },
  {
    version: "3.4.1",
    date: "2026-07-11",
    title: "Coklu secim canvas'ta artik hep birlikte hareket ediyor",
    notes: [
      "Birden fazla katman secip canvas uzerinde birini surukleyince sadece o tek katman hareket ediyordu, digerleri yerinde kaliyordu - surukleme baslar baslamaz secimi tek katmana sifirlayan bir kod satiri yuzunden. Artik zaten secili olan bir katmani surukleme, secimi bozmuyor ve secili tum katmanlar (resim+yazi karisik olsa bile, kilitli olanlar haric) ayni miktarda birlikte hareket ediyor - katman listesindeki surukle-siralama zaten boyle calisiyordu, canvas'taki surukleme de artik ayni mantigi kullaniyor.",
    ],
  },
  {
    version: "3.4.0",
    date: "2026-07-11",
    title: "Yapistirma artik gercekten guvenilir + sag tik menusunde hizli ayarlar",
    notes: [
      "Ctrl+V ile katman yapistirma, tarayicinin yerel 'paste' olayina baglıydi - bu olay sadece belirli odak (focus) durumlarinda gerceklesiyor, bir katman kartina tiklamak gibi normal bir islemden sonra odak hicbir seyin uzerinde kalmayinca (document.body) sessizce hic tetiklenmiyordu. Kopyalama calisiyordu ama yapistirma cogu zaman hicbir sey yapmiyordu - tam olarak 'kopyaliyorum, yapistirinca gelmiyor' sikayeti. Artik Ctrl+V dogrudan klavye olayiyla (her zaman guvenilir) yakalaniyor; tarayicinin yerel yapistirma olayi artik sadece isletim sistemi panosundan gercek bir resim (ekran goruntusu) yapistirmak icin kullaniliyor.",
      "Sag tik menusu, kilitli olmayan bir resim katmaninin uzerinde acilinca artik Pozisyon (Boyut/Genislik/Yukseklik) ve Filtreler (Parlaklik/Kontrast/Doygunluk) kontrollerini de gosteriyor - Katman Yoneticisi panelini acmadan hizlica ayar yapilabiliyor.",
    ],
  },
  {
    version: "3.3.4",
    date: "2026-07-11",
    title: "Katman kontrollerindeki sayi kutulari bozuk gorunuyordu",
    notes: [
      "Pozisyon/Filtreler/Gecis efekti bolumlerindeki kaydiricilarin yanindaki kucuk sayi kutulari (ve kaydiricinin kendisi) yanlislikla 48-58px yuksekliginde, buyuk yazi tipiyle cizilip sayi cok kucuk bir kutuya sigdirilmaya calisiliyordu. Sebep: eski, kaldirilmis bir arayuzden (v1.4.0'da silinen dikey arac kutusu) kalma '.scene-mode input, .scene-mode select' kurallari hala .scene-mode sinifiyla eslesip TUM uygulama genelindeki input/select elemanlarini etkiliyordu. Bu eski kurallar Ayarlar panelindeki ilgili alanlara daraltildi/kaldirildi; kompakt kontroller artik tasarlandigi gibi (22px, kucuk yazi) gorunuyor.",
    ],
  },
  {
    version: "3.3.3",
    date: "2026-07-11",
    title: "Gecis efekti bolumu kapanma hatasi + kopyala/yapistir bug'i",
    notes: [
      "Katman kartindaki 'Gecis efekti' bolumu, icindeki bir kontrolu (Stil, Boyut, Yon) her degistirdiginde kendini kapatiyordu - cunku bu kontroller degisiklikte tum katman listesini yeniden ciziyor (renderScenes) ve bu her seferinde acik/kapali durumunu unutan taze bir bolum olusturuyordu. Artik hangi bolumlerin (Pozisyon/Filtreler/Gecis efekti) acik oldugu katman bazinda hatirlaniyor, yeniden cizimler arasinda kapanmiyor.",
      "Coklu katman secip Ctrl+C ile kopyalamak bazen sessizce hicbir sey yapmiyordu (ekranda bir uyari bile cikmiyordu) ve Ctrl+V ile yapistirinca daha once kopyalanmis eski bir icerik yapisiyordu. Sebep: bir yerde (ornegin bir katman ismi kutusunda) yazi imleci kalmis olsa - icinde hicbir metin secili olmasa bile - kopyala/yapistir kisayollari 'bir yazi kutusundayim, dokunma' diye tamamen devre disi kaliyordu. Artik sadece gercekten secili (vurgulanan) bir metin varsa native kopyala/yapistira birakiliyor; aksi halde secili katmanlarin kopyalanip yapistirilmasi her zaman calisiyor.",
    ],
  },
  {
    version: "3.3.2",
    date: "2026-07-11",
    title: "Degisiklik gunlugu artik sayfa sayfa",
    notes: [
      "Yardim menusundeki 'Son guncellemeler' listesi tum surumleri tek seferde alt alta gosterip asiri uzun bir kaydirma yaratiyordu. Artik tek seferde bir surum gosteriliyor, ok tuslariyla (< >) daha yeni/daha eski surumler arasinda gezilebiliyor; panel her acildiginda en yeni surumden basliyor.",
    ],
  },
  {
    version: "3.3.1",
    date: "2026-07-11",
    title: "Sag tik menusu canvas disinda da acilsin",
    notes: [
      "Sag tik menusu (Kopyala/Kes/Yapistir/Cogalt/Sil/RSE) sadece sahnenin/canvas'in tam uzerinde aciliyordu; etrafindaki bos gorunum alaninda sag tiklayinca tarayicinin kendi menusu cikiyordu. Artik sol tikla kutu-ile-secimde oldugu gibi, bos alanda sag tiklamak da ayni ozel menuyu aciyor.",
    ],
  },
  {
    version: "3.3.0",
    date: "2026-07-11",
    title: "ImgBB'ye yukle + BBCode kopyala",
    notes: [
      "Dosya menusune 'Yukle ve BBCode kopyala' eklendi: sahneyi tek PNG olarak birlestirip dogrudan ImgBB'ye yukler (backend olmadigi icin tarayicidan CORS ile), donen linki forum BBCode'una sarip ([url=...][img]...[/img][/url]) panoya kopyalar. Daha once elle PNG indirip Hizli Resim/Imgur gibi bir siteye ayrica yuklemek gerekiyordu.",
      "Pano izni verilmezse (bazi tarayici/ortam kisitlamalari) yukleme yine basarili sayilir, BBCode durum mesajinda gosterilip elle kopyalanabilir hale gelir - boylece link hicbir zaman kaybolmaz.",
    ],
  },
  {
    version: "3.2.3",
    date: "2026-07-11",
    title: "Menu aslinda hicbir zaman gercekten acilmiyordu - asil sebep bulundu",
    notes: [
      "Onceki turlardaki menu duzeltmeleri (z-index catismasi, mobil cekmece) gercekti ama asil sorunu cozmuyordu: Dosya/Duzen/Sahne/Ayarlar/Gorunum/Yardim'a basinca acilir menu DOM'da dogru sekilde 'acik' isaretleniyordu ama goze hicbir zaman gorunmuyor, tiklanabilir de olmuyordu. Sebep: dar ekranlarda menu ogeleri sigmayinca yatay kaydirma ekleyen .menu-bar-nav'a verilen 'overflow-x: auto' kurali, CSS'in kendi kuraliyla 'overflow-y' tarafini da otomatik olarak kirpan bir moda sokuyordu - acilir menuler ust menu cubugunun kendi 44px'lik yuksekliginin disina tasan icerikler oldugundan, boyutlari doğru hesaplaniyor ama ekranin disinda/gorunmez sayiliyorlardi. Acilir menuler artik ust cubuktan bagimsiz (position: fixed) konumlaniyor ve tetikleyici butonun tam altina JS ile yerlestiriliyor - artik hicbir ust kirpma onlari etkileyemiyor. Ayrica ust menu cubugunun on-arka kademesi (z-index) mobil cekmece/serbest panel gibi diger katmanlarin ustune cikacak sekilde yukseltildi.",
    ],
  },
  {
    version: "3.2.2",
    date: "2026-07-11",
    title: "Deploy cache-busting eklendi",
    notes: [
      "GitHub Pages tum dosyalari 10 dakika tarayici onbellegine aliyor (Cache-Control: max-age=600) - bu yuzden bir onceki surumu (3.2.1) deploy ettikten sonra bazi kullanicilarda sert yenileme (Ctrl+Shift+R) bile eski app.js/CSS'i gostermeye devam etti, cunku tarayicinin kendi disk onbellegi GitHub'in 10 dakikalik penceresini bekliyordu. index.html'deki tum <link>/<script> etiketlerine ve app.js'in kendi ES module import'larina appVersion ile eslesen bir ?v= cache-buster query'si eklendi - artik her surum kendi benzersiz dosya URL'sini kullaniyor, eski onbellek hicbir zaman yeni kodun onune gecemiyor.",
    ],
  },
  {
    version: "3.2.1",
    date: "2026-07-11",
    title: "Mobil/tablette menu cubugu kapaniyordu duzeltildi",
    notes: [
      "1180px'den dar ekranlarda (tablet/telefon) Katman Yoneticisi tam ekran yuksekligindeki (ustten alta) sabit bir cekmece haline geliyordu ve z-index:50 ile ust menu cubugunun (z-index:40) tam ustune biniyordu - bu yuzden telefon/dar pencerede menudeki hicbir tikama tepki vermiyordu. Cekmece artik menu cubugunun (44px) altindan basliyor, hicbir zaman ustune binmiyor.",
    ],
  },
  {
    version: "3.2.0",
    date: "2026-07-11",
    title: "Kilit, siralama ve menu duzeltmeleri",
    notes: [
      "Katman kilidi artik gercekten kilitliyor: kilitli bir katman silinemez (tekli sil, coklu sil, kes, tumunu temizle - hepsi kilitli katmanlari atlar), yeniden adlandirilamaz, canvas uzerinde suruklenemez/boyutlandirilamaz ve genisletilmis kart govdesindeki tum Pozisyon/Filtre/Gecis/Font/Yazi kontrolleri soluklasip devre disi kalir.",
      "Bir yazi katmani bir resmin onundeyken artik dogru sekilde suruklenebiliyor - onceden resmin surukleme/boyutlandirma kutusu (.stage-transform-overlay) sabit z-index:9000 tasidigi icin kendi stacking context'ini olusturuyor ve katman sirasi ne olursa olsun her zaman yazilarin onune geciyordu (daha once .stage-text-overlay icin cozulen sorunun ayni turu). Kutunun asiri buyuk +500 z-index farki da +2'ye indirildi, boylece kendi katmaninin bandinin disina tasmiyor.",
      "Ust menu cubugu artik Katman Yoneticisi serbest pencere (floating) modundayken de calisiyor - panel her zaman menu cubugunun (z-index:40) uzerinde kalacak sekilde z-index:100 tasidigindan, panel suruklenip ust kenara birakilirsa menuyu tamamen kapatip tiklamalari yutuyordu. Serbest pencere artik surukleme sirasinda menu cubugunun altina (52px) kenetleniyor, hicbir zaman ustune binemiyor.",
    ],
  },
  {
    version: "3.1.1",
    date: "2026-07-11",
    title: "Katman Yoneticisi'nde ust kenara yaslama kaldirildi",
    notes: [
      "Katman Yoneticisi'ni ust kenara yaslama secenegi kaldirildi - dikey bir kart listesi icin genis-kisa bir serit kotu bir yerlesim oluyordu. Sag/sol/alt kenara yaslama ve serbest pencere olarak tasima aynen calismaya devam ediyor. Daha once ust kenara yaslanmis kaydedilmis bir tercih varsa otomatik olarak sag kenara donuyor.",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-07-11",
    title: "Dosya yapisi bolundu",
    notes: [
      "Tek parca 3600 satirlik style.css, koddaki donem/alana gore 6 kucuk dosyaya bolundu (styles/ klasoru). Davranis degismedi - sadece dosya boyutu kuculdu.",
      "app.js'ten RP metin ayristirma/bicimlendirme mantigi (emote/OOC/sistem satiri tespiti, kelime kaydirma, canvas yazi cizimi) ayri, bagimsiz bir dosyaya (scripts/rp-text.js) tasindi. app.js artik ES module olarak yukleniyor.",
    ],
  },
  {
    version: "3.0.1",
    date: "2026-07-11",
    title: "Katman rengi + on-arka sira + kisayollar duzeltmeleri",
    notes: [
      "Katman kart renkleri sirasina gore degil, katmanin kendi kimligine gore atanmaya baslandi; artik bir katmani suruklerken/siralarken rengi degismiyor.",
      "Onemli bir goruntu hatasi duzeltildi: yazi katmanlari her zaman butun resim katmanlarinin onunde goruniyordu, katman sirasi ne olursa olsun (bir yazi katmanina her zaman bir resmin arkasinda kalmasini soylesen bile gecmiyordu). Sebep, yazi katmanlarinin kendi sabit, cok yuksek bir on-arka kademesi (z-index) olan ayri bir katmanda tutulmasiydi; artik resim ve yazi katmanlari ayni on-arka kademe sistemini paylasiyor, sadece liste sirasi belirleyici.",
      "Katman Yoneticisi paneli serbest pencere olarak tasindiginda Kisayollar Kutusu'nun uzerine biniyordu (panel her zaman en onde gorunmesi icin cok yuksek bir kademede); artik panel serbestken kutu gizleniyor.",
      "Kisayollar Kutusu gorsel olarak yenilendi: kisayollar 'Duzenleme' ve 'Gorunum' basliklariyla gruplandi, tuş gorselleri (kbd) daha belirgin/dokunsal bir gorunume kavustu.",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-07-11",
    title: "Katman Yoneticisi bastan asagi guclendirildi",
    notes: [
      "Katman surukleme sistemi tamamen yeniden yazildi: eskiden tarayicinin HTML5 surukle-birak API'sini kullaniyordu, bu da dokunmatik ekranlarda (telefon/tablet) hic calismiyordu ve ara sira garip takilmalara sebep oluyordu. Artik farenin de dokunmatigin da anladigi ayni sistemle (pointer events) calisiyor.",
      "Birden fazla katman seciliyken (Ctrl+tiklama, Shift+tiklama ya da kutu ile secim ile) herhangi birini suruklemek artik hepsini birlikte, aralarindaki sirayi koruyarak tasiyor - Photoshop/Explorer'daki gibi.",
      "Katman listesinde artik Ctrl/Cmd+tiklama ile tek tek katman ekleme/cikarma, Shift+tiklama ile aralik secme calisiyor (once sadece kutu ile surukleyerek coklu secim vardi, tek tek tiklama her zaman secimi tek katmana sifirliyordu).",
      "Surukleme sirasinda katmanin nereye yerlesecegini gosteren belirgin, parlayan bir cizgi eklendi (eski gosterge yanlis kenarda - sol/sag yerine yukari/asagi listede - beliriyordu).",
      "Katman karti render kodu (~300 satirlik tek bir dev fonksiyon) kucuk, isimlendirilmis parcalara ayrildi (createLayerCard, createLayerCardHeader, createLayerThumb, createTextLayerControls, createImageLayerControls, vb.) - ileride bir parcayi degistirmek icin artik butun kodu okumaya gerek yok.",
    ],
  },
  {
    version: "2.6.0",
    date: "2026-07-11",
    title: "Telefon/tablet uyumlulugu iyilestirildi",
    notes: [
      "Onemli bir hata duzeltildi: dar ekranlarda (telefon genisliginde) ust menu cubugu tasiyordu ve Ayarlar/Gorunum/Yardim gibi son menuler ekran disina cikip tamamen erisilemez oluyordu. Menu cubugu artik yatay kaydirilabiliyor, hicbir menu kaybolmuyor.",
      "Katman Yoneticisi paneli dar oldugunda (telefon asiri penceresi ya da elle en kucuk genislige daraltilinca) katman ismi kutusu okunamayacak kadar kucculuyordu; artik bu durumda gereksiz katman numarasi rozeti gizlenip yer katman ismine ayriliyor.",
      "Durum mesaji (sag ustteki bilgi yazisi) dar ekranlarda menuleri sikistirmasin diye gizleniyor.",
    ],
  },
  {
    version: "2.5.2",
    date: "2026-07-11",
    title: "Yazi boyutu kutusuna ust limit geri geldi",
    notes: [
      "Onceki duzeltmede yazarken alt limitin (10) zorlanmasi kaldirilmisti ama ust limit (48) de yanlislikla tamamen kalkmisti; fazladan bir hane yazilinca (or. 480) onizleme siniri asabiliyordu. Artik yazarken sadece ust limit (48) canli uygulaniyor, alt limit hala sadece kutudan cikinca (10-48 araligina) sabitleniyor.",
    ],
  },
  {
    version: "2.5.1",
    date: "2026-07-11",
    title: "Yazi boyutu artik sahnede gercekten degisiyor",
    notes: [
      "Onemli bir hata duzeltildi: sahne yazisinin gercek metni bir <p> etiketiydi ve uygulama genelindeki genel bir stil kurali tum <p> etiketlerinin yazi boyutunu 13px'e sabitliyordu. Bu yuzden katman font boyutunu (or. 48'e) degistirmek katmanin kendisini buyutuyordu ama gorunen yazi hep ayni kucuk boyutta kaliyordu. PNG disa aktarma etkilenmemisti, sadece canli onizleme."
    ],
  },
  {
    version: "2.5.0",
    date: "2026-07-11",
    title: "Yazi boyutu buyutme hatasi + Katman Yoneticisi'nde gorsel yenileme",
    notes: [
      "Yazi boyutunu buyuturken (or. 18'den 24'e) yazarken sahnedeki metin once yanlislikla en kucuk boyuta zipliyordu; artik yazarken oldugu gibi anlik guncelleniyor, sadece kutudan cikinca gecerli araliga (10-48) sabitleniyor.",
      "Katman kartlari gorsel olarak yenilendi: daha yuvarlak kenarlar, secili katmanda net bir parlama/cerceve, daha ferah baslik ve daha tutarli renk/golge kullanimi.",
      "Sira degistirme butonlari (En ust/Uste/Alta/En alt) kucuk metin yerine artik temiz ok ikonlariyla gosteriliyor.",
    ],
  },
  {
    version: "2.4.3",
    date: "2026-07-11",
    title: "Yazi kutusu stilinde yeni secenekler + yazi boyutu duzeltmesi",
    notes: [
      "Yazi katmani font boyutu kutusu dar alanda sayiyi net gostermiyordu; alan buyutuldu ve gereksiz artir/azalt oklari kaldirildi.",
      "Yazi kutusu stiline 3 yeni secenek eklendi: Yari saydam kutu, Kalin kontur, Neon parlama.",
      "Listede en cok onerilen iki stil (Siyah kutu, Soft golge) artik yildiz (★) ile isaretli ve listenin basinda.",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-07-10",
    title: "Katman yoneticisi ince ayarlar",
    notes: [
      "Katman kartlarindaki kilit/sil/ac-kapa butonlari artik emoji yerine uygulamanin geri kalaniyla tutarli, temiz ikonlar kullaniyor (bazi sistemlerde kilit emojisi cirkin bir renkli kutu olarak gorunuyordu).",
      "Yazi katmani kartindaki stil secme kutusu ('Siyah kutu' vb.) cok dar bir alana sikismisti ve metni kirpiyordu; duzeltildi.",
      "Panel kenarindaki boyutlandirma cubugu, panelin kendi tasma (overflow) ayari yuzunden gorunmuyordu (islev calisiyordu ama gorunmuyordu); artik uzerine gelince net goruluyor.",
      "Sag/sol kenara yasli tam yukseklikte/genislikte bir paneli surukleyip serbest pencereye cevirince, pencere devasa ve bos gorunuyordu; artik makul bir boyutla aciliyor.",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-07-10",
    title: "Katman yoneticisinde bugfix'ler",
    notes: [
      "Katman panelini kenarindan (surukleyerek boyutlandirma) yakinindan surukleyerek katman secmeye calisinca ikisi de ayni anda tetikleniyordu (panel boyut degistirirken bir de rastgele bir katman seciliyordu); artik kenara yakinken sadece boyutlandirma calisiyor.",
      "Katman Yoneticisi sol/ust/alt kenara yaslandiginda bazen Kisayollar Kutusu'nun ustune biniyordu; artik bu durumda Kisayollar Kutusu gizleniyor (panel serbest ya da kapaliyken tekrar gorunuyor).",
      "'Bos sahne' menu ogesindeki eksik/gorunmeyen ikon duzeltildi.",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-07-10",
    title: "Katman yoneticisi 4 kenara yaslanabiliyor",
    notes: [
      "Katman Yoneticisi'ni baslik cubugundan surukleyerek artik sag, sol, ust veya alt kenara yaslayabilir ya da ekranin herhangi bir yerinde serbest pencere olarak birakabilirsin; hangi kenara yaklastigin bir mavi vurgu ile gosteriliyor.",
      "Hangi kenara yaslandigi ve boyutu (genislik/yukseklik) tarayicida hatirlaniyor, bir sonraki acilista ayni yerde geliyor.",
      "Her katman kartinin ac/kapa (genislet/daralt) oku artik kilit ve sil butonlarindan ayirt edilsin diye camgobegi renginde.",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-07-10",
    title: "Kisayollar kutusu yeniden tasarlandi",
    notes: [
      "Kisayollar kutusu artik sol ustte, arac cubugunun altinda goruniyor; varsayilan olarak yari saydam ve dikkat dagitmiyor, uzerine gelince tam netlesiyor.",
      "Katman panelinin genisligine gore konum hesaplayan eski sag-alt yerlesimi kaldirildi; dar ekranlarda (katman paneli tam ekran kapladiginda) kisayollar kutusu ustune binmemek icin otomatik gizleniyor.",
    ],
  },
  {
    version: "2.3.1",
    date: "2026-07-10",
    title: "Canvas'ta kutu ile secim genisletildi",
    notes: [
      "Kutu ile secim artik canvas'in disindaki (etraftaki bos gorunum alani) bir noktadan baslayip icine dogru surukleyerek de calisiyor; onceden sadece sahnenin bos bir noktasindan baslatilabiliyordu.",
      "Kutu ile secim artik yazi katmanlarini da yakaliyor (onceden sadece resim katmanlari secilebiliyordu); kesisen tum resim+yazi katmanlari birlikte secilip Kopyala/Kes/Yapistir/Sil gibi islemler hepsine birden uygulanabiliyor (Windows dosya gezgini mantigi).",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-07-10",
    title: "Katman yoneticisi temiz kart yapisi + surukleyerek secim",
    notes: [
      "Katman kartlari artik varsayilan olarak daraltilmis geliyor: kucuk bir resim onizlemesi (veya yazi katmani icin 'T' rozeti) ve tek satirlik icerik ozetiyle kompakt gorunuyor; Pozisyon/Filtreler/Gecis efekti gibi detaylar sadece kart genisletildiginde olusuyor.",
      "Her kartin basligina bir genislet/daralt oku eklendi; yeni eklenen katmanlar (resim, yazi, cogalt, yapistir) otomatik genisletilmis geliyor.",
      "Katman listesinde bos alanda asagi/yukari surukleyerek dosya gezgini gibi coklu katman secimi eklendi; liste kenara yaklasinca otomatik kayiyor, bos alana sade tiklama secimi kaldiriyor.",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-07-10",
    title: "Persona icin bir marka simgesi",
    notes: [
      "Uygulamaya, tiyatro maskesi fikrini camgobegi-mor gecisli bir simgeyle anlatan bir logo eklendi; favicon ve menu cubugu/Yardim panelindeki simge olarak kullaniliyor.",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-07-10",
    title: "Persona adi ve katman paneli duzeltmesi",
    notes: [
      "Uygulama artik 'Persona' adiyla aniliyor (Latince 'persona': tiyatroda oyuncunun sesini sahneye tasidigi maske - gorsel + replik birlestiren bu uygulamaya tam oturan bir isim).",
      "Kritik bir hata duzeltildi: ekran 1180px'den dar oldugunda katman yoneticisi tamamen erisilemez hale geliyordu (eski kayan goster butonu kaldirildiktan sonra ortaya cikan bir regresyon). Artik dar ekranlarda panel bir tasan pencere olarak gorunmeye devam ediyor.",
      "Katman kontrollerindeki (Yukseklik, Parlaklik, Kontrast, Doygunluk gibi) etiketler dar bir sutunda kirpiliyordu; sutun genisligi duzeltildi.",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-07-10",
    title: "Hakkinda menusu ve otomatik ayarlar",
    notes: [
      "Menu cubugona bir Hakkinda/Yardim kategorisi eklendi; artik uygulamanin surum numarasini ve bu degisiklik gunlugunu buradan gorebiliyorsun.",
      "Ayarlar menusundeki gecis (transition) ayarlarini degistirdiginde artik ayri bir 'tum katmanlara uygula' butonuna basmana gerek yok, degisiklik aninda tum mevcut katmanlara yansiyor.",
      "Uygulamadaki her ozelligin resmi adini listeleyen bir sistem sozlugu (SISTEMLER.md) olusturuldu, boylece hangi ozellikten bahsettigimiz hep netlesiyor.",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-07-10",
    title: "Kopyala/kes/yapistir cilasi",
    notes: [
      "Yapistirilan veya cogaltilan bir katman artik orijinalin tam ustune dusmuyor; her yapistirmada biraz daha kaydirilarak yerlestiriliyor, boylece gorunur ve ayirt edilebilir kaliyor.",
      "Ctrl+D ile panoya hic dokunmadan anlik cogaltma yapilabiliyor; bu kisayol Duzen menusune, sag tik menusune ve kisayollar kutusuna da eklendi.",
      "Kopyala/Kes/Yapistir/Cogalt gibi secenekler artik ortada hicbir sey yokken otomatik olarak griye donup tiklanamaz hale geliyor.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-07-10",
    title: "Sag tik menusu, kutu ile secim ve arayuz temizligi",
    notes: [
      "Canvas uzerinde sag tiklayinca artik tarayicinin varsayilan menusu degil, Kopyala/Kes/Yapistir/Cogalt/Sil/RSE secenekli kendi menumuz aciliyor.",
      "Bos canvas alaninda surukleyerek bir secim kutusu (marquee) cizebiliyorsun; kutunun icine giren tum resim katmanlari otomatik seciliyor.",
      "Katman panelini gizleyince ekranda kalip 'Tek PNG indir' dugmesinin ustune binen mavi 'Katmanlar' butonu kaldirildi, yerine 'L' tusu kisayolu eklendi.",
      "'Yazi ekle' butonu artik kirmizi degil kendi vurgu rengiyle ve bir ikonla gosteriliyor; kisayollar kutusu artik katman paneliyle cakismiyor ve tasarsa kayabiliyor.",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-07-10",
    title: "Ust menu cubugu (Photoshop tarzi)",
    notes: [
      "Soldaki buyuk dikey arac kutusu tamamen kaldirildi; yerine ince bir ust menu cubugu geldi: Dosya, Duzen, Sahne, Ayarlar, Gorunum.",
      "Dosya indirme/yukleme, geri al/ileri al/kopyala/kes/yapistir, sahne ekleme ve gorunum ayarlari gibi her sey artik kategorilere ayrilmis acilir menulerden erisiliyor.",
      "Bu degisiklik canvas icin ekranda cok daha fazla yer acti.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-07-10",
    title: "Katman kontrolleri ikonlu ve yazilabilir oldu",
    notes: [
      "Pozisyon ve Filtreler bolumundeki kaydiricilarin (Boyut, Genislik, Parlaklik, Kontrast vb.) yanina anlamli ikonlar eklendi.",
      "Degerler artik sadece suruklenerek degil dogrudan yazilarak da girilebiliyor; kaydiricinin veya kutunun uzerinde fare tekerlegini cevirerek de ince ayar yapilabiliyor.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-07-10",
    title: "Bagimsiz metin katmanlari",
    notes: [
      "Yazi kutulari artik bir resmin icine gomulu degil, resimlerle tamamen esit haklara sahip bagimsiz katmanlar; istedigin bir yaziyi istedigin bir resmin onune ya da arkasina tasiyabiliyorsun.",
      "'Yazi ekle' artik katman yoneticisinden genel bir islem; PNG olarak disa aktarirken katmanlar onizlemedeki gercek sirasina gore ciziliyor (oncesinde yazilar her zaman tum resimlerin onunde ciziliyordu).",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-07-10",
    title: "Temel duzeltmeler",
    notes: [
      "Bos canvas alanina tiklayinca secim artik duzgun sekilde kalkiyor.",
      "Katman yoneticisi paneli artik kenarindan suruklenerek genisletilip daraltilabiliyor.",
      "Imgur'a yukleme ozelligi tamamen kaldirildi; kullanilmayan eski kod temizlendi.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-07-09",
    title: "Sahne editoru temeli",
    notes: [
      "Tek canvas uzerinde katmanli resim ve rol yapma (roleplay) yazisi duzenleme.",
      "Akilli hizalama, pencere yonetimi (sabitle/serbest birak) ve .rse proje formatiyla disa/ice aktarma.",
    ],
  },
];
