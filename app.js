"use strict";

// Cache-buster query strings below (and on index.html's <link>/<script>
// tags) must match appVersion on every release - see index.html for why.
import { clampNumber } from "./scripts/utils.js?v=3.17.0";
import { parseLines, appendSegments, wrapLine, drawSegmentedText } from "./scripts/rp-text.js?v=3.17.0";
import { t, getLanguage, setLanguage, onLanguageChange, translateStaticDom } from "./scripts/i18n.js?v=3.17.0";
import { rpIdeaCategories } from "./scripts/rp-ideas.js?v=3.17.0";

const appVersion = "3.17.0";
const appChangelog = [
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

const appShell = document.querySelector(".app-shell");
const downloadBtn = document.querySelector("#downloadBtn");
const copySceneBtn = document.querySelector("#copySceneBtn");
const uploadImgbbBtn = document.querySelector("#uploadImgbbBtn");
const uploadHistoryBtn = document.querySelector("#uploadHistoryBtn");
const discordWebhookInput = document.querySelector("#discordWebhookInput");
const sceneImageInput = document.querySelector("#sceneImageInput");
const sceneOutputWidth = document.querySelector("#sceneOutputWidth");
const sceneBackgroundHeight = document.querySelector("#sceneBackgroundHeight");
const sceneFontSize = document.querySelector("#sceneFontSize");
const scenePadding = document.querySelector("#scenePadding");
const sceneTransitionSize = document.querySelector("#sceneTransitionSize");
const sceneTransitionStyle = document.querySelector("#sceneTransitionStyle");
const sceneTransitionSides = document.querySelector("#sceneTransitionSides");
const languageSelect = document.querySelector("#languageSelect");
const ideaCategorySelect = document.querySelector("#ideaCategorySelect");
const ideaNewBtn = document.querySelector("#ideaNewBtn");
const ideaDisplay = document.querySelector("#ideaDisplay");
const blankSceneBtn = document.querySelector("#blankSceneBtn");
const cetvelToggleBtn = document.querySelector("#cetvelToggleBtn");
const exportSceneProjectBtn = document.querySelector("#exportSceneProjectBtn");
const sceneProjectInput = document.querySelector("#sceneProjectInput");
const clearScenesBtn = document.querySelector("#clearScenesBtn");
const hideShortcutsBtn = document.querySelector("#hideShortcutsBtn");
const showShortcutsBtn = document.querySelector("#showShortcutsBtn");
const sceneStatus = document.querySelector("#sceneStatus");
const sceneList = document.querySelector("#sceneList");
const sceneLayersPanel = document.querySelector("#sceneLayersPanel");
const appTitle = document.querySelector("#appTitle");
const appSubtitle = document.querySelector("#appSubtitle");
const scenePreviewPane = document.querySelector("#scenePreviewPane");

const controls = {
  sceneFontSize,
  scenePadding,
};

const storageKeys = {
  sceneOutputWidth: "rollSs.sceneOutputWidth",
  sceneBackgroundHeight: "rollSs.sceneBackgroundHeight",
  sceneFontSize: "rollSs.sceneFontSize",
  scenePadding: "rollSs.scenePadding",
  sceneTransitionSize: "rollSs.sceneTransitionSize",
  sceneTransitionStyle: "rollSs.sceneTransitionStyle",
  sceneTransitionSides: "rollSs.sceneTransitionSides",
  layersWidth: "rollSs.layersWidth",
  layersHeight: "rollSs.layersHeight",
  layersDock: "rollSs.layersDock",
  shortcutsHidden: "rollSs.shortcutsHidden",
};
const localClientId = "local-client";
const legacyUserRegistryKey = "rollSs.users";
const legacyActiveUserKey = "rollSs.activeUser";
const scenes = [];
const sceneTransitionPx = 150;
const sceneCanvasDefaultWidth = 1200;
const sceneCanvasDefaultHeight = 800;
const sceneCanvasMaxDimension = 32767;
// 32767x32767 (the per-side max, mostly there so a single stray huge value
// can't itself overflow canvas APIs) times an equally large other side would
// be ~1.07 billion pixels - a ~4.3GB RGBA buffer, which reliably crashes or
// silently no-ops the tab well before that. This is a separate, much
// smaller total-area budget: generous for a screenshot compositor (a
// 10000x4000 canvas fits comfortably under it) but bounded well short of
// "the browser gives up." Enforced in buildCompositeCanvas() right before
// the canvas is allocated, so it catches every path that can set the two
// dimensions (Ayarlar inputs, RSE import, drag-resize handle).
const sceneCanvasMaxPixels = 40_000_000;
const sceneCanvasBackground = "#10141b";
const rseProjectMagic = "ROLEPLAY_SCENE_EXPORT";
const rseProjectVersion = 1;
// RSE files embed every layer's image as base64, so a legitimate multi-image
// project can be large - this is a backstop against a corrupt/malicious
// file hanging JSON.parse or blowing up memory, not a normal-use limit.
const rseMaxImportBytes = 200 * 1024 * 1024;
const sceneImageFilterDefaults = {
  brightness: 106,
  contrast: 108,
  saturate: 112,
  sepia: 4,
  blur: 0,
};
const sceneSnapThresholdPx = 12;
const sceneHistoryLimit = 20;
const sceneUndoStack = [];
const sceneRedoStack = [];
let sceneClipboardScenes = [];
let sceneClipboardPasteCount = 0;
let sceneViewportZoom = 1;
let isSpacePanning = false;
let selectedSceneId = "";
let selectedSceneIds = [];
let expandedLayerIds = new Set();
let hoveredSceneId = "";
let shouldAutoFitSceneViewport = true;
let currentUserId = localClientId;
let sceneSaveTimer = 0;
// Last pointer position over the composite stage, so a new text layer can
// spawn where the mouse actually is instead of a fixed spot. Tracked with a
// plain document-level pointermove (cheap - just two numbers) rather than
// only inside the stage, since the pointer needs to be checked against
// whichever stage element exists at layer-creation time anyway.
let lastPointerClientX = null;
let lastPointerClientY = null;
// "Sticky" text layer defaults: whatever font size/style/spacing the user
// last set on any text layer becomes the starting point for the next new
// one (button-added or pasted), instead of always resetting to a fixed
// factory default. Persisted so it survives a reload too.
const textLayerDefaultsStorageKey = "personaLastTextLayerStyle";
let lastTextLayerDefaults = loadLastTextLayerDefaults();

function loadLastTextLayerDefaults() {
  try {
    const stored = JSON.parse(localStorage.getItem(textLayerDefaultsStorageKey) || "null");
    if (stored && typeof stored === "object") return stored;
  } catch {
    // Corrupt/foreign localStorage value - fall through to defaults.
  }
  return { fontSize: 18, textStyle: "box", letterSpacing: 0, lineHeight: 1.18 };
}

function rememberTextLayerDefaults(scene) {
  lastTextLayerDefaults = {
    fontSize: scene.fontSize ?? lastTextLayerDefaults.fontSize,
    textStyle: scene.textStyle ?? lastTextLayerDefaults.textStyle,
    letterSpacing: scene.letterSpacing ?? lastTextLayerDefaults.letterSpacing,
    lineHeight: scene.lineHeight ?? lastTextLayerDefaults.lineHeight,
  };
  localStorage.setItem(textLayerDefaultsStorageKey, JSON.stringify(lastTextLayerDefaults));
}

// "Cetvel": while on, every newly added/pasted image is auto-sized to
// match an existing reference image (zoom/scale/x - the "same size" the
// user asked for), with imageY re-solved so the match never pushes the
// image past the canvas's top or bottom edge - the "wont overflow" half
// of the request. Off by default; persisted once toggled.
const cetvelStorageKey = "personaCetvelEnabled";
let cetvelEnabled = localStorage.getItem(cetvelStorageKey) === "1";

function setCetvelEnabled(enabled) {
  cetvelEnabled = enabled;
  localStorage.setItem(cetvelStorageKey, enabled ? "1" : "0");
}

function findCetvelReferenceScene() {
  const selectedImage = scenes.find((scene) => selectedSceneIds.includes(scene.id) && scene.type !== "text" && scene.dataUrl);
  if (selectedImage) return selectedImage;
  return scenes.find((scene) => scene.type !== "text" && scene.dataUrl) || null;
}

// Reuses the exact width/height math drawSceneLayerImage() uses for PNG
// export, so "does this overflow" is judged against the same geometry the
// user will actually see in the final image, not an approximation.
function computeCetvelImagePlacement(reference, naturalWidth, naturalHeight) {
  const zoom = reference.imageZoom || 100;
  const scaleX = reference.imageScaleX || 100;
  const scaleY = reference.imageScaleY || 100;
  const imageX = reference.imageX || 0;

  const outputWidth = getSceneOutputWidth();
  const outputHeight = getSceneBackgroundHeight();
  const baseHeight = (naturalHeight * outputWidth) / Math.max(1, naturalWidth);
  const drawHeight = baseHeight * (zoom / 100) * (scaleY / 100);

  let drawY;
  if (drawHeight >= outputHeight) {
    // Taller than the canvas even before considering position - center it
    // so any overflow is symmetric top/bottom instead of clipped on one
    // side only.
    drawY = (outputHeight - drawHeight) / 2;
  } else {
    const preferredDrawY = ((reference.imageY || 0) / 100) * outputHeight + (baseHeight - drawHeight) / 2;
    drawY = clampNumber(preferredDrawY, 0, outputHeight - drawHeight, 0);
  }
  const imageY = ((drawY - (baseHeight - drawHeight) / 2) / outputHeight) * 100;

  return { imageZoom: zoom, imageScaleX: scaleX, imageScaleY: scaleY, imageX, imageY };
}

restoreState();

function getOptions() {
  return {
    width: getSceneOutputWidth(),
    fontSize: getSceneFontSize(),
    lineGap: 1,
    padding: getScenePadding(),
    textEffect: "outline",
    backgroundMode: "transparent",
    emoteColor: "#c69aff",
    chatColor: "#f5f5f5",
  };
}

function saveState() {
  localStorage.setItem(clientStorageKey(storageKeys.sceneOutputWidth), sceneOutputWidth.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneBackgroundHeight), sceneBackgroundHeight.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneFontSize), sceneFontSize.value);
  localStorage.setItem(clientStorageKey(storageKeys.scenePadding), scenePadding.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionSize), sceneTransitionSize.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionStyle), sceneTransitionStyle.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionSides), sceneTransitionSides.value);
}

function restoreState() {
  migrateLegacyClientStorage();
  const savedSceneWidth = getClientStoredValue(storageKeys.sceneOutputWidth);
  const savedSceneHeight = getClientStoredValue(storageKeys.sceneBackgroundHeight);
  sceneOutputWidth.value = !savedSceneWidth || savedSceneWidth === "1920" ? sceneCanvasDefaultWidth : savedSceneWidth;
  sceneBackgroundHeight.value = !savedSceneHeight || savedSceneHeight === "1080" ? sceneCanvasDefaultHeight : savedSceneHeight;
  sceneFontSize.value = getClientStoredValue(storageKeys.sceneFontSize) ?? sceneFontSize.value;
  scenePadding.value = getClientStoredValue(storageKeys.scenePadding) ?? scenePadding.value;
  sceneTransitionSize.value = getClientStoredValue(storageKeys.sceneTransitionSize) ?? sceneTransitionSize.value;
  sceneTransitionStyle.value = getClientStoredValue(storageKeys.sceneTransitionStyle) ?? sceneTransitionStyle.value;
  sceneTransitionSides.value = getClientStoredValue(storageKeys.sceneTransitionSides) ?? sceneTransitionSides.value;
  appShell.style.setProperty("--layers-width", `${getSavedLayersWidth()}px`);
  appShell.style.setProperty("--layers-height", `${getSavedLayersHeight()}px`);
  applyLayersDock(getSavedLayersDock());
  document.body.classList.toggle("shortcuts-hidden", getClientStoredValue(storageKeys.shortcutsHidden) === "true");
}

function clientStorageKey(key) {
  return `rollSs.client.${currentUserId}.${key}`;
}

function legacyUserStorageKey(userId, key) {
  return `rollSs.user.${userId}.${key}`;
}

function getLegacyClientIds() {
  const ids = [];
  const activeId = localStorage.getItem(legacyActiveUserKey);
  if (activeId) ids.push(activeId);

  try {
    const users = JSON.parse(localStorage.getItem(legacyUserRegistryKey) || "[]");
    if (Array.isArray(users)) {
      users.forEach((user) => {
        if (user?.id) ids.push(user.id);
      });
    }
  } catch {
    // Legacy profile data is optional.
  }

  ids.push("default");
  return [...new Set(ids.filter(Boolean))];
}

function getLegacyStoredValue(key) {
  for (const userId of getLegacyClientIds()) {
    const value = localStorage.getItem(legacyUserStorageKey(userId, key));
    if (value !== null) return value;
  }
  return null;
}

function getClientStoredValue(key) {
  const currentValue = localStorage.getItem(clientStorageKey(key));
  if (currentValue !== null) return currentValue;
  return getLegacyStoredValue(key);
}

function migrateLegacyClientStorage() {
  Object.values(storageKeys).forEach((key) => {
    if (localStorage.getItem(clientStorageKey(key)) !== null) return;
    const legacyValue = getLegacyStoredValue(key);
    if (legacyValue !== null) localStorage.setItem(clientStorageKey(key), legacyValue);
  });
}

function openSceneDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("roll-ss-editor-scenes", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("states", { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Separate DB from the scene autosave one on purpose - upload history is
// unrelated data (a log of past ImgBB links, kept as a fallback in case
// ImgBB itself goes down) and keeping it isolated means a bug in one never
// risks corrupting or version-migrating the other.
const uploadHistoryLimit = 50;

function openUploadHistoryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("roll-ss-editor-uploads", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("uploads", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Small (~160px-wide) JPEG thumbnail, not the full composite - at up to 50
// stored entries, keeping each one small matters for IndexedDB/quota use.
// JPEG (not PNG) is fine here since the composite is always drawn onto an
// opaque background (sceneCanvasBackground), so there's no transparency to
// preserve, and JPEG compresses a photo-like composite far smaller than PNG.
function createUploadThumbnail(canvas) {
  const scale = Math.min(1, 160 / canvas.width);
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  thumbCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = thumbCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return thumbCanvas.toDataURL("image/jpeg", 0.7);
}

async function recordUploadHistory(entry) {
  try {
    const db = await openUploadHistoryDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await pruneUploadHistory(db);
    db.close();
  } catch {
    // History is a convenience/backup, not core functionality - a failure
    // here (quota, private browsing, etc.) must never break the upload
    // flow itself.
  }
}

function pruneUploadHistory(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("uploads", "readwrite");
    const store = tx.objectStore("uploads");
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result.sort((a, b) => a - b);
      const excess = keys.length - uploadHistoryLimit;
      for (let i = 0; i < excess; i++) store.delete(keys[i]);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function readUploadHistory() {
  return new Promise((resolve, reject) => {
    openUploadHistoryDb().then((db) => {
      const tx = db.transaction("uploads", "readonly");
      const request = tx.objectStore("uploads").getAll();
      request.onsuccess = () => {
        resolve(request.result.sort((a, b) => b.id - a.id));
        db.close();
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    }, reject);
  });
}

async function saveLocalScenesNow() {
  const db = await openSceneDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("states", "readwrite");
    tx.objectStore("states").put({
      userId: currentUserId,
      scenes: JSON.parse(JSON.stringify(scenes)),
      selectedSceneId,
      selectedSceneIds,
      savedAt: Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadLocalScenes() {
  const db = await openSceneDb();
  let record = await readSceneRecord(db, currentUserId);
  // Only true when NEITHER this user's own record NOR a legacy record
  // exists at all - i.e. this browser has genuinely never saved anything
  // here before. Distinct from "record exists but scenes is empty" (user
  // intentionally cleared everything via Sahneleri sil), which must not
  // be treated as first-time and re-seeded.
  let isFirstEverVisit = false;
  if (!record) {
    record = await readLegacySceneRecord(db);
    if (record) {
      scenes.splice(0, scenes.length, ...((record.scenes || [])));
      selectedSceneId = record.selectedSceneId || scenes[0]?.id || "";
      selectedSceneIds = Array.isArray(record.selectedSceneIds) ? record.selectedSceneIds : selectedSceneId ? [selectedSceneId] : [];
      normalizeSceneSelection();
      await saveLocalScenesNow();
      db.close();
      renderScenes();
      return;
    }
    isFirstEverVisit = true;
  }
  db.close();
  scenes.splice(0, scenes.length, ...((record?.scenes || [])));
  selectedSceneId = record?.selectedSceneId || scenes[0]?.id || "";
  selectedSceneIds = Array.isArray(record?.selectedSceneIds) ? record.selectedSceneIds : selectedSceneId ? [selectedSceneId] : [];
  normalizeSceneSelection();
  if (isFirstEverVisit) {
    scenes.splice(0, scenes.length, ...createExampleScenes());
    selectedSceneId = "";
    selectedSceneIds = [];
    scheduleSceneAutosave();
  }
  renderScenes();
}

function readSceneRecord(db, userId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("states", "readonly");
    const request = tx.objectStore("states").get(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readLegacySceneRecord(db) {
  for (const userId of getLegacyClientIds()) {
    const record = await readSceneRecord(db, userId);
    if (record?.scenes?.length) return record;
  }
  return null;
}

function scheduleSceneAutosave() {
  clearTimeout(sceneSaveTimer);
  sceneSaveTimer = window.setTimeout(() => {
    saveLocalScenesNow().catch(() => setSceneStatus(t("status.localSaveFailed")));
  }, 450);
}

function setIconButtonContent(button, icon, label) {
  button.replaceChildren();
  const iconNode = document.createElement("i");
  iconNode.dataset.lucide = icon;
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  button.append(iconNode, labelNode);
  if (window.lucide) window.lucide.createIcons();
}

function switchMode() {
  appShell.classList.add("scene-mode");
  scenePreviewPane.classList.add("active");
  setIconButtonContent(downloadBtn, "download", t("file.downloadPng"));
  appTitle.textContent = t("app.title");
  appSubtitle.textContent = t("app.subtitle");
  document.title = t("app.docTitle");
  renderScenes();
}

async function handleMainDownload() {
  if (downloadBtn.disabled) return;
  downloadBtn.disabled = true;
  downloadBtn.setAttribute("aria-busy", "true");
  try {
    await downloadCompositeScene();
  } catch (error) {
    setSceneStatus(t("status.pngDownloadFailed", { error: error?.message || (getLanguage() === "tr" ? "Bilinmeyen hata." : "Unknown error.") }));
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.removeAttribute("aria-busy");
  }
}

// Writes the composite PNG directly to the OS clipboard - no ImgBB, no
// download, nothing leaves the browser. For pasting straight into another
// app (a chat client, an AI tool, an image editor) without sharing the
// image anywhere first.
async function handleCopyScene() {
  if (copySceneBtn.disabled) return;
  copySceneBtn.disabled = true;
  copySceneBtn.setAttribute("aria-busy", "true");
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      throw new Error(t("error.clipboardImageUnsupported"));
    }
    const canvas = await buildCompositeCanvas();
    const blob = await canvasToPngBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    setSceneStatus(canvas.budgetClamped
      ? t("status.canvasBudgetClamped", { width: canvas.width, height: canvas.height })
      : t("status.sceneCopied"));
  } catch (error) {
    setSceneStatus(t("status.sceneCopyFailed", { error: error?.message || t("error.unknown") }));
  } finally {
    copySceneBtn.disabled = false;
    copySceneBtn.removeAttribute("aria-busy");
  }
}

function closeLayersPanel() {
  sceneLayersPanel.classList.remove("floating", "dockable-panel", "dragging");
  document.body.classList.remove("layers-floating");
  document.body.classList.add("layers-hidden");
  sceneLayersPanel.style.width = "";
  sceneLayersPanel.style.height = "";
  sceneLayersPanel.style.left = "";
  sceneLayersPanel.style.top = "";
}

function showLayersPanel() {
  document.body.classList.remove("layers-hidden");
}

function hideShortcuts() {
  document.body.classList.add("shortcuts-hidden");
  localStorage.setItem(clientStorageKey(storageKeys.shortcutsHidden), "true");
}

function showShortcuts() {
  document.body.classList.remove("shortcuts-hidden");
  localStorage.setItem(clientStorageKey(storageKeys.shortcutsHidden), "false");
}

function closeSceneContextMenu() {
  document.querySelector(".scene-context-menu")?.remove();
  document.removeEventListener("pointerdown", handleSceneContextMenuOutsideClick);
  document.removeEventListener("keydown", handleSceneContextMenuEscape);
}

function handleSceneContextMenuOutsideClick(event) {
  if (!event.target.closest(".scene-context-menu")) closeSceneContextMenu();
}

function handleSceneContextMenuEscape(event) {
  if (event.key === "Escape") closeSceneContextMenu();
}

function showSceneContextMenu(clientX, clientY, scene) {
  closeSceneContextMenu();

  const menu = document.createElement("div");
  menu.className = "menu-dropdown scene-context-menu";

  const addItem = (label, handler, kbd, action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-dropdown-item";
    if (action) button.dataset.action = action;
    button.innerHTML = `<span>${label}</span>${kbd ? `<kbd>${kbd}</kbd>` : ""}`;
    button.addEventListener("click", () => {
      closeSceneContextMenu();
      handler();
    });
    menu.append(button);
  };

  addItem(t("edit.copy"), copySelectedScenes, "Ctrl+C", "copy");
  addItem(t("edit.cut"), cutSelectedScenes, "Ctrl+X", "cut");
  addItem(t("edit.paste"), pasteSceneClipboard, "Ctrl+V", "paste");
  addItem(t("edit.duplicate"), duplicateSelectedScenes, "Ctrl+D", "duplicate");
  addItem(t("edit.delete"), () => {
    const ids = getSceneDeleteTargets();
    if (!ids.length) return;
    if (ids.length === 1) removeScene(ids[0]);
    else removeScenes(ids);
  }, "Del", "delete");
  addItem(t("file.exportRse"), exportSceneProject);
  addItem(t("file.importRse"), () => sceneProjectInput.click());

  // Right-clicking directly on an unlocked image layer also offers its
  // Pozisyon/Filtreler controls inline, so boyut/parlaklik/vs. can be
  // tweaked without opening the layer card in the (possibly far away or
  // hidden) Katman Yoneticisi panel. Gecis efekti is deliberately left out
  // here - its controls call renderScenes() on change, which would tear
  // down this menu's own DOM out from under the user mid-adjustment;
  // Pozisyon/Filtreler only touch the image's live transform/filter style
  // in place, so they're safe inside a transient popup.
  if (scene && scene.type !== "text" && scene.dataUrl && !scene.isLocked) {
    const divider = document.createElement("hr");
    divider.className = "menu-dropdown-divider";
    menu.append(divider);

    const posSection = createLayerSection(`${scene.id}:ctxPos`, t("section.position"), false);
    posSection.body.append(
      createRangeControl(t("control.size"), scene.imageZoom || 100, 5, 1200, 1, (value) => {
        scene.imageZoom = value;
        updateSceneImageTransform(scene);
      }, "maximize-2"),
      createRangeControl(t("control.width"), scene.imageScaleX || 100, 5, 1200, 1, (value) => {
        scene.imageScaleX = value;
        updateSceneImageTransform(scene);
      }, "unfold-horizontal"),
      createRangeControl(t("control.height"), scene.imageScaleY || 100, 5, 1200, 1, (value) => {
        scene.imageScaleY = value;
        updateSceneImageTransform(scene);
      }, "unfold-vertical"),
    );
    menu.append(posSection.el);

    const filterSection = createLayerSection(`${scene.id}:ctxFilter`, t("section.filters"), false);
    filterSection.body.append(
      createRangeControl(t("control.brightness"), scene.filterBrightness ?? sceneImageFilterDefaults.brightness, 70, 145, 1, (value) => {
        scene.filterBrightness = value;
        updateSceneImageTransform(scene);
      }, "sun"),
      createRangeControl(t("control.contrast"), scene.filterContrast ?? sceneImageFilterDefaults.contrast, 70, 150, 1, (value) => {
        scene.filterContrast = value;
        updateSceneImageTransform(scene);
      }, "contrast"),
      createRangeControl(t("control.saturation"), scene.filterSaturate ?? sceneImageFilterDefaults.saturate, 60, 180, 1, (value) => {
        scene.filterSaturate = value;
        updateSceneImageTransform(scene);
      }, "droplets"),
    );
    menu.append(filterSection.el);
  }

  document.body.append(menu);
  menu.style.display = "flex";
  menu.style.position = "fixed";
  menu.style.left = `${clientX}px`;
  menu.style.top = `${clientY}px`;
  refreshEditMenuState();

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = `${Math.max(4, window.innerWidth - rect.width - 8)}px`;
  if (rect.bottom > window.innerHeight) menu.style.top = `${Math.max(4, window.innerHeight - rect.height - 8)}px`;

  document.addEventListener("pointerdown", handleSceneContextMenuOutsideClick);
  document.addEventListener("keydown", handleSceneContextMenuEscape);
}

function startSceneMarqueeSelect(event, stage) {
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  let marqueeEl = null;

  const onMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    if (!marqueeEl) {
      marqueeEl = document.createElement("div");
      marqueeEl.className = "scene-marquee-select";
      document.body.append(marqueeEl);
    }
    const left = Math.min(startX, moveEvent.clientX);
    const top = Math.min(startY, moveEvent.clientY);
    marqueeEl.style.left = `${left}px`;
    marqueeEl.style.top = `${top}px`;
    marqueeEl.style.width = `${Math.abs(dx)}px`;
    marqueeEl.style.height = `${Math.abs(dy)}px`;
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);

    if (!moved) {
      clearSceneSelection();
      return;
    }

    const marqueeRect = marqueeEl.getBoundingClientRect();
    marqueeEl.remove();

    const hitIds = scenes
      .filter((scene) => scene.type === "text" || scene.dataUrl)
      .filter((scene) => {
        const selector = scene.type === "text"
          ? `.scene-text-block[data-scene-id="${CSS.escape(scene.id)}"]`
          : `.scene-image-wrap[data-scene-id="${CSS.escape(scene.id)}"]`;
        const el = stage.querySelector(selector);
        if (!el) return false;
        const elRect = el.getBoundingClientRect();
        return !(
          elRect.right < marqueeRect.left ||
          elRect.left > marqueeRect.right ||
          elRect.bottom < marqueeRect.top ||
          elRect.top > marqueeRect.bottom
        );
      })
      .map((scene) => scene.id);

    hoveredSceneId = "";
    selectedSceneIds = hitIds;
    selectedSceneId = hitIds[0] || "";
    refreshSceneSelection();
    if (hitIds.length) setSceneStatus(t("status.layersSelected", { count: hitIds.length }));
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function startLayerListMarqueeSelect(event, listContainer) {
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  let marqueeEl = null;
  let lastX = startX;
  let lastY = startY;
  let scrollRafId = null;

  const updateMarqueeBox = () => {
    if (!marqueeEl) return;
    const left = Math.min(startX, lastX);
    const top = Math.min(startY, lastY);
    marqueeEl.style.left = `${left}px`;
    marqueeEl.style.top = `${top}px`;
    marqueeEl.style.width = `${Math.abs(lastX - startX)}px`;
    marqueeEl.style.height = `${Math.abs(lastY - startY)}px`;
  };

  const autoScrollStep = () => {
    const rect = listContainer.getBoundingClientRect();
    const edge = 28;
    let delta = 0;
    if (lastY < rect.top + edge) delta = lastY - (rect.top + edge);
    else if (lastY > rect.bottom - edge) delta = lastY - (rect.bottom - edge);
    if (delta !== 0 && moved) {
      listContainer.scrollTop += Math.max(-16, Math.min(16, delta * 0.4));
      updateMarqueeBox();
    }
    scrollRafId = requestAnimationFrame(autoScrollStep);
  };
  scrollRafId = requestAnimationFrame(autoScrollStep);

  const onMove = (moveEvent) => {
    lastX = moveEvent.clientX;
    lastY = moveEvent.clientY;
    const dx = lastX - startX;
    const dy = lastY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    if (!marqueeEl) {
      marqueeEl = document.createElement("div");
      marqueeEl.className = "scene-marquee-select";
      document.body.append(marqueeEl);
    }
    updateMarqueeBox();
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    if (scrollRafId) cancelAnimationFrame(scrollRafId);

    if (!moved) {
      clearSceneSelection();
      return;
    }

    const marqueeRect = marqueeEl.getBoundingClientRect();
    marqueeEl.remove();

    const hitIds = scenes
      .filter((scene) => {
        const cardEl = listContainer.querySelector(`.scene-editor-item[data-scene-editor-id="${CSS.escape(scene.id)}"]`);
        if (!cardEl) return false;
        const cardRect = cardEl.getBoundingClientRect();
        return !(
          cardRect.right < marqueeRect.left ||
          cardRect.left > marqueeRect.right ||
          cardRect.bottom < marqueeRect.top ||
          cardRect.top > marqueeRect.bottom
        );
      })
      .map((scene) => scene.id);

    hoveredSceneId = "";
    selectedSceneIds = hitIds;
    selectedSceneId = hitIds[0] || "";
    refreshSceneSelection();
    if (hitIds.length) setSceneStatus(t("status.layersSelected", { count: hitIds.length }));
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function refreshEditMenuState() {
  const hasTargets = getSceneClipboardTargets().length > 0;
  const hasClipboard = sceneClipboardScenes.length > 0;
  document.querySelectorAll("#copyMenuBtn, .scene-context-menu [data-action='copy']").forEach((el) => { el.disabled = !hasTargets; });
  document.querySelectorAll("#cutMenuBtn, .scene-context-menu [data-action='cut']").forEach((el) => { el.disabled = !hasTargets; });
  document.querySelectorAll("#duplicateMenuBtn, .scene-context-menu [data-action='duplicate']").forEach((el) => { el.disabled = !hasTargets; });
  document.querySelectorAll("#pasteMenuBtn, .scene-context-menu [data-action='paste']").forEach((el) => { el.disabled = !hasClipboard; });
  const deleteTargets = getSceneDeleteTargets().length > 0;
  document.querySelectorAll(".scene-context-menu [data-action='delete']").forEach((el) => { el.disabled = !deleteTargets; });
}

// Which changelog entry the Yardim panel is currently showing (0 = newest,
// appChangelog is already ordered newest-first). Session-only, not saved -
// the panel always reopens on the latest update.
let aboutChangelogPage = 0;

function renderAboutPanel() {
  const versionEl = document.querySelector("#aboutVersion");
  if (versionEl) versionEl.textContent = t("about.version", { version: appVersion });
  const listEl = document.querySelector("#aboutChangelog");
  if (!listEl) return;

  aboutChangelogPage = clampNumber(aboutChangelogPage, 0, appChangelog.length - 1, 0);
  const entry = appChangelog[aboutChangelogPage];

  const pageEl = document.querySelector("#aboutChangelogPage");
  if (pageEl) pageEl.textContent = t("about.pagerPage", { page: aboutChangelogPage + 1, total: appChangelog.length });
  const prevBtn = document.querySelector("#aboutChangelogPrev");
  if (prevBtn) prevBtn.disabled = aboutChangelogPage === 0;
  const nextBtn = document.querySelector("#aboutChangelogNext");
  if (nextBtn) nextBtn.disabled = aboutChangelogPage === appChangelog.length - 1;

  listEl.replaceChildren();
  if (!entry) return;
  const block = document.createElement("div");
  block.className = "about-changelog-entry";
  const heading = document.createElement("div");
  heading.className = "about-changelog-heading";
  heading.innerHTML = `<strong>v${entry.version}</strong><span>${entry.date}</span>`;
  block.append(heading);
  if (entry.title) {
    const title = document.createElement("div");
    title.className = "about-changelog-title";
    title.textContent = entry.title;
    block.append(title);
  }
  const list = document.createElement("ul");
  entry.notes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    list.append(li);
  });
  block.append(list);
  listEl.append(block);
}

// "Fikir" menu: a small, static, hand-picked list of RP scenario prompts
// (see scripts/rp-ideas.js) grouped Legal/Illegal - purely inspirational,
// does not touch scenes/layers at all.
function renderIdeaCategoryOptions() {
  const previousValue = ideaCategorySelect.value;
  ideaCategorySelect.replaceChildren();

  const legalGroup = document.createElement("optgroup");
  legalGroup.label = t("idea.groupLegal");
  const illegalGroup = document.createElement("optgroup");
  illegalGroup.label = t("idea.groupIllegal");

  rpIdeaCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label[getLanguage()] || category.label.tr;
    (category.group === "illegal" ? illegalGroup : legalGroup).append(option);
  });

  ideaCategorySelect.append(legalGroup, illegalGroup);
  if ([...ideaCategorySelect.options].some((option) => option.value === previousValue)) {
    ideaCategorySelect.value = previousValue;
  }
}

function showRandomIdea() {
  const category = rpIdeaCategories.find((entry) => entry.id === ideaCategorySelect.value);
  if (!category || !category.ideas.length) return;
  const idea = category.ideas[Math.floor(Math.random() * category.ideas.length)];
  ideaDisplay.textContent = idea[getLanguage()] || idea.tr;
  ideaDisplay.removeAttribute("data-i18n");
}

function initMenuBar() {
  const menuItems = [...document.querySelectorAll(".menu-item")];

  const closeAllMenus = () => {
    menuItems.forEach((item) => item.classList.remove("open"));
  };

  menuItems.forEach((item) => {
    const trigger = item.querySelector(".menu-trigger");
    const dropdown = item.querySelector(".menu-dropdown");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = item.classList.contains("open");
      closeAllMenus();
      if (!wasOpen) {
        item.classList.add("open");
        // .menu-dropdown is position:fixed (see base.css for why), so its
        // position isn't automatic from the trigger's own layout anymore -
        // compute it here, clamped so a right-edge item's dropdown doesn't
        // run off the viewport.
        const triggerRect = trigger.getBoundingClientRect();
        const maxLeft = Math.max(4, window.innerWidth - dropdown.offsetWidth - 4);
        dropdown.style.top = `${triggerRect.bottom}px`;
        dropdown.style.left = `${Math.min(triggerRect.left, maxLeft)}px`;
        if (item.dataset.menu === "duzen") refreshEditMenuState();
      }
    });
    dropdown.addEventListener("click", (event) => {
      if (event.target.closest(".menu-dropdown-panel")) return;
      closeAllMenus();
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".menu-item")) closeAllMenus();
  });

  document.querySelector("#undoMenuBtn").addEventListener("click", undoSceneHistory);
  document.querySelector("#redoMenuBtn").addEventListener("click", redoSceneHistory);
  document.querySelector("#copyMenuBtn").addEventListener("click", copySelectedScenes);
  document.querySelector("#cutMenuBtn").addEventListener("click", cutSelectedScenes);
  document.querySelector("#pasteMenuBtn").addEventListener("click", pasteSceneClipboard);
  document.querySelector("#duplicateMenuBtn").addEventListener("click", duplicateSelectedScenes);
  document.querySelector("#selectAllMenuBtn").addEventListener("click", selectAllScenes);
  document.querySelector("#toggleLayersMenuBtn").addEventListener("click", () => {
    if (document.body.classList.contains("layers-hidden")) showLayersPanel();
    else closeLayersPanel();
  });
  document.querySelector("#toggleShortcutsMenuBtn").addEventListener("click", () => {
    if (document.body.classList.contains("shortcuts-hidden")) showShortcuts();
    else hideShortcuts();
  });
  document.querySelector("#zoomFitMenuBtn").addEventListener("click", fitSceneToViewport);
  document.querySelector("#zoomInMenuBtn").addEventListener("click", () => {
    setSceneViewportZoom(sceneViewportZoom * 1.18, undefined, undefined);
  });
  document.querySelector("#zoomOutMenuBtn").addEventListener("click", () => {
    setSceneViewportZoom(sceneViewportZoom / 1.18, undefined, undefined);
  });
}

function handleSceneWheel(event) {
  const viewport = event.target.closest?.(".scene-canvas-viewport") || (event.ctrlKey || event.altKey ? document.querySelector(".scene-canvas-viewport") : null);
  if (!viewport) return;

  if (event.ctrlKey || event.altKey) {
    event.preventDefault();
    event.stopPropagation();
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const factor = Math.pow(1.0018, -delta);
    setSceneViewportZoom(sceneViewportZoom * factor, event.clientX, event.clientY);
    return;
  }

  if (event.shiftKey) {
    event.preventDefault();
    event.stopPropagation();
    viewport.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  }
}

function setSceneViewportZoom(nextZoom, focalClientX, focalClientY) {
  const viewport = document.querySelector(".scene-canvas-viewport");
  if (!viewport) return;

  const previousZoom = sceneViewportZoom;
  const rect = viewport.getBoundingClientRect();
  const focalX = Number.isFinite(focalClientX) ? focalClientX - rect.left : viewport.clientWidth / 2;
  const focalY = Number.isFinite(focalClientY) ? focalClientY - rect.top : viewport.clientHeight / 2;
  const contentX = (viewport.scrollLeft + focalX) / previousZoom;
  const contentY = (viewport.scrollTop + focalY) / previousZoom;

  sceneViewportZoom = clampNumber(nextZoom, 0.15, 5, previousZoom);
  applySceneViewportZoom();
  viewport.scrollLeft = Math.max(0, contentX * sceneViewportZoom - focalX);
  viewport.scrollTop = Math.max(0, contentY * sceneViewportZoom - focalY);
}

function applySceneViewportZoom() {
  const stage = document.querySelector(".composite-stage");
  const shell = document.querySelector(".scene-zoom-shell");
  if (!stage || !shell) return;

  const baseWidth = stage.offsetWidth || getScenePreviewWidth();
  const baseHeight = stage.offsetHeight || getScenePreviewHeight();
  shell.style.width = `${Math.ceil(baseWidth * sceneViewportZoom)}px`;
  shell.style.height = `${Math.ceil(baseHeight * sceneViewportZoom)}px`;
  stage.style.transform = `scale(${sceneViewportZoom})`;
  document.querySelectorAll(".zoom-readout").forEach((node) => {
    node.textContent = t("canvas.zoomReadout", { value: Math.round(sceneViewportZoom * 100) });
  });
}

function fitSceneToViewport() {
  const viewport = document.querySelector(".scene-canvas-viewport");
  const stage = document.querySelector(".composite-stage");
  if (!viewport || !stage) return;

  const horizontalFit = (viewport.clientWidth - 96) / Math.max(1, stage.offsetWidth);
  const verticalFit = (viewport.clientHeight - 96) / Math.max(1, stage.offsetHeight);
  setSceneViewportZoom(Math.min(horizontalFit, verticalFit), undefined, undefined);
  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
}

function getSmartGuideLayer(stage) {
  let layer = stage.querySelector(".scene-smart-guides");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "scene-smart-guides";
    stage.append(layer);
  }
  return layer;
}

function clearSmartGuides(stage = document.querySelector(".composite-stage")) {
  stage?.querySelector(".scene-smart-guides")?.replaceChildren();
}

function drawSmartGuides(stage, guides) {
  const layer = getSmartGuideLayer(stage);
  layer.replaceChildren();
  const stageRect = stage.getBoundingClientRect();
  const scaleX = stage.offsetWidth / Math.max(1, stageRect.width);
  const scaleY = stage.offsetHeight / Math.max(1, stageRect.height);

  guides.vertical.forEach((x) => {
    const guide = document.createElement("span");
    guide.className = "smart-guide-line vertical";
    guide.style.left = `${x * scaleX}px`;
    layer.append(guide);
  });

  guides.horizontal.forEach((y) => {
    const guide = document.createElement("span");
    guide.className = "smart-guide-line horizontal";
    guide.style.top = `${y * scaleY}px`;
    layer.append(guide);
  });
}

// Other layers' own edges/centers are valid smart-guide snap targets too
// (Photoshop/Figma-style "align to other objects"), not just the canvas's
// own edges/center. Reads straight from the rendered DOM (covers both
// text and image layers the same way) rather than recomputing each
// layer's box from its own imageX/imageY/x/y math.
function getOtherLayerSnapTargets(stage, excludeSceneId) {
  const stageRect = stage.getBoundingClientRect();
  const xTargets = [];
  const yTargets = [];
  scenes.forEach((scene) => {
    if (scene.id === excludeSceneId) return;
    const el = scene.type === "text"
      ? stage.querySelector(`.scene-text-block[data-scene-id="${CSS.escape(scene.id)}"]`)
      : stage.querySelector(`.scene-image-wrap[data-scene-id="${CSS.escape(scene.id)}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = rect.left - stageRect.left;
    const top = rect.top - stageRect.top;
    xTargets.push(left, left + rect.width / 2, left + rect.width);
    yTargets.push(top, top + rect.height / 2, top + rect.height);
  });
  return { xTargets, yTargets };
}

function snapStageBox(stage, box, { allowX = true, allowY = true, disabled = false, excludeSceneId } = {}) {
  const stageRect = stage.getBoundingClientRect();
  const stageWidth = stageRect.width;
  const stageHeight = stageRect.height;
  const result = {
    deltaX: 0,
    deltaY: 0,
    guides: { vertical: [], horizontal: [] },
  };

  if (disabled) {
    clearSmartGuides(stage);
    return result;
  }

  const otherTargets = excludeSceneId ? getOtherLayerSnapTargets(stage, excludeSceneId) : { xTargets: [], yTargets: [] };

  if (allowX) {
    const xTargets = [0, stageWidth / 2, stageWidth, ...otherTargets.xTargets];
    const xPoints = [box.left, box.left + box.width / 2, box.left + box.width];
    const matches = findSnapMatches(xPoints, xTargets);
    if (matches.length) {
      result.deltaX = matches[0].delta;
      result.guides.vertical.push(...new Set(matches.map((match) => match.target)));
    }
  }

  if (allowY) {
    const yTargets = [0, stageHeight / 2, stageHeight, ...otherTargets.yTargets];
    const yPoints = [box.top, box.top + box.height / 2, box.top + box.height];
    const matches = findSnapMatches(yPoints, yTargets);
    if (matches.length) {
      result.deltaY = matches[0].delta;
      result.guides.horizontal.push(...new Set(matches.map((match) => match.target)));
    }
  }

  drawSmartGuides(stage, result.guides);
  return result;
}

function findSnapMatches(points, targets) {
  const matches = [];
  points.forEach((point) => {
    targets.forEach((target) => {
      const delta = target - point;
      const distance = Math.abs(delta);
      if (distance <= sceneSnapThresholdPx) {
        matches.push({ delta, distance, target });
      }
    });
  });
  matches.sort((a, b) => a.distance - b.distance);
  return matches;
}

function getImageVisualBox(stageRect, scene, visualWidth, visualHeight) {
  const stageWidth = stageRect.width;
  const stageHeight = stageRect.height;
  const baseLeft = ((scene.imageX || 0) / 100) * stageWidth;
  const baseTop = ((scene.imageY || 0) / 100) * stageHeight;
  return {
    left: baseLeft + (stageWidth - visualWidth) / 2,
    top: baseTop + (stageHeight - visualHeight) / 2,
    width: visualWidth,
    height: visualHeight,
  };
}

function handleSceneKeyDown(event) {
  if (!isTextEntryTarget(event.target) && isSceneUndoShortcut(event)) {
    event.preventDefault();
    undoSceneHistory();
    return;
  }

  if (!isTextEntryTarget(event.target) && isSceneRedoShortcut(event)) {
    event.preventDefault();
    redoSceneHistory();
    return;
  }

  if (!isTextEntryTarget(event.target) && isSceneSelectAllShortcut(event)) {
    event.preventDefault();
    selectAllScenes();
    return;
  }

  if (!hasActiveTextSelection(event.target) && isSceneCopyShortcut(event)) {
    event.preventDefault();
    copySelectedScenes();
    return;
  }

  if (!hasActiveTextSelection(event.target) && isSceneCutShortcut(event)) {
    event.preventDefault();
    cutSelectedScenes();
    return;
  }

  if (!isTextEntryTarget(event.target) && isSceneDuplicateShortcut(event)) {
    event.preventDefault();
    duplicateSelectedScenes();
    return;
  }

  if (!isTextEntryTarget(event.target) && isSceneUploadShortcut(event)) {
    event.preventDefault();
    if (!event.repeat) uploadCompositeSceneToImgbb();
    return;
  }

  // Scene-paste used to rely solely on the native browser "paste" DOM
  // event (see handlePaste) - but that event only reliably fires when
  // focus is on a genuinely editable/paste-capable element. After
  // clicking a layer card (a plain, non-focusable div), focus commonly
  // sits on document.body, and Ctrl+V then silently does nothing at all -
  // no error, no native event, nothing - which is exactly what looked
  // like "paste is broken". A keydown handler always fires regardless of
  // focus, so it's the reliable path for scene-paste; handlePaste is now
  // only responsible for OS-clipboard image pastes (which do need the
  // real clipboardData a keydown event can't provide).
  if (!isTextEntryTarget(event.target) && isScenePasteShortcut(event) && sceneClipboardScenes.length) {
    event.preventDefault();
    pasteSceneClipboard();
    return;
  }

  if (isEditableTarget(event.target)) return;

  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    const sceneId = selectedSceneId || hoveredSceneId;
    if (!sceneId) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      reorderScene(sceneId, "up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      reorderScene(sceneId, "down");
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      reorderScene(sceneId, "top");
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      reorderScene(sceneId, "bottom");
      return;
    }
  }

  if (event.key === "Delete" || event.code === "Delete") {
    const sceneIds = getSceneDeleteTargets();
    if (!sceneIds.length) return;
    event.preventDefault();
    if (sceneIds.length === 1) removeScene(sceneIds[0]);
    else removeScenes(sceneIds);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    isSpacePanning = true;
    document.body.classList.add("space-pan-ready");
    return;
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    if (document.body.classList.contains("layers-hidden")) showLayersPanel();
    else closeLayersPanel();
    return;
  }

  if (!(event.ctrlKey || event.metaKey)) return;

  if (event.key === "0") {
    event.preventDefault();
    fitSceneToViewport();
  } else if (event.key === "1") {
    event.preventDefault();
    setSceneViewportZoom(1, undefined, undefined);
  } else if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    setSceneViewportZoom(sceneViewportZoom * 1.18, undefined, undefined);
  } else if (event.key === "-") {
    event.preventDefault();
    setSceneViewportZoom(sceneViewportZoom / 1.18, undefined, undefined);
  }
}

function handleSceneKeyUp(event) {
  if (event.code !== "Space") return;
  isSpacePanning = false;
  document.body.classList.remove("space-pan-ready");
}

function startSceneViewportPan(event) {
  if (!isSpacePanning || event.button !== 0) return;
  const viewport = event.target.closest?.(".scene-canvas-viewport");
  if (!viewport) return;

  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = viewport.scrollLeft;
  const startTop = viewport.scrollTop;
  document.body.classList.add("space-panning");

  const onMove = (moveEvent) => {
    viewport.scrollLeft = startLeft - (moveEvent.clientX - startX);
    viewport.scrollTop = startTop - (moveEvent.clientY - startY);
  };

  const onUp = () => {
    document.body.classList.remove("space-panning");
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function isEditableTarget(target) {
  return target?.closest?.("input, textarea, select, button");
}

function isTextEntryTarget(target) {
  return target?.closest?.("input, textarea, select, [contenteditable='true']");
}

// Copy/Cut/Paste defer to the browser's native text copy/paste whenever an
// editable field is focused - but a field can stay focused (stale DOM focus
// left over from an earlier click) with nothing actually selected in it.
// Gating purely on "is *something* editable focused" then silently
// swallows Ctrl+C/Ctrl+V for the just-multi-selected layers with zero
// feedback, and the layer clipboard is left holding stale content from
// the last copy that actually went through. Checking for a real,
// non-empty text selection is what native copy/paste actually needs -
// if there's nothing selected, there's nothing for native copy to grab,
// so it's always safe to let the app-level scene copy/paste run instead.
function hasActiveTextSelection(target) {
  const field = target?.closest?.("input, textarea");
  if (field && typeof field.selectionStart === "number" && typeof field.selectionEnd === "number") {
    return field.selectionStart !== field.selectionEnd;
  }
  const selection = window.getSelection?.();
  return !!selection && selection.toString().length > 0;
}

async function addSceneImages(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) {
    setSceneStatus(t("status.noImageSelected"));
    return;
  }

  const wasEmpty = scenes.length === 0;
  // Captured before any new scenes are added, so a multi-file paste/add
  // always matches the pre-existing reference image, not a sibling from
  // this same batch.
  const cetvelReference = cetvelEnabled ? findCetvelReferenceScene() : null;
  pushSceneHistory();
  const newScenes = [];
  for (const file of imageFiles) {
    const dataUrl = await readFileAsDataUrl(file);
    const scene = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: file.name,
      dataUrl,
      isBlank: false,
      imageZoom: 100,
      imageScaleX: 100,
      imageScaleY: 100,
      imageX: 0,
      imageY: 0,
      filterBrightness: sceneImageFilterDefaults.brightness,
      filterContrast: sceneImageFilterDefaults.contrast,
      filterSaturate: sceneImageFilterDefaults.saturate,
      filterSepia: sceneImageFilterDefaults.sepia,
      filterBlur: sceneImageFilterDefaults.blur,
      blocks: [],
    };
    if (cetvelReference) {
      try {
        const image = await loadImage(dataUrl);
        Object.assign(scene, computeCetvelImagePlacement(cetvelReference, image.naturalWidth, image.naturalHeight));
      } catch {
        // Couldn't decode dimensions in time - leave the image at its
        // normal default size/position rather than failing the whole add.
      }
    }
    newScenes.push(scene);
  }
  scenes.unshift(...newScenes);
  selectedSceneIds = newScenes.map((scene) => scene.id);
  selectedSceneId = selectedSceneIds[0] || "";
  hoveredSceneId = "";
  newScenes.forEach((scene) => expandedLayerIds.add(scene.id));

  if (wasEmpty) shouldAutoFitSceneViewport = true;
  renderScenes();
  setSceneStatus(t("status.imagesAdded", { count: imageFiles.length }));
  sceneImageInput.value = "";
  switchMode();
}

function addBlankScene() {
  pushSceneHistory();
  const scene = {
    id: createId(),
    name: t("layer.defaultBlankSceneName", { n: scenes.length + 1 }),
    dataUrl: "",
    isBlank: true,
    imageZoom: 100,
    imageScaleX: 100,
    imageScaleY: 100,
    imageX: 0,
    imageY: 0,
    filterBrightness: sceneImageFilterDefaults.brightness,
    filterContrast: sceneImageFilterDefaults.contrast,
    filterSaturate: sceneImageFilterDefaults.saturate,
    filterSepia: sceneImageFilterDefaults.sepia,
    filterBlur: sceneImageFilterDefaults.blur,
    blocks: [],
  };
  scenes.unshift(scene);
  selectedSceneId = scene.id;
  selectedSceneIds = [scene.id];
  hoveredSceneId = "";
  expandedLayerIds.add(scene.id);
  shouldAutoFitSceneViewport = true;
  renderScenes();
  switchMode();
  setSceneStatus(t("status.blankSceneAdded"));
}

function addSceneImageBlobs(blobs) {
  const files = blobs.map((blob, index) => new File([blob], `pasted-scene-${Date.now()}-${index + 1}.png`, { type: blob.type || "image/png" }));
  return addSceneImages(files);
}

function handlePaste(event) {
  // Scene-clipboard pasting (Ctrl+V for copied layers) is handled by the
  // keydown-level isScenePasteShortcut branch in handleSceneKeyDown, which
  // fires reliably regardless of what has focus - unlike this native
  // "paste" DOM event, which only fires in certain focus states, and which
  // that branch's preventDefault() suppresses entirely whenever there's a
  // copied layer to paste (see its comment). This handler covers what's
  // left: pasting an actual image from the OS clipboard (e.g. a
  // screenshot), and pasting plain text with nothing focused to receive
  // it - both need the real clipboardData a keydown event can't provide.
  // Pasted layers land at the FRONT of the list/stack (layer #1), same as
  // the explicit "Yazi ekle"/"Resim ekle" buttons - a brief experiment with
  // sending pasted layers to the back instead just meant they'd land
  // underneath everything and be hard to find.
  const imageItems = [...(event.clipboardData?.items || [])].filter((item) => item.type.startsWith("image/"));
  const blobs = imageItems.map((item) => item.getAsFile()).filter(Boolean);
  if (blobs.length) {
    event.preventDefault();
    addSceneImageBlobs(blobs);
    return;
  }

  // No image on the clipboard and no real text field focused (renaming a
  // layer, editing a text layer's textarea, the inline canvas editor) -
  // treat a plain-text paste as "make this a new text layer", the same
  // way pasting an image makes a new image layer.
  if (isEditableTarget(event.target)) return;
  const text = event.clipboardData?.getData("text/plain");
  if (!text) return;

  event.preventDefault();
  addTextLayer(text);
}

function renderScenes() {
  sceneList.replaceChildren();
  sceneLayersPanel.replaceChildren();

  ensureSceneModel();
  normalizeSceneSelection();

  const composer = document.createElement("article");
  composer.className = "scene-composer";

  const toolbar = document.createElement("div");
  toolbar.className = "composite-toolbar";

  const title = document.createElement("div");
  title.className = "scene-title";
  title.textContent = scenes.length ? t("canvas.summaryMulti", { count: scenes.length }) : t("canvas.summaryEmpty");

  const zoomReadout = document.createElement("div");
  zoomReadout.className = "zoom-readout";
  zoomReadout.textContent = t("canvas.zoomReadout", { value: Math.round(sceneViewportZoom * 100) });

  toolbar.append(title, zoomReadout);

  const stage = document.createElement("div");
  stage.className = "composite-stage";
  stage.style.width = `${getScenePreviewWidth()}px`;
  stage.style.height = `${getScenePreviewHeight()}px`;
  stage.style.setProperty("--scene-padding", `${getScenePadding()}px`);
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isSpacePanning) return;
    if (event.target !== stage && !event.target.classList.contains("stage-render-clip") && !event.target.classList.contains("stage-resize-frame")) return;
    hoveredSceneId = "";
    startSceneMarqueeSelect(event, stage);
  });

  const renderClip = document.createElement("div");
  renderClip.className = "stage-render-clip";
  const transformOverlay = document.createElement("div");
  transformOverlay.className = "stage-transform-overlay";
  const textOverlay = document.createElement("div");
  textOverlay.className = "stage-text-overlay";
  stage.append(renderClip, transformOverlay, textOverlay);

  scenes.forEach((scene, index) => {
    if (scene.type === "text") {
      const block = document.createElement("div");
      block.className = "scene-text-block";
      block.dataset.sceneId = scene.id;
      block.dataset.textStyle = scene.textStyle || "box";
      if (isSceneSelected(scene.id)) block.classList.add("selected");
      if (scene.isLocked) block.classList.add("locked");
      block.style.zIndex = String(getSceneLayerZIndex(index, 5));
      block.style.fontSize = `${scene.fontSize || getSceneFontSize()}px`;
      block.style.letterSpacing = `${scene.letterSpacing || 0}px`;
      block.style.lineHeight = String(scene.lineHeight || 1.18);
      block.style.left = `${scene.x}%`;
      block.style.top = `${scene.y}%`;
      block.style.width = `${scene.width}%`;
      block.title = scene.isLocked ? t("canvas.blockLocked") : t("canvas.blockDrag");
      const content = document.createElement("div");
      content.className = "scene-text-content";
      renderSceneTextBlock(content, scene.text);
      block.append(content);
      block.addEventListener("pointerdown", (event) => startSceneTextDrag(event, scene));
      block.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        event.preventDefault();
        startInlineSceneTextEdit(scene, block, content);
      });
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "scene-resize-handle";
      resizeHandle.title = t("canvas.resizeWidthOnly");
      resizeHandle.addEventListener("pointerdown", (event) => startSceneTextResize(event, scene));
      block.append(resizeHandle);
      textOverlay.append(block);
      return;
    }
    if (!scene.dataUrl) return;
    const wrap = document.createElement("div");
    wrap.className = "scene-image-wrap";
    wrap.dataset.sceneId = scene.id;
    wrap.style.zIndex = String(getSceneLayerZIndex(index, 1));
    applySceneLayerPosition(wrap, scene);
    if (isSceneSelected(scene.id)) wrap.classList.add("selected");
    wrap.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      setSelectedScene(scene.id);
    });
    wrap.addEventListener("pointerenter", () => {
      hoveredSceneId = scene.id;
    });
    wrap.addEventListener("pointerleave", () => {
      if (hoveredSceneId === scene.id) hoveredSceneId = "";
    });
    const image = document.createElement("img");
    image.src = scene.dataUrl;
    image.alt = scene.name;
    image.dataset.sceneImageId = scene.id;
    image.style.transform = getSceneImageTransform(scene);
    image.style.filter = getSceneImageFilter(scene);
    image.addEventListener("load", () => applySceneViewportZoom());
    wrap.append(image);

    // Apply Transition Effects in HTML Preview
    const transStyle = scene.transitionStyle || "none";
    const transSize = scene.transitionStyle === "none" ? 0 : (scene.transitionSize ?? 150);
    const transSides = scene.transitionSides || "both";

    if (transStyle !== "none" && transSize > 0) {
      if (transStyle === "soft") {
        let mask = "";
        if (transSides === "both") {
          mask = `linear-gradient(to bottom, transparent 0px, black ${transSize}px, black calc(100% - ${transSize}px), transparent 100%)`;
        } else if (transSides === "top") {
          mask = `linear-gradient(to bottom, transparent 0px, black ${transSize}px)`;
        } else if (transSides === "bottom") {
          mask = `linear-gradient(to top, transparent 0px, black ${transSize}px)`;
        }
        image.style.webkitMaskImage = mask;
        image.style.maskImage = mask;
      } else if (transStyle === "cinematic") {
        if (transSides === "both" || transSides === "top") {
          const topOverlay = document.createElement("div");
          topOverlay.className = "scene-transition-overlay cinematic-top";
          topOverlay.style.height = `${transSize}px`;
          wrap.append(topOverlay);
        }
        if (transSides === "both" || transSides === "bottom") {
          const bottomOverlay = document.createElement("div");
          bottomOverlay.className = "scene-transition-overlay cinematic-bottom";
          bottomOverlay.style.height = `${transSize}px`;
          wrap.append(bottomOverlay);
        }
      } else if (transStyle === "blur") {
        const blurImg = image.cloneNode(true);
        blurImg.style.filter = (image.style.filter || "") + " blur(15px)";
        blurImg.style.position = "absolute";
        blurImg.style.top = "0";
        blurImg.style.left = "0";
        blurImg.style.width = "100%";
        blurImg.style.height = "100%";
        blurImg.style.zIndex = "1";
        blurImg.style.pointerEvents = "none";
        
        let mask = "";
        if (transSides === "both") {
          mask = `linear-gradient(to bottom, black 0px, transparent ${transSize}px, transparent calc(100% - ${transSize}px), black 100%)`;
        } else if (transSides === "top") {
          mask = `linear-gradient(to bottom, black 0px, transparent ${transSize}px)`;
        } else if (transSides === "bottom") {
          mask = `linear-gradient(to top, black 0px, transparent ${transSize}px)`;
        }
        blurImg.style.webkitMaskImage = mask;
        blurImg.style.maskImage = mask;
        wrap.append(blurImg);
      }
    }

    if (!scene.isLocked) {
      const transformBox = createSceneImageTransformBox(scene);
      // Offset 2: just above this scene's own image content (offset 1) so
      // its drag/resize handles are grabbable, but still inside this
      // scene's own 10-wide z-index band so a layer correctly in front of
      // it (lower index) keeps winning the hit-test, matching layer order.
      transformBox.style.zIndex = String(getSceneLayerZIndex(index, 2));
      applySceneLayerPosition(transformBox, scene);
      transformOverlay.append(transformBox);
    }
    renderClip.append(wrap);
  });

  stage.append(createStageResizeFrame());

  const canvasViewport = document.createElement("div");
  canvasViewport.className = "scene-canvas-viewport";
  canvasViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isSpacePanning) return;
    if (isNearLayersPanelResizeEdge(event)) return;
    if (event.target === canvasViewport || event.target === zoomShell) {
      hoveredSceneId = "";
      startSceneMarqueeSelect(event, stage);
    }
  });
  canvasViewport.addEventListener("contextmenu", (event) => {
    // Scoped to canvasViewport already (menu bar/layers panel are outside
    // it), so no need to also require the click to land on .composite-stage
    // itself - right-clicking the empty space around the canvas should
    // open the same menu, matching how left-click marquee-select already
    // works both on and around the stage.
    event.preventDefault();
    const sceneEl = event.target.closest("[data-scene-id]");
    if (sceneEl && !isSceneSelected(sceneEl.dataset.sceneId)) {
      setSelectedScene(sceneEl.dataset.sceneId);
    }
    const targetScene = sceneEl ? scenes.find((scene) => scene.id === sceneEl.dataset.sceneId) : null;
    showSceneContextMenu(event.clientX, event.clientY, targetScene);
  });
  const zoomShell = document.createElement("div");
  zoomShell.className = "scene-zoom-shell";
  zoomShell.append(stage);
  canvasViewport.append(zoomShell);

  const listContainer = document.createElement("div");
  listContainer.className = "scene-editor-list-container";
  listContainer.addEventListener("pointerdown", (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.target.closest(".scene-editor-item")) return;
    if (isNearLayersPanelResizeEdge(event)) return;
    startLayerListMarqueeSelect(event, listContainer);
  });

  const layersTitle = document.createElement("div");
  layersTitle.className = "layers-title panel-drag-handle";
  layersTitle.title = t("layer.dragMove");
  const layersTitleText = document.createElement("span");
  layersTitleText.textContent = t("layer.managerTitle");
  const addTextLayerButton = document.createElement("button");
  addTextLayerButton.className = "layer-window-button accent";
  addTextLayerButton.type = "button";
  addTextLayerButton.innerHTML = `<i data-lucide="type"></i><span></span>`;
  addTextLayerButton.querySelector("span").textContent = t("layer.addTextShort");
  addTextLayerButton.title = t("layer.addText");
  addTextLayerButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  addTextLayerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    addTextLayer();
  });
  const layersCloseButton = document.createElement("button");
  layersCloseButton.className = "layer-window-button";
  layersCloseButton.type = "button";
  layersCloseButton.innerHTML = `<i data-lucide="x"></i>`;
  layersCloseButton.title = t("layer.closeManager");
  layersCloseButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  layersCloseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLayersPanel();
  });
  layersTitle.append(layersTitleText, addTextLayerButton, layersCloseButton);
  sceneLayersPanel.append(layersTitle);

  if (!scenes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-layers";
    empty.textContent = t("layer.emptyCanvas");
    listContainer.append(empty);
  }

  scenes.forEach((scene, index) => {
    listContainer.append(createLayerCard(scene, index, stage, listContainer));
  });

  sceneLayersPanel.append(listContainer);
  sceneLayersPanel.append(...createPanelResizeHandles());

  composer.append(toolbar, canvasViewport);
  sceneList.append(composer);
  scheduleSceneAutosave();
  if (window.lucide) window.lucide.createIcons();
  requestAnimationFrame(() => {
    applySceneViewportZoom();
    if (shouldAutoFitSceneViewport) {
      fitSceneToViewport();
      shouldAutoFitSceneViewport = false;
    }
  });
}

// ══════════════════════════════════════════════════════════════════════
// Katman Yoneticisi (Layer Manager) card components
//
// Each function below builds one self-contained piece of a layer card and
// returns a DOM node (or, for body content, an array of nodes to append).
// createLayerCard() is the only entry point renderScenes() calls; everything
// else composes underneath it. To change one part of a card (e.g. the
// thumbnail, or what image layers show when expanded) find the matching
// function here rather than hunting through a single giant render loop.
// ══════════════════════════════════════════════════════════════════════

function createLayerCard(scene, index, stage, listContainer) {
  const isExpanded = expandedLayerIds.has(scene.id);

  const item = document.createElement("div");
  item.className = "scene-editor-item" + (scene.type === "text" ? " text-layer" : "") + (isExpanded ? " expanded" : "");
  item.dataset.sceneEditorId = scene.id;
  if (isSceneSelected(scene.id)) item.classList.add("selected");
  item.style.setProperty("--scene-accent", getSceneAccent(scene.id));
  item.addEventListener("pointerdown", (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.shiftKey) selectSceneRange(scene.id);
    else if (event.ctrlKey || event.metaKey) toggleSceneSelection(scene.id);
    else setSelectedScene(scene.id);
  });

  const cardInner = document.createElement("div");
  cardInner.className = "layer-card-inner";
  cardInner.append(createLayerCardHeader(scene, index, isExpanded));
  cardInner.append(isExpanded ? createLayerOrderRow(scene, index) : createLayerPreviewLine(scene));
  if (isExpanded) cardInner.append(createLayerCardBody(scene, stage));

  item.append(createLayerDragGrip(scene, listContainer), cardInner);
  return item;
}

function createLayerDragGrip(scene, listContainer) {
  const dragGrip = document.createElement("div");
  dragGrip.className = "layer-drag-grip";
  dragGrip.title = t("layer.dragReorder");
  dragGrip.innerHTML = `<svg width="6" height="20" viewBox="0 0 6 20" fill="currentColor"><circle cx="1.5" cy="2" r="1.2"/><circle cx="4.5" cy="2" r="1.2"/><circle cx="1.5" cy="6" r="1.2"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="1.5" cy="10" r="1.2"/><circle cx="4.5" cy="10" r="1.2"/><circle cx="1.5" cy="14" r="1.2"/><circle cx="4.5" cy="14" r="1.2"/><circle cx="1.5" cy="18" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/></svg>`;
  dragGrip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    startLayerDragReorder(event, scene, listContainer);
  });
  return dragGrip;
}

function createLayerCardHeader(scene, index, isExpanded) {
  const itemHeader = document.createElement("div");
  itemHeader.className = "scene-editor-header";

  const headerLeft = document.createElement("div");
  headerLeft.className = "layer-header-left";

  const layerNumber = document.createElement("span");
  layerNumber.className = "layer-number";
  layerNumber.textContent = `${index + 1}`;

  headerLeft.append(layerNumber, createLayerThumb(scene), createLayerNameInput(scene, index));
  itemHeader.append(headerLeft, createLayerHeaderActions(scene, isExpanded));
  return itemHeader;
}

function createLayerThumb(scene) {
  const layerThumb = document.createElement(scene.type === "text" ? "span" : "img");
  if (scene.type === "text") {
    layerThumb.className = "layer-type-badge";
    layerThumb.textContent = t("layer.textBadge");
    layerThumb.title = t("layer.textBadgeTitle");
  } else {
    layerThumb.className = "layer-thumb";
    if (scene.dataUrl) layerThumb.src = scene.dataUrl;
    layerThumb.alt = "";
    layerThumb.draggable = false;
    layerThumb.title = t("layer.imageBadgeTitle");
  }
  return layerThumb;
}

function createLayerNameInput(scene, index) {
  const nameInput = document.createElement("input");
  nameInput.className = "scene-name-input";
  nameInput.type = "text";
  nameInput.value = scene.name || t("layer.defaultName", { n: index + 1 });
  nameInput.placeholder = t("layer.namePlaceholder");
  nameInput.title = scene.isLocked ? t("layer.nameLockedTitle") : t("layer.nameTitle");
  nameInput.disabled = scene.isLocked;
  prepareSceneHistoryControl(nameInput);
  nameInput.addEventListener("input", () => {
    scene.name = nameInput.value.trim() || t("layer.defaultName", { n: index + 1 });
    const image = document.querySelector(`[data-scene-image-id="${CSS.escape(scene.id)}"]`);
    if (image) image.alt = scene.name;
    scheduleSceneAutosave();
  });
  return nameInput;
}

function createLayerHeaderActions(scene, isExpanded) {
  const headerRight = document.createElement("div");
  headerRight.className = "layer-header-actions";

  const expandButton = document.createElement("button");
  expandButton.type = "button";
  expandButton.className = "layer-icon-btn layer-expand-btn" + (isExpanded ? " active" : "");
  expandButton.innerHTML = isExpanded ? `<i data-lucide="chevron-down"></i>` : `<i data-lucide="chevron-right"></i>`;
  expandButton.title = isExpanded ? t("layer.collapse") : t("layer.expand");
  expandButton.addEventListener("click", () => {
    if (expandedLayerIds.has(scene.id)) expandedLayerIds.delete(scene.id);
    else expandedLayerIds.add(scene.id);
    renderScenes();
  });

  const lockButton = document.createElement("button");
  lockButton.type = "button";
  lockButton.className = "layer-icon-btn" + (scene.isLocked ? " active" : "");
  lockButton.innerHTML = scene.isLocked ? `<i data-lucide="lock"></i>` : `<i data-lucide="lock-open"></i>`;
  lockButton.title = scene.isLocked ? t("layer.unlock") : t("layer.lock");
  lockButton.addEventListener("click", () => {
    pushSceneHistory();
    scene.isLocked = !scene.isLocked;
    renderScenes();
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "layer-icon-btn danger";
  removeButton.innerHTML = `<i data-lucide="trash-2"></i>`;
  removeButton.disabled = scene.isLocked;
  removeButton.title = scene.isLocked ? t("layer.removeLockedTitle") : t("layer.removeTitle");
  removeButton.addEventListener("click", () => {
    if (scene.isLocked) return;
    removeScene(scene.id);
  });

  headerRight.append(expandButton, lockButton, removeButton);
  return headerRight;
}

function createLayerPreviewLine(scene) {
  const previewLine = document.createElement("div");
  previewLine.className = "layer-preview-line";
  if (scene.type === "text") {
    const trimmed = (scene.text || "").trim();
    if (trimmed) {
      previewLine.textContent = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
    } else {
      previewLine.textContent = t("layer.emptyTextPreview");
      previewLine.classList.add("empty");
    }
  } else if (scene.dataUrl) {
    previewLine.textContent = t("layer.sizePreview", { value: scene.imageZoom || 100 });
  } else {
    previewLine.textContent = t("layer.emptyLayerPreview");
    previewLine.classList.add("empty");
  }
  return previewLine;
}

function createLayerOrderRow(scene, index) {
  const orderRow = document.createElement("div");
  orderRow.className = "layer-order-row";
  orderRow.append(
    createSceneOrderButton(t("layer.orderTop"), "chevrons-up", scene.id, "top", index === 0),
    createSceneOrderButton(t("layer.orderUp"), "chevron-up", scene.id, "up", index === 0),
    createSceneOrderButton(t("layer.orderDown"), "chevron-down", scene.id, "down", index === scenes.length - 1),
    createSceneOrderButton(t("layer.orderBottom"), "chevrons-down", scene.id, "bottom", index === scenes.length - 1),
  );
  return orderRow;
}

function createLayerCardBody(scene, stage) {
  const scrollableBody = document.createElement("div");
  scrollableBody.className = "scene-editor-item-scrollable";
  if (scene.type === "text") {
    scrollableBody.append(...createTextLayerControls(scene, stage));
  } else if (scene.dataUrl) {
    scrollableBody.append(...createImageLayerControls(scene));
  } else {
    const blankNote = document.createElement("div");
    blankNote.className = "blank-layer-note";
    blankNote.textContent = t("layer.blankNote");
    scrollableBody.append(blankNote);
  }
  if (scene.isLocked) {
    scrollableBody.classList.add("locked-controls");
    scrollableBody.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = true;
    });
  }
  return scrollableBody;
}

function createTextLayerControls(scene, stage) {
  const textControls = document.createElement("div");
  textControls.className = "block-editor-header";

  const fontInput = document.createElement("input");
  fontInput.className = "block-font-input";
  fontInput.type = "text";
  fontInput.inputMode = "numeric";
  fontInput.value = scene.fontSize || getSceneFontSize();
  fontInput.title = t("layer.fontSizeTitle");
  prepareSceneHistoryControl(fontInput);
  const applyLiveFontSize = (target, liveValue) => {
    target.fontSize = liveValue;
    const block = stage.querySelector(`.scene-text-block[data-scene-id="${CSS.escape(target.id)}"]`);
    if (block) block.style.fontSize = `${liveValue}px`;
  };
  fontInput.addEventListener("input", () => {
    const val = parseInt(fontInput.value, 10);
    if (!isNaN(val) && val > 0) {
      // Don't clamp to the min mid-typing (e.g. typing "24" passes through
      // "2", which is below the min) - that causes a jarring jump to the
      // clamped floor before the real value lands. The max is still capped
      // live so a stray extra digit can't blow up the preview to an absurd
      // size; the "change" handler below enforces the full 10-48 range once
      // typing is done.
      const liveValue = Math.min(48, val);
      applyLiveFontSize(scene, liveValue);
      applyToSelectedSiblings(scene, (other) => applyLiveFontSize(other, liveValue));
    }
  });
  fontInput.addEventListener("change", () => {
    scene.fontSize = clampNumber(fontInput.value, 10, 48, getSceneFontSize());
    fontInput.value = scene.fontSize;
    rememberTextLayerDefaults(scene);
    applyToSelectedSiblings(scene, (other) => { other.fontSize = scene.fontSize; });
    saveState();
    renderScenes();
  });

  const styleSelect = document.createElement("select");
  styleSelect.title = t("layer.styleTitle");
  styleSelect.innerHTML = `
    <option value="box">${t("textStyle.box")}</option>
    <option value="soft">${t("textStyle.soft")}</option>
    <option value="outline">${t("textStyle.outline")}</option>
    <option value="plain">${t("textStyle.plain")}</option>
    <option value="boxSoft">${t("textStyle.boxSoft")}</option>
    <option value="outlineThick">${t("textStyle.outlineThick")}</option>
    <option value="neon">${t("textStyle.neon")}</option>
  `;
  styleSelect.value = scene.textStyle || "box";
  prepareSceneHistoryControl(styleSelect);
  styleSelect.addEventListener("change", () => {
    const applyStyle = (target) => {
      target.textStyle = styleSelect.value;
      const block = stage.querySelector(`.scene-text-block[data-scene-id="${CSS.escape(target.id)}"]`);
      if (block) block.dataset.textStyle = target.textStyle;
    };
    applyStyle(scene);
    applyToSelectedSiblings(scene, applyStyle);
    rememberTextLayerDefaults(scene);
  });

  textControls.append(fontInput, styleSelect);

  const spacingControls = document.createElement("div");
  spacingControls.className = "block-editor-spacing";
  spacingControls.append(
    createRangeControl(t("control.letterSpacing"), scene.letterSpacing || 0, -5, 20, 1, (value) => {
      withSelectedSiblings(scene, "letterSpacing", updateSceneTextStyle)(value);
      rememberTextLayerDefaults(scene);
    }, "move-horizontal"),
    createRangeControl(t("control.lineHeight"), scene.lineHeight ?? 1.18, 0.8, 2.5, 0.05, (value) => {
      withSelectedSiblings(scene, "lineHeight", updateSceneTextStyle)(value);
      rememberTextLayerDefaults(scene);
    }, "move-vertical"),
  );

  const textarea = document.createElement("textarea");
  textarea.className = "scene-text";
  textarea.placeholder = t("layer.textPlaceholder");
  textarea.spellcheck = false;
  textarea.value = scene.text;
  prepareSceneHistoryControl(textarea);
  textarea.addEventListener("input", () => {
    scene.text = textarea.value;
    const block = stage.querySelector(`.scene-text-block[data-scene-id="${CSS.escape(scene.id)}"]`);
    const content = block?.querySelector(".scene-text-content");
    if (content) renderSceneTextBlock(content, scene.text);
  });

  return [textControls, spacingControls, textarea];
}

function updateSceneTextStyle(scene) {
  const block = document.querySelector(`.scene-text-block[data-scene-id="${CSS.escape(scene.id)}"]`);
  if (!block) return;
  block.style.letterSpacing = `${scene.letterSpacing || 0}px`;
  block.style.lineHeight = String(scene.lineHeight || 1.18);
  scheduleSceneAutosave();
}

// When 2+ layers are selected, a change made through one layer's card (zoom,
// filters, transition, font size, text style, spacing...) applies to every
// other selected layer of the SAME type too, not just the one being edited -
// so resizing/restyling a multi-selection works the same way group-dragging
// already does for position. Locked siblings and the edited layer itself
// are skipped; a text control never touches an image layer or vice versa.
function applyToSelectedSiblings(scene, updater) {
  if (selectedSceneIds.length < 2 || !selectedSceneIds.includes(scene.id)) return;
  const isText = scene.type === "text";
  scenes.forEach((other) => {
    if (other.id === scene.id || other.isLocked || !selectedSceneIds.includes(other.id)) return;
    const otherIsText = other.type === "text";
    if (otherIsText !== isText) return;
    if (!isText && !other.dataUrl) return;
    updater(other);
  });
}

// Wraps the common "set scene[prop], live-update the DOM, sync it to the
// rest of the selection" sequence so each control below stays one line.
function withSelectedSiblings(scene, propName, liveUpdateFn) {
  return (value) => {
    scene[propName] = value;
    liveUpdateFn(scene);
    applyToSelectedSiblings(scene, (other) => {
      other[propName] = value;
      liveUpdateFn(other);
    });
  };
}

function createImageLayerControls(scene) {
  const nodes = [];

  const posSection = createLayerSection(`${scene.id}:pos`, t("section.position"), false);
  posSection.body.append(
    createRangeControl(t("control.size"), scene.imageZoom || 100, 5, 1200, 1,
      withSelectedSiblings(scene, "imageZoom", updateSceneImageTransform), "maximize-2"),
    createRangeControl(t("control.width"), scene.imageScaleX || 100, 5, 1200, 1,
      withSelectedSiblings(scene, "imageScaleX", updateSceneImageTransform), "unfold-horizontal"),
    createRangeControl(t("control.height"), scene.imageScaleY || 100, 5, 1200, 1,
      withSelectedSiblings(scene, "imageScaleY", updateSceneImageTransform), "unfold-vertical"),
    createRangeControl(t("control.x"), scene.imageX || 0, -1000, 1000, 0.5,
      withSelectedSiblings(scene, "imageX", updateSceneImageTransform), "move-horizontal"),
    createRangeControl(t("control.y"), scene.imageY || 0, -1000, 1000, 0.5,
      withSelectedSiblings(scene, "imageY", updateSceneImageTransform), "move-vertical"),
  );
  nodes.push(posSection.el);

  const filterSection = createLayerSection(`${scene.id}:filter`, t("section.filters"), false);
  filterSection.body.append(
    createRangeControl(t("control.brightness"), scene.filterBrightness ?? sceneImageFilterDefaults.brightness, 70, 145, 1,
      withSelectedSiblings(scene, "filterBrightness", updateSceneImageTransform), "sun"),
    createRangeControl(t("control.contrast"), scene.filterContrast ?? sceneImageFilterDefaults.contrast, 70, 150, 1,
      withSelectedSiblings(scene, "filterContrast", updateSceneImageTransform), "contrast"),
    createRangeControl(t("control.saturation"), scene.filterSaturate ?? sceneImageFilterDefaults.saturate, 60, 180, 1,
      withSelectedSiblings(scene, "filterSaturate", updateSceneImageTransform), "droplets"),
    createRangeControl(t("control.warmth"), scene.filterSepia ?? sceneImageFilterDefaults.sepia, 0, 18, 1,
      withSelectedSiblings(scene, "filterSepia", updateSceneImageTransform), "thermometer"),
    createRangeControl(t("control.blur"), scene.filterBlur ?? sceneImageFilterDefaults.blur, 0, 8, 0.1,
      withSelectedSiblings(scene, "filterBlur", updateSceneImageTransform), "scan-eye"),
  );
  const resetFilterButton = document.createElement("button");
  resetFilterButton.type = "button";
  resetFilterButton.className = "layer-mini-btn";
  resetFilterButton.textContent = t("control.reset");
  resetFilterButton.addEventListener("click", () => resetSceneFilter(scene));
  filterSection.body.append(resetFilterButton);
  nodes.push(filterSection.el);

  const transSection = createLayerSection(`${scene.id}:trans`, t("section.transition"), false);
  transSection.body.append(
    createSelectControl(t("control.style"), scene.transitionStyle || "none", [
      { value: "soft", text: t("transitionShort.soft") },
      { value: "cinematic", text: t("transitionShort.cinematic") },
      { value: "blur", text: t("transitionShort.blur") },
      { value: "none", text: t("transitionShort.none") }
    ], (value) => {
      pushSceneHistory();
      scene.transitionStyle = value;
      applyToSelectedSiblings(scene, (other) => { other.transitionStyle = value; });
      renderScenes();
    }, "palette"),
    createRangeControl(t("control.size"), scene.transitionSize ?? 150, 0, 600, 10, (value) => {
      scene.transitionSize = value;
      applyToSelectedSiblings(scene, (other) => { other.transitionSize = value; });
      renderScenes();
    }, "ruler"),
    createSelectControl(t("control.direction"), scene.transitionSides || "both", [
      { value: "both", text: t("sideShort.both") },
      { value: "top", text: t("sideShort.top") },
      { value: "bottom", text: t("sideShort.bottom") }
    ], (value) => {
      pushSceneHistory();
      scene.transitionSides = value;
      applyToSelectedSiblings(scene, (other) => { other.transitionSides = value; });
      renderScenes();
    }, "compass"),
  );
  nodes.push(transSection.el);

  return nodes;
}

function removeScene(id) {
  const index = scenes.findIndex((scene) => scene.id === id);
  if (index === -1) return;
  if (scenes[index].isLocked) {
    setSceneStatus(t("status.lockedCannotDelete"));
    return;
  }
  if (!confirm(t("confirm.deleteScene", { n: index + 1 }))) return;
  pushSceneHistory();
  scenes.splice(index, 1);
  hoveredSceneId = "";
  selectedSceneId = scenes[Math.min(index, scenes.length - 1)]?.id || "";
  selectedSceneIds = selectedSceneId ? [selectedSceneId] : [];
  renderScenes();
  setSceneStatus(t("status.sceneDeleted"));
}

function removeScenes(ids) {
  const requestedIds = [...new Set(ids)].filter((id) => scenes.some((scene) => scene.id === id));
  const lockedCount = requestedIds.filter((id) => scenes.find((scene) => scene.id === id)?.isLocked).length;
  const targetIds = requestedIds.filter((id) => !scenes.find((scene) => scene.id === id)?.isLocked);
  if (!targetIds.length) {
    if (lockedCount) setSceneStatus(t("status.lockedLayersCannotDelete"));
    return;
  }
  if (!confirm(t("confirm.deleteSelected", { count: targetIds.length }))) return;

  pushSceneHistory();
  const firstIndex = scenes.findIndex((scene) => targetIds.includes(scene.id));
  scenes.splice(0, scenes.length, ...scenes.filter((scene) => !targetIds.includes(scene.id)));
  hoveredSceneId = "";
  selectedSceneId = scenes[Math.min(Math.max(firstIndex, 0), scenes.length - 1)]?.id || "";
  selectedSceneIds = selectedSceneId ? [selectedSceneId] : [];
  renderScenes();
  setSceneStatus(lockedCount
    ? t("status.scenesDeletedWithLocked", { count: targetIds.length, lockedCount })
    : t("status.scenesDeletedPlain", { count: targetIds.length }));
}

function copySelectedScenes() {
  const targetIds = getSceneClipboardTargets();
  if (!targetIds.length) {
    setSceneStatus(t("status.noSceneToCopy"));
    return;
  }

  const targetSet = new Set(targetIds);
  sceneClipboardScenes = scenes.filter((scene) => targetSet.has(scene.id)).map(cloneSceneSnapshot);
  sceneClipboardPasteCount = 0;
  setSceneStatus(t("status.scenesCopied", { count: targetIds.length }));
}

function cutSelectedScenes() {
  const requestedIds = getSceneClipboardTargets();
  if (!requestedIds.length) {
    setSceneStatus(t("status.noSceneToCut"));
    return;
  }
  const lockedCount = requestedIds.filter((id) => scenes.find((scene) => scene.id === id)?.isLocked).length;
  const targetIds = requestedIds.filter((id) => !scenes.find((scene) => scene.id === id)?.isLocked);
  if (!targetIds.length) {
    setSceneStatus(t("status.lockedCannotCut"));
    return;
  }

  const targetSet = new Set(targetIds);
  sceneClipboardScenes = scenes.filter((scene) => targetSet.has(scene.id)).map(cloneSceneSnapshot);
  sceneClipboardPasteCount = 0;
  pushSceneHistory();
  const firstIndex = scenes.findIndex((scene) => targetSet.has(scene.id));
  scenes.splice(0, scenes.length, ...scenes.filter((scene) => !targetSet.has(scene.id)));
  hoveredSceneId = "";
  selectedSceneId = scenes[Math.min(Math.max(firstIndex, 0), scenes.length - 1)]?.id || "";
  selectedSceneIds = selectedSceneId ? [selectedSceneId] : [];
  renderScenes();
  setSceneStatus(lockedCount
    ? t("status.scenesCutWithLocked", { count: targetIds.length, lockedCount })
    : t("status.scenesCutPlain", { count: targetIds.length }));
}

function pasteSceneClipboard() {
  if (!sceneClipboardScenes.length) return;

  sceneClipboardPasteCount += 1;
  pushSceneHistory();
  const offset = 3 * sceneClipboardPasteCount;
  const clones = sceneClipboardScenes.map((scene) => cloneSceneForPaste(scene, offset));
  const selectedIds = getSelectedSceneIds();
  const anchorIds = selectedIds.length ? selectedIds : hoveredSceneId ? [hoveredSceneId] : [];
  const anchorIndices = anchorIds.map((id) => scenes.findIndex((scene) => scene.id === id)).filter((index) => index >= 0);
  // Insert in FRONT of (lower array index than) the anchor, not behind it.
  // A pasted clone lands at a slight position offset from what it was
  // copied from, so the two heavily overlap - if the clone were placed
  // behind, its clickable area would mostly be covered by the very layer
  // it overlaps, making the just-pasted thing effectively ungrabbable
  // until the user first reorders it forward.
  const insertIndex = anchorIndices.length ? Math.min(...anchorIndices) : scenes.length;
  scenes.splice(insertIndex, 0, ...clones);
  selectedSceneIds = clones.map((scene) => scene.id);
  selectedSceneId = selectedSceneIds[0] || "";
  hoveredSceneId = "";
  clones.forEach((clone) => expandedLayerIds.add(clone.id));
  renderScenes();
  switchMode();
  setSceneStatus(t("status.scenesPasted", { count: clones.length }));
  clones.forEach((clone) => flashSceneEditorItem(clone.id));
}

function duplicateSelectedScenes() {
  const targetIds = getSceneClipboardTargets();
  if (!targetIds.length) {
    setSceneStatus(t("status.noLayerToDuplicate"));
    return;
  }

  const targetSet = new Set(targetIds);
  const originals = scenes.filter((scene) => targetSet.has(scene.id));
  pushSceneHistory();
  const clones = originals.map((scene) => cloneSceneForPaste(scene, 3));
  // Same reasoning as pasteSceneClipboard: insert in front of the
  // originals (not behind), since the duplicate lands at a slight offset
  // and would otherwise be mostly covered - and thus hard to grab - by
  // the very layer it was duplicated from.
  const anchorIndex = Math.min(...targetIds.map((id) => scenes.findIndex((scene) => scene.id === id)));
  scenes.splice(anchorIndex, 0, ...clones);
  selectedSceneIds = clones.map((scene) => scene.id);
  selectedSceneId = selectedSceneIds[0] || "";
  hoveredSceneId = "";
  clones.forEach((clone) => expandedLayerIds.add(clone.id));
  renderScenes();
  setSceneStatus(t("status.layersDuplicated", { count: clones.length }));
  clones.forEach((clone) => flashSceneEditorItem(clone.id));
}

function cloneSceneSnapshot(scene) {
  return JSON.parse(JSON.stringify(scene));
}

function cloneSceneForPaste(scene, offsetPercent = 0) {
  const clone = cloneSceneSnapshot(scene);
  clone.id = createId();
  clone.name = t("layer.copyNameSuffix", { name: clone.name || t("layer.copyNameFallback") });
  if (offsetPercent) {
    if (clone.type === "text") {
      clone.x = clampNumber((clone.x ?? 2) + offsetPercent, 0, 96, clone.x ?? 2);
      clone.y = clampNumber((clone.y ?? 72) + offsetPercent, 0, 96, clone.y ?? 72);
    } else {
      clone.imageX = (clone.imageX || 0) + offsetPercent;
      clone.imageY = (clone.imageY || 0) + offsetPercent;
    }
  }
  return clone;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// Shown once, only on a visitor's very first-ever load (see loadLocalScenes)
// so the app isn't a blank canvas the first time someone opens it. The
// background is a generated, generic night-street silhouette - not a real
// screenshot or any specific game/show's artwork, to keep this free of
// copyright concerns in a public, permanently-deployed repo.
function createExampleBackgroundDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1220"/>
        <stop offset="55%" stop-color="#141c2e"/>
        <stop offset="100%" stop-color="#05070c"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="35%" r="55%">
        <stop offset="0%" stop-color="#3a4a7a" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#3a4a7a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#sky)"/>
    <rect width="1200" height="800" fill="url(#glow)"/>
    <g fill="#050810">
      <rect x="0" y="520" width="90" height="280"/>
      <rect x="95" y="470" width="60" height="330"/>
      <rect x="160" y="560" width="120" height="240"/>
      <rect x="290" y="430" width="70" height="370"/>
      <rect x="370" y="500" width="100" height="300"/>
      <rect x="480" y="380" width="55" height="420"/>
      <rect x="545" y="520" width="140" height="280"/>
      <rect x="695" y="460" width="80" height="340"/>
      <rect x="785" y="540" width="110" height="260"/>
      <rect x="905" y="410" width="65" height="390"/>
      <rect x="980" y="500" width="130" height="300"/>
      <rect x="1120" y="470" width="80" height="330"/>
    </g>
    <g fill="#f2c766" opacity="0.85">
      <rect x="20" y="560" width="6" height="8"/>
      <rect x="40" y="600" width="6" height="8"/>
      <rect x="115" y="510" width="6" height="8"/>
      <rect x="200" y="600" width="6" height="8"/>
      <rect x="310" y="470" width="6" height="8"/>
      <rect x="400" y="560" width="6" height="8"/>
      <rect x="500" y="430" width="6" height="8"/>
      <rect x="580" y="580" width="6" height="8"/>
      <rect x="720" y="510" width="6" height="8"/>
      <rect x="820" y="600" width="6" height="8"/>
      <rect x="930" y="460" width="6" height="8"/>
      <rect x="1010" y="560" width="6" height="8"/>
      <rect x="1150" y="520" width="6" height="8"/>
    </g>
    <rect x="0" y="760" width="1200" height="40" fill="#0a0c10"/>
    <rect x="0" y="778" width="1200" height="3" fill="#3a3f4a" opacity="0.4"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createExampleScenes() {
  const backgroundScene = {
    id: createId(),
    type: "image",
    name: "Ornek arka plan",
    dataUrl: createExampleBackgroundDataUrl(),
    isBlank: false,
    imageZoom: 100,
    imageScaleX: 100,
    imageScaleY: 100,
    imageX: 0,
    imageY: 0,
    filterBrightness: sceneImageFilterDefaults.brightness,
    filterContrast: sceneImageFilterDefaults.contrast,
    filterSaturate: sceneImageFilterDefaults.saturate,
    filterSepia: sceneImageFilterDefaults.sepia,
    filterBlur: sceneImageFilterDefaults.blur,
    blocks: [],
  };
  const textScene = {
    ...createSceneBlock(
      "* Yabanci arabadan iner, sokak lambasinin altinda durup cevresini suzer.\n" +
      "Elif Demir: Burada bulusmamiz gerekiyordu, degil mi?\n" +
      "* Ceketinin yakasini kaldirir, sessizce cevap bekler. (( Elif Demir ))",
    ),
    type: "text",
    name: "Ornek yazi",
    isLocked: false,
  };
  return [textScene, backgroundScene];
}

function clearScenes() {
  if (!scenes.length) return;
  const lockedCount = scenes.filter((scene) => scene.isLocked).length;
  if (lockedCount === scenes.length) {
    setSceneStatus(t("status.lockedLayersCannotDelete"));
    return;
  }
  if (!confirm(t("confirm.clearAll"))) return;
  pushSceneHistory();
  scenes.splice(0, scenes.length, ...scenes.filter((scene) => scene.isLocked));
  selectedSceneId = "";
  selectedSceneIds = [];
  hoveredSceneId = "";
  renderScenes();
  setSceneStatus(lockedCount
    ? t("status.allScenesDeletedWithLocked", { lockedCount })
    : t("status.allScenesDeletedPlain"));
}

function exportSceneProject() {
  ensureSceneModel();
  if (!scenes.length) {
    setSceneStatus(t("status.rseNeedsScene"));
    return;
  }

  const payload = createSceneProjectPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/vnd.roleplay-scene.rse+json;charset=utf-8",
  });
  const link = document.createElement("a");
  link.download = createSceneProjectFileName(payload);
  link.href = URL.createObjectURL(blob);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  setSceneStatus(t("status.rseExported", { count: payload.scenes.length }));
}

function createSceneProjectPayload() {
  return {
    magic: rseProjectMagic,
    format: "rse",
    version: rseProjectVersion,
    app: "Persona",
    exportedAt: new Date().toISOString(),
    settings: {
      sceneOutputWidth: getSceneOutputWidth(),
      sceneBackgroundHeight: getSceneBackgroundHeight(),
      sceneFontSize: getSceneFontSize(),
      scenePadding: getScenePadding(),
      sceneTransitionSize: getSceneTransitionSize(),
      sceneTransitionStyle: getSceneTransitionStyle(),
      sceneTransitionSides: getSceneTransitionSides(),
    },
    selection: {
      selectedSceneId,
      selectedSceneIds: [...selectedSceneIds],
    },
    scenes: JSON.parse(JSON.stringify(scenes)),
  };
}

function createSceneProjectFileName(payload) {
  const firstSceneName = payload.scenes.find((scene) => scene?.name)?.name || "sahne-projesi";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return `${safeFilePart(firstSceneName)}-${stamp}.rse`;
}

async function importSceneProject(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (file.size > rseMaxImportBytes) {
      setSceneStatus(t("status.rseTooLarge"));
      return;
    }

    const payload = JSON.parse(await file.text());
    const project = normalizeSceneProjectPayload(payload);
    if (!project) {
      setSceneStatus(t("status.rseInvalidFile"));
      return;
    }
    if (!project.scenes.length) {
      setSceneStatus(t("status.rseEmptyFile"));
      return;
    }

    if (scenes.length && !confirm(t("confirm.overwriteRse"))) return;

    pushSceneHistory();
    applySceneProjectPayload(project);
    saveState();
    scheduleSceneAutosave();
    switchMode();
    renderScenes();
    setSceneStatus(t("status.rseImported", { count: scenes.length }));
  } catch (error) {
    setSceneStatus(t("status.rseImportFailed", { error: error.message || (getLanguage() === "tr" ? "gecersiz dosya" : "invalid file") }));
  } finally {
    sceneProjectInput.value = "";
  }
}

function normalizeSceneProjectPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.magic !== rseProjectMagic || payload.format !== "rse") return null;
  if (payload.version !== rseProjectVersion) return null;
  if (!Array.isArray(payload.scenes)) return null;

  const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
  const selection = payload.selection && typeof payload.selection === "object" ? payload.selection : {};
  const scenes = payload.scenes.map(normalizeImportedScene).filter(Boolean);
  deduplicateImportedSceneIds(scenes);
  return { settings, selection, scenes };
}

// A hand-edited or corrupted .rse can carry two layers with the same id.
// Every selection/deletion lookup elsewhere in the app assumes ids are
// unique (Array#find returns only the first match), so a collision here
// would silently break selecting or deleting the second layer.
function deduplicateImportedSceneIds(scenes) {
  const seenIds = new Set();
  for (const scene of scenes) {
    if (seenIds.has(scene.id)) scene.id = createId();
    seenIds.add(scene.id);
  }
}

function normalizeImportedScene(scene, index) {
  if (!scene || typeof scene !== "object") return null;
  const clone = JSON.parse(JSON.stringify(scene));
  clone.id = typeof clone.id === "string" && clone.id ? clone.id : createId();
  clone.name = typeof clone.name === "string" && clone.name ? clone.name : t("layer.defaultName", { n: index + 1 });
  clone.type = clone.type === "text" ? "text" : "image";
  clone.isLocked = clone.isLocked === true;
  if (clone.type === "text") {
    clone.text = typeof clone.text === "string" ? clone.text : "";
    clone.x = clampNumber(clone.x, -1000, 1000, 2);
    clone.y = clampNumber(clone.y, -1000, 1000, 72);
    clone.width = clampNumber(clone.width, 1, 100, 88);
    clone.fontSize = clampNumber(clone.fontSize, 10, 42, getSceneFontSize());
    clone.letterSpacing = clampNumber(clone.letterSpacing, -5, 20, 0);
    clone.lineHeight = clampNumber(clone.lineHeight, 0.8, 2.5, 1.18);
    clone.textStyle = ["box", "soft", "outline", "plain", "boxSoft", "outlineThick", "neon"].includes(clone.textStyle)
      ? clone.textStyle
      : "box";
  } else {
    // Must actually be a data: image URI, not just any string - an import
    // that accepted an arbitrary URL here (http(s):, javascript:, etc.)
    // would end up as an <img src>, which for a non-data URL means the
    // app silently makes an outbound request to whatever host a hand-
    // edited/corrupt .rse file points at the moment the layer renders.
    clone.dataUrl = typeof clone.dataUrl === "string" && /^data:image\//i.test(clone.dataUrl) ? clone.dataUrl : "";
    clone.isBlank = !clone.dataUrl;
    clone.imageZoom = clampNumber(clone.imageZoom, 5, 1200, 100);
    clone.imageScaleX = clampNumber(clone.imageScaleX, 5, 1200, 100);
    clone.imageScaleY = clampNumber(clone.imageScaleY, 5, 1200, 100);
    clone.imageX = clampNumber(clone.imageX, -1000, 1000, 0);
    clone.imageY = clampNumber(clone.imageY, -1000, 1000, 0);
    clone.filterBrightness = clampNumber(clone.filterBrightness, 70, 145, sceneImageFilterDefaults.brightness);
    clone.filterContrast = clampNumber(clone.filterContrast, 70, 150, sceneImageFilterDefaults.contrast);
    clone.filterSaturate = clampNumber(clone.filterSaturate, 60, 180, sceneImageFilterDefaults.saturate);
    clone.filterSepia = clampNumber(clone.filterSepia, 0, 18, sceneImageFilterDefaults.sepia);
    clone.filterBlur = clampNumber(clone.filterBlur, 0, 8, sceneImageFilterDefaults.blur);
    clone.transitionStyle = ["soft", "cinematic", "blur", "none"].includes(clone.transitionStyle)
      ? clone.transitionStyle
      : "none";
    clone.transitionSize = clampNumber(clone.transitionSize, 0, 600, 150);
    clone.transitionSides = ["both", "top", "bottom"].includes(clone.transitionSides) ? clone.transitionSides : "both";
  }
  return clone;
}

function applySceneProjectPayload(project) {
  sceneOutputWidth.value = clampNumber(project.settings.sceneOutputWidth, 640, sceneCanvasMaxDimension, sceneCanvasDefaultWidth);
  sceneBackgroundHeight.value = clampNumber(project.settings.sceneBackgroundHeight, 300, sceneCanvasMaxDimension, sceneCanvasDefaultHeight);
  sceneFontSize.value = clampNumber(project.settings.sceneFontSize, 10, 42, 18);
  scenePadding.value = clampNumber(project.settings.scenePadding, 4, 80, 18);
  sceneTransitionSize.value = clampNumber(project.settings.sceneTransitionSize, 0, 600, sceneTransitionPx);
  sceneTransitionStyle.value = ["soft", "cinematic", "blur", "none"].includes(project.settings.sceneTransitionStyle)
    ? project.settings.sceneTransitionStyle
    : "none";
  sceneTransitionSides.value = ["both", "top", "bottom"].includes(project.settings.sceneTransitionSides)
    ? project.settings.sceneTransitionSides
    : "both";

  scenes.splice(0, scenes.length, ...project.scenes);
  selectedSceneId = typeof project.selection.selectedSceneId === "string" ? project.selection.selectedSceneId : scenes[0]?.id || "";
  selectedSceneIds = Array.isArray(project.selection.selectedSceneIds) ? project.selection.selectedSceneIds : selectedSceneId ? [selectedSceneId] : [];
  hoveredSceneId = "";
  shouldAutoFitSceneViewport = true;
  ensureSceneModel();
  normalizeSceneSelection();
}

function normalizeSceneSelection() {
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  selectedSceneIds = selectedSceneIds.filter((id) => sceneIds.has(id));
  if (selectedSceneId && !sceneIds.has(selectedSceneId)) selectedSceneId = "";
  if (!selectedSceneIds.length && selectedSceneId) selectedSceneIds = [selectedSceneId];
  if (selectedSceneIds.length && !selectedSceneId) selectedSceneId = selectedSceneIds[0];
  if (hoveredSceneId && !sceneIds.has(hoveredSceneId)) hoveredSceneId = "";
}

function setSelectedScene(id) {
  if (!scenes.some((scene) => scene.id === id)) return;
  selectedSceneId = id;
  selectedSceneIds = [id];
  refreshSceneSelection();
}

// Ctrl/Cmd+click: toggle a single layer in/out of the current selection,
// same as file-explorer / Photoshop layer panel conventions.
function toggleSceneSelection(id) {
  if (!scenes.some((scene) => scene.id === id)) return;
  if (selectedSceneIds.includes(id)) {
    selectedSceneIds = selectedSceneIds.filter((sceneId) => sceneId !== id);
    if (selectedSceneId === id) selectedSceneId = selectedSceneIds[selectedSceneIds.length - 1] || "";
  } else {
    selectedSceneIds = [...selectedSceneIds, id];
    selectedSceneId = id;
  }
  refreshSceneSelection();
}

// Shift+click: select the contiguous range between the current anchor
// (selectedSceneId) and the clicked layer, re-anchored from the same
// origin on repeated shift-clicks until a plain click resets it.
function selectSceneRange(id) {
  if (!scenes.some((scene) => scene.id === id)) return;
  const anchorId = selectedSceneId || selectedSceneIds[selectedSceneIds.length - 1];
  if (!anchorId) {
    setSelectedScene(id);
    return;
  }
  const anchorIndex = scenes.findIndex((scene) => scene.id === anchorId);
  const targetIndex = scenes.findIndex((scene) => scene.id === id);
  if (anchorIndex === -1 || targetIndex === -1) {
    setSelectedScene(id);
    return;
  }
  const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  selectedSceneIds = scenes.slice(start, end + 1).map((scene) => scene.id);
  selectedSceneId = anchorId;
  refreshSceneSelection();
}

function clearSceneSelection() {
  selectedSceneId = "";
  selectedSceneIds = [];
  refreshSceneSelection();
}

function selectAllScenes() {
  selectedSceneIds = scenes.map((scene) => scene.id);
  selectedSceneId = selectedSceneIds[0] || "";
  hoveredSceneId = "";
  refreshSceneSelection();
  setSceneStatus(t("status.scenesSelected", { count: selectedSceneIds.length }));
}

function isSceneSelected(id) {
  return selectedSceneIds.includes(id) || selectedSceneId === id;
}

function getSelectedSceneIds() {
  normalizeSceneSelection();
  return selectedSceneIds.length ? [...selectedSceneIds] : selectedSceneId ? [selectedSceneId] : [];
}

function getSceneDeleteTargets() {
  const selectedIds = getSelectedSceneIds();
  if (selectedIds.length > 1 && (!hoveredSceneId || selectedIds.includes(hoveredSceneId))) return selectedIds;
  return hoveredSceneId ? [hoveredSceneId] : selectedIds;
}

function getSceneClipboardTargets() {
  const selectedIds = getSelectedSceneIds();
  return selectedIds.length ? selectedIds : hoveredSceneId ? [hoveredSceneId] : [];
}

function refreshSceneSelection() {
  document.querySelectorAll(".scene-image-wrap").forEach((wrap) => {
    wrap.classList.toggle("selected", isSceneSelected(wrap.dataset.sceneId));
  });
  document.querySelectorAll(".scene-image-transform-box").forEach((box) => {
    box.classList.toggle("selected", isSceneSelected(box.dataset.sceneTransformId));
  });
  document.querySelectorAll(".scene-editor-item").forEach((item) => {
    item.classList.toggle("selected", isSceneSelected(item.dataset.sceneEditorId));
  });
  document.querySelectorAll(".scene-text-block").forEach((block) => {
    block.classList.toggle("selected", isSceneSelected(block.dataset.sceneId));
  });
}

function prepareSceneHistoryControl(control) {
  let captured = false;
  const capture = (event) => {
    if (event && (isSceneUndoShortcut(event) || isSceneRedoShortcut(event))) return;
    if (captured) return;
    pushSceneHistory();
    captured = true;
  };

  control.addEventListener("pointerdown", capture);
  control.addEventListener("focus", capture);
  control.addEventListener("keydown", capture);
  control.addEventListener("change", () => {
    captured = false;
  });
  control.addEventListener("blur", () => {
    captured = false;
  });
}

function pushSceneHistory() {
  const entry = createSceneHistoryEntry();
  if (historyEntriesEqual(sceneUndoStack.at(-1), entry)) return;
  sceneUndoStack.push(entry);
  if (sceneUndoStack.length > sceneHistoryLimit) sceneUndoStack.shift();
  sceneRedoStack.length = 0;
}

function undoSceneHistory() {
  if (!sceneUndoStack.length) {
    setSceneStatus(t("status.noUndoAction"));
    return;
  }

  sceneRedoStack.push(createSceneHistoryEntry());
  if (sceneRedoStack.length > sceneHistoryLimit) sceneRedoStack.shift();
  restoreSceneHistoryEntry(sceneUndoStack.pop(), "Geri alindi.");
}

function redoSceneHistory() {
  if (!sceneRedoStack.length) {
    setSceneStatus(t("status.noRedoAction"));
    return;
  }

  sceneUndoStack.push(createSceneHistoryEntry());
  if (sceneUndoStack.length > sceneHistoryLimit) sceneUndoStack.shift();
  restoreSceneHistoryEntry(sceneRedoStack.pop(), "Ileri alindi.");
}

// Every scene field is a scalar (number/string/boolean) - dataUrl included,
// since it's only ever REPLACED wholesale, never mutated in place. A
// shallow clone is therefore enough to make an independent history
// snapshot; it reuses the same dataUrl string reference instead of
// re-copying potentially megabytes of base64 text through it. Previously
// createSceneHistoryEntry() built BOTH a JSON.stringify "key" (for
// dedup) AND a JSON.parse "snapshot" from that same string - two full
// deep copies of every image's data per history entry, up to
// sceneHistoryLimit times over.
function cloneSceneForHistory(scene) {
  return { ...scene };
}

function scenesEqualForHistory(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const sceneA = a[i];
    const sceneB = b[i];
    if (sceneA === sceneB) continue;
    const keysA = Object.keys(sceneA);
    if (keysA.length !== Object.keys(sceneB).length) return false;
    for (const key of keysA) {
      if (sceneA[key] !== sceneB[key]) return false;
    }
  }
  return true;
}

function idArraysEqualForHistory(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function historyEntriesEqual(a, b) {
  if (!a || !b) return false;
  return a.selectedSceneId === b.selectedSceneId
    && a.sceneOutputWidth === b.sceneOutputWidth
    && a.sceneBackgroundHeight === b.sceneBackgroundHeight
    && a.sceneTransitionSize === b.sceneTransitionSize
    && a.sceneTransitionStyle === b.sceneTransitionStyle
    && a.sceneTransitionSides === b.sceneTransitionSides
    && idArraysEqualForHistory(a.selectedSceneIds, b.selectedSceneIds)
    && scenesEqualForHistory(a.scenes, b.scenes);
}

function createSceneHistoryEntry() {
  return {
    scenes: scenes.map(cloneSceneForHistory),
    selectedSceneId,
    selectedSceneIds: [...selectedSceneIds],
    sceneOutputWidth: sceneOutputWidth.value,
    sceneBackgroundHeight: sceneBackgroundHeight.value,
    sceneTransitionSize: sceneTransitionSize.value,
    sceneTransitionStyle: sceneTransitionStyle.value,
    sceneTransitionSides: sceneTransitionSides.value,
  };
}

function restoreSceneHistoryEntry(entry, message) {
  // Clone on the way back in too - entry.scenes must stay untouched by
  // subsequent live edits, since undo/redo can restore the SAME entry
  // object again later (e.g. redo after undo).
  scenes.splice(0, scenes.length, ...(entry.scenes || []).map(cloneSceneForHistory));
  if (entry.sceneOutputWidth) sceneOutputWidth.value = entry.sceneOutputWidth;
  if (entry.sceneBackgroundHeight) sceneBackgroundHeight.value = entry.sceneBackgroundHeight;
  if (entry.sceneTransitionSize) sceneTransitionSize.value = entry.sceneTransitionSize;
  if (entry.sceneTransitionStyle) sceneTransitionStyle.value = entry.sceneTransitionStyle;
  if (entry.sceneTransitionSides) sceneTransitionSides.value = entry.sceneTransitionSides;
  selectedSceneId = entry.selectedSceneId || scenes[0]?.id || "";
  selectedSceneIds = Array.isArray(entry.selectedSceneIds) ? [...entry.selectedSceneIds] : selectedSceneId ? [selectedSceneId] : [];
  hoveredSceneId = "";
  normalizeSceneSelection();
  saveState();
  renderScenes();
  setSceneStatus(message);
}

function isSceneUndoShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
}

function isSceneRedoShortcut(event) {
  if (!(event.ctrlKey || event.metaKey)) return false;
  const key = event.key.toLowerCase();
  return key === "y" || (event.shiftKey && key === "z");
}

function isSceneSelectAllShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";
}

function isSceneCopyShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
}

function isSceneCutShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x";
}

function isSceneDuplicateShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d";
}

function isSceneUploadShortcut(event) {
  return (event.ctrlKey || event.metaKey)
    && event.shiftKey
    && !event.altKey
    && !event.isComposing
    && event.key.toLowerCase() === "u";
}

function isScenePasteShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
}

function refreshSceneStyles() {
  document.querySelectorAll(".composite-stage").forEach((stage) => {
    stage.style.setProperty("--scene-padding", `${getScenePadding()}px`);
  });
  document.querySelectorAll(".scene-text-block").forEach((block) => {
    const layer = scenes.find((scene) => scene.id === block.dataset.sceneId);
    block.style.fontSize = `${layer?.fontSize || getSceneFontSize()}px`;
  });
}

function applyGlobalSceneFontSize() {
  const fontSize = getSceneFontSize();
  scenes.forEach((scene) => {
    if (scene.type === "text") scene.fontSize = fontSize;
  });
  document.querySelectorAll(".scene-text-block").forEach((block) => {
    block.style.fontSize = `${fontSize}px`;
  });
  document.querySelectorAll(".block-font-input").forEach((input) => {
    input.value = fontSize;
  });
  refreshSceneStyles();
}

function renderSceneTextBlock(container, text) {
  container.replaceChildren();
  const lines = parseLines(text);
  if (!lines.length) {
    const empty = document.createElement("p");
    empty.className = "scene-caption-line muted-line";
    empty.textContent = t("canvas.emptyDragText");
    container.append(empty);
    return;
  }

  lines.forEach((line) => {
    const row = document.createElement("p");
    row.className = "scene-caption-line";
    appendSegments(row, line, getOptions());
    container.append(row);
  });
}

// Double-clicking a text layer directly on the canvas swaps its formatted
// preview for a plain textarea in place, so the raw RP text can be edited
// without opening the (possibly hidden/far away) layer card. The rich
// preview (colors, OOC hiding, etc.) only reflects the raw text again once
// editing ends - editing itself is always plain text, same as the layer
// card's own textarea.
function startInlineSceneTextEdit(scene, block, content) {
  if (scene.isLocked) return;
  if (block.querySelector(".scene-text-inline-editor")) return;

  content.style.display = "none";
  const textarea = document.createElement("textarea");
  textarea.className = "scene-text-inline-editor";
  textarea.spellcheck = false;
  textarea.value = scene.text;
  block.insertBefore(textarea, content);

  const autoGrow = () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  autoGrow();

  let done = false;
  const stop = ({ commit }) => {
    if (done) return;
    done = true;
    if (commit) {
      scene.text = textarea.value;
      const cardTextarea = document.querySelector(
        `.scene-editor-item[data-scene-editor-id="${CSS.escape(scene.id)}"] textarea.scene-text`,
      );
      if (cardTextarea) cardTextarea.value = scene.text;
      saveState();
      scheduleSceneAutosave();
    }
    textarea.remove();
    content.style.display = "";
    renderSceneTextBlock(content, scene.text);
  };

  pushSceneHistory();
  textarea.addEventListener("input", autoGrow);
  textarea.addEventListener("pointerdown", (event) => event.stopPropagation());
  textarea.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      stop({ commit: false });
    }
  });
  textarea.addEventListener("blur", () => stop({ commit: true }));
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function createSceneImageTransformBox(scene) {
  const box = document.createElement("div");
  box.className = "scene-image-transform-box";
  if (isSceneSelected(scene.id)) box.classList.add("selected");
  box.dataset.sceneTransformId = scene.id;
  box.style.transform = getSceneImageTransform(scene);
  box.title = t("canvas.imageDragTitle");
  box.addEventListener("pointerdown", (event) => startSceneImagePan(event, scene));

  const ghostImage = document.createElement("img");
  ghostImage.className = "transform-ghost-image";
  ghostImage.src = scene.dataUrl;
  ghostImage.alt = "";
  ghostImage.draggable = false;
  ghostImage.addEventListener("load", () => applySceneViewportZoom());
  box.append(ghostImage);

  ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((handleName) => {
    const handle = document.createElement("span");
    handle.className = `image-transform-handle ${handleName}`;
    handle.dataset.handle = handleName;
    handle.addEventListener("pointerdown", (event) => startSceneImageScale(event, scene));
    box.append(handle);
  });

  return box;
}

function createStageResizeFrame() {
  const frame = document.createElement("div");
  frame.className = "stage-resize-frame";
  frame.title = t("canvas.resizeFrameTitle");

  const sizeBadge = document.createElement("span");
  sizeBadge.className = "stage-size-badge";
  sizeBadge.textContent = `${getSceneOutputWidth()} x ${getSceneBackgroundHeight()}`;
  frame.append(sizeBadge);

  ["e", "s", "se"].forEach((direction) => {
    const handle = document.createElement("span");
    handle.className = `stage-resize-handle ${direction}`;
    handle.dataset.direction = direction;
    handle.title = direction === "e" ? t("canvas.resizeWidthOnly") : direction === "s" ? t("canvas.resizeHeightOnly") : t("canvas.resizeBoth");
    handle.addEventListener("pointerdown", (event) => startStageResize(event, direction));
    frame.append(handle);
  });

  return frame;
}

function getSceneImageTransform(scene) {
  const zoom = (scene.imageZoom || 100) / 100;
  const scaleX = (scene.imageScaleX || 100) / 100;
  const scaleY = (scene.imageScaleY || 100) / 100;
  return `scale(${zoom * scaleX}, ${zoom * scaleY})`;
}

function getSceneLayerZIndex(index, offset = 0) {
  return (scenes.length - index) * 10 + offset;
}

function applySceneLayerPosition(wrap, scene) {
  wrap.style.left = `${scene.imageX || 0}%`;
  wrap.style.top = `${scene.imageY || 0}%`;
}

// Text and image layers keep position in different fields (x/y vs
// imageX/imageY) but both are percent-of-stage-dimension, so a single
// delta computed from the dragged layer can be applied uniformly across
// a mixed text+image multi-selection during a group drag.
function getScenePosition(scene) {
  return scene.type === "text"
    ? { x: scene.x ?? 0, y: scene.y ?? 0 }
    : { x: scene.imageX || 0, y: scene.imageY || 0 };
}

function setScenePosition(scene, x, y) {
  if (scene.type === "text") {
    scene.x = x;
    scene.y = y;
  } else {
    scene.imageX = x;
    scene.imageY = y;
  }
}

// When the layer being dragged on the canvas is already part of a
// multi-selection, every other selected (unlocked) layer should move
// with it - matching the layer-list's existing group-drag behavior.
// Dragging an unselected layer instead replaces the selection as usual.
function getGroupDragSceneIds(primarySceneId) {
  if (!selectedSceneIds.includes(primarySceneId) || selectedSceneIds.length <= 1) return [primarySceneId];
  return selectedSceneIds.filter((id) => {
    const scene = scenes.find((sc) => sc.id === id);
    return scene && !scene.isLocked;
  });
}

function applyGroupDragDelta(groupIds, groupInitial, deltaX, deltaY) {
  groupIds.forEach((id) => {
    const scene = scenes.find((sc) => sc.id === id);
    if (!scene) return;
    const initial = groupInitial.get(id);
    if (!initial) return;
    const nextX = initial.x + deltaX;
    const nextY = initial.y + deltaY;
    setScenePosition(scene, nextX, nextY);
    if (scene.type === "text") {
      const block = document.querySelector(`.scene-text-block[data-scene-id="${CSS.escape(id)}"]`);
      if (block) {
        block.style.left = `${nextX}%`;
        block.style.top = `${nextY}%`;
      }
    } else {
      updateSceneImageTransform(scene);
    }
  });
}

function getSceneImageFilter(scene) {
  const brightness = clampNumber(scene.filterBrightness, 70, 145, sceneImageFilterDefaults.brightness);
  const contrast = clampNumber(scene.filterContrast, 70, 150, sceneImageFilterDefaults.contrast);
  const saturate = clampNumber(scene.filterSaturate, 60, 180, sceneImageFilterDefaults.saturate);
  const sepia = clampNumber(scene.filterSepia, 0, 18, sceneImageFilterDefaults.sepia);
  const blur = clampNumber(scene.filterBlur, 0, 8, sceneImageFilterDefaults.blur);
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) blur(${blur}px)`;
}

function updateSceneImageTransform(scene) {
  const image = document.querySelector(`[data-scene-image-id="${CSS.escape(scene.id)}"]`);
  const box = document.querySelector(`[data-scene-transform-id="${CSS.escape(scene.id)}"]`);
  const wrap = document.querySelector(`.scene-image-wrap[data-scene-id="${CSS.escape(scene.id)}"]`);
  const transform = getSceneImageTransform(scene);
  if (image) {
    image.style.transform = transform;
    image.style.filter = getSceneImageFilter(scene);
  }
  if (box) box.style.transform = transform;
  if (wrap) applySceneLayerPosition(wrap, scene);
  if (box) applySceneLayerPosition(box, scene);
}

function createSceneBlock(text = "") {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text,
    x: 2,
    y: 72,
    width: 88,
    fontSize: lastTextLayerDefaults.fontSize,
    textStyle: lastTextLayerDefaults.textStyle,
    letterSpacing: lastTextLayerDefaults.letterSpacing,
    lineHeight: lastTextLayerDefaults.lineHeight,
  };
}

function ensureSceneModel() {
  scenes.forEach((scene) => {
    scene.type ??= "image";
    if (scene.type === "text") {
      scene.x ??= 2;
      scene.y ??= 72;
      scene.width ??= 88;
      scene.fontSize ??= getSceneFontSize();
      scene.textStyle ??= "box";
      scene.text ??= "";
      scene.letterSpacing ??= 0;
      scene.lineHeight ??= 1.18;
      scene.isLocked ??= false;
      return;
    }
    scene.isBlank = !scene.dataUrl;
    scene.imageZoom ??= 100;
    scene.imageScaleX ??= 100;
    scene.imageScaleY ??= 100;
    scene.imageX ??= 0;
    scene.imageY ??= 0;
    scene.filterBrightness ??= sceneImageFilterDefaults.brightness;
    scene.filterContrast ??= sceneImageFilterDefaults.contrast;
    scene.filterSaturate ??= sceneImageFilterDefaults.saturate;
    scene.filterSepia ??= sceneImageFilterDefaults.sepia;
    scene.filterBlur ??= sceneImageFilterDefaults.blur;
    scene.isLocked ??= false;
    scene.transitionStyle ??= (sceneTransitionStyle ? sceneTransitionStyle.value : "none") || "none";
    scene.transitionSize ??= Number(sceneTransitionSize ? sceneTransitionSize.value : 150) || 150;
    scene.transitionSides ??= (sceneTransitionSides ? sceneTransitionSides.value : "both") || "both";
  });
}

function createSceneOrderButton(label, icon, sceneId, placement, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scene-order-button";
  button.innerHTML = `<i data-lucide="${icon}"></i>`;
  button.title = label;
  button.disabled = disabled;
  button.addEventListener("click", () => reorderScene(sceneId, placement));
  return button;
}

function reorderScene(sceneId, placement) {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  if (index === -1) return;

  let targetIndex = index;
  if (placement === "top") targetIndex = 0;
  else if (placement === "up") targetIndex = Math.max(0, index - 1);
  else if (placement === "down") targetIndex = Math.min(scenes.length - 1, index + 1);
  else if (placement === "bottom") targetIndex = scenes.length - 1;
  if (targetIndex === index) return;

  pushSceneHistory();
  const [scene] = scenes.splice(index, 1);
  scenes.splice(targetIndex, 0, scene);
  selectedSceneId = sceneId;
  selectedSceneIds = [sceneId];
  hoveredSceneId = "";
  renderScenes();
  const moveKey = placement === "top" ? "status.sceneMovedTop"
    : placement === "bottom" ? "status.sceneMovedBottom"
    : placement === "up" ? "status.sceneMovedUp"
    : "status.sceneMovedDown";
  setSceneStatus(t(moveKey));
  flashSceneEditorItem(sceneId);
}

function flashSceneEditorItem(sceneId) {
  const item = document.querySelector(`[data-scene-editor-id="${CSS.escape(sceneId)}"]`);
  if (!item) return;
  item.scrollIntoView({ block: "nearest" });
  item.classList.add("reorder-flash");
  setTimeout(() => item.classList.remove("reorder-flash"), 500);
}

// ── Layer drag-reorder (pointer-events based: works with mouse AND touch,
// unlike the native HTML5 drag-and-drop API it replaces) ──
//
// Grabbing the grip of a card that's part of the current multi-selection
// drags the whole selected group together, preserving their relative
// order (Photoshop/Explorer convention). Grabbing a card outside the
// current selection drags just that one card and selects it.
function startLayerDragReorder(event, scene, listContainer) {
  if (event.button !== 0) return;
  event.preventDefault();

  const isPartOfMultiSelection = selectedSceneIds.includes(scene.id) && selectedSceneIds.length > 1;
  const draggedIds = isPartOfMultiSelection
    ? scenes.filter((candidate) => selectedSceneIds.includes(candidate.id)).map((candidate) => candidate.id)
    : [scene.id];
  if (!isPartOfMultiSelection) setSelectedScene(scene.id);

  const draggedSet = new Set(draggedIds);
  const draggedCards = draggedIds
    .map((id) => listContainer.querySelector(`.scene-editor-item[data-scene-editor-id="${CSS.escape(id)}"]`))
    .filter(Boolean);
  draggedCards.forEach((card) => card.classList.add("layer-dragging"));

  const indicator = document.createElement("div");
  indicator.className = "layer-drop-indicator";

  let lastClientY = event.clientY;
  let dropTargetId = null;
  let dropPlacement = null;
  let scrollRafId = null;

  const dropCandidates = () =>
    Array.from(listContainer.querySelectorAll(".scene-editor-item")).filter(
      (card) => !draggedSet.has(card.dataset.sceneEditorId),
    );

  const placeIndicator = (card, placement) => {
    if (placement === "before") listContainer.insertBefore(indicator, card);
    else listContainer.insertBefore(indicator, card.nextSibling);
    dropTargetId = card.dataset.sceneEditorId;
    dropPlacement = placement;
  };

  const autoScrollStep = () => {
    const rect = listContainer.getBoundingClientRect();
    const edge = 40;
    let delta = 0;
    if (lastClientY < rect.top + edge) delta = lastClientY - (rect.top + edge);
    else if (lastClientY > rect.bottom - edge) delta = lastClientY - (rect.bottom - edge);
    if (delta !== 0) listContainer.scrollTop += Math.max(-14, Math.min(14, delta * 0.4));
    scrollRafId = requestAnimationFrame(autoScrollStep);
  };
  scrollRafId = requestAnimationFrame(autoScrollStep);

  const onMove = (moveEvent) => {
    lastClientY = moveEvent.clientY;
    const candidates = dropCandidates();
    if (!candidates.length) return;

    const hovered = candidates.find((card) => {
      const rect = card.getBoundingClientRect();
      return moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom;
    });
    if (hovered) {
      const rect = hovered.getBoundingClientRect();
      placeIndicator(hovered, moveEvent.clientY < rect.top + rect.height / 2 ? "before" : "after");
      return;
    }

    const firstRect = candidates[0].getBoundingClientRect();
    const lastRect = candidates[candidates.length - 1].getBoundingClientRect();
    if (moveEvent.clientY < firstRect.top) placeIndicator(candidates[0], "before");
    else if (moveEvent.clientY > lastRect.bottom) placeIndicator(candidates[candidates.length - 1], "after");
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    cancelAnimationFrame(scrollRafId);
    indicator.remove();
    draggedCards.forEach((card) => card.classList.remove("layer-dragging"));
    if (dropTargetId) reorderScenesByDrag(draggedIds, dropTargetId, dropPlacement);
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function reorderScenesByDrag(draggedIds, targetId, placement) {
  const draggedSet = new Set(draggedIds);
  if (draggedSet.has(targetId)) return;

  const draggedScenes = scenes.filter((scene) => draggedSet.has(scene.id));
  const remaining = scenes.filter((scene) => !draggedSet.has(scene.id));
  const targetIndex = remaining.findIndex((scene) => scene.id === targetId);
  if (targetIndex === -1 || !draggedScenes.length) return;

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  remaining.splice(insertIndex, 0, ...draggedScenes);

  const unchanged = remaining.length === scenes.length && remaining.every((scene, i) => scene.id === scenes[i].id);
  if (unchanged) return;

  pushSceneHistory();
  scenes.splice(0, scenes.length, ...remaining);
  selectedSceneIds = [...draggedIds];
  selectedSceneId = draggedIds[0];
  hoveredSceneId = "";
  renderScenes();
  setSceneStatus(
    draggedIds.length > 1 ? `${draggedIds.length} katman suruklemeyle tasindi.` : "Sahne sirasi suruklemeyle degistirildi.",
  );
}

function resetSceneFilter(scene) {
  pushSceneHistory();
  const reset = (target) => {
    target.filterBrightness = sceneImageFilterDefaults.brightness;
    target.filterContrast = sceneImageFilterDefaults.contrast;
    target.filterSaturate = sceneImageFilterDefaults.saturate;
    target.filterSepia = sceneImageFilterDefaults.sepia;
    target.filterBlur = sceneImageFilterDefaults.blur;
  };
  reset(scene);
  applyToSelectedSiblings(scene, reset);
  renderScenes();
  setSceneStatus(t("status.filterReset"));
}

// Where a brand-new text layer should appear: at the mouse if it's
// currently over the canvas (so a pasted/added layer lands right where the
// user is working, not off-screen in the layer list), centered otherwise.
function getTextLayerSpawnPosition(width) {
  const stage = document.querySelector(".composite-stage");
  if (stage && lastPointerClientX !== null && lastPointerClientY !== null) {
    const rect = stage.getBoundingClientRect();
    const withinStage = lastPointerClientX >= rect.left && lastPointerClientX <= rect.right
      && lastPointerClientY >= rect.top && lastPointerClientY <= rect.bottom;
    if (withinStage && rect.width > 0 && rect.height > 0) {
      const percentX = ((lastPointerClientX - rect.left) / rect.width) * 100;
      const percentY = ((lastPointerClientY - rect.top) / rect.height) * 100;
      return {
        x: clampNumber(percentX - width / 2, 0, Math.max(0, 100 - width), (100 - width) / 2),
        y: clampNumber(percentY - 5, 0, 90, 50),
      };
    }
  }
  return { x: Math.max(0, (100 - width) / 2), y: 50 };
}

function addTextLayer(initialText = "") {
  pushSceneHistory();
  const layer = createSceneBlock(initialText);
  layer.type = "text";
  layer.isLocked = false;
  layer.name = t("layer.defaultTextLayerName", { n: scenes.length + 1 });
  Object.assign(layer, getTextLayerSpawnPosition(layer.width));
  scenes.unshift(layer);
  selectedSceneId = layer.id;
  selectedSceneIds = [layer.id];
  hoveredSceneId = "";
  expandedLayerIds.add(layer.id);
  renderScenes();
  switchMode();
  setSceneStatus(t("status.textLayerAdded"));
}

// Which per-scene sections (Pozisyon/Filtreler/Gecis efekti) the user has
// manually opened or closed - keyed by "sceneId:sectionKey". renderScenes()
// rebuilds every <details> element from scratch on every state change
// (including a change made INSIDE an open section, e.g. moving the
// transition-size slider), so without this the section would silently
// snap back to its default closed state on the very next input event.
let expandedLayerSections = new Map();

function createLayerSection(stateKey, title, openByDefault) {
  const section = document.createElement("details");
  section.className = "layer-section";
  const isOpen = expandedLayerSections.has(stateKey)
    ? expandedLayerSections.get(stateKey)
    : openByDefault;
  if (isOpen) section.open = true;
  section.addEventListener("toggle", () => {
    expandedLayerSections.set(stateKey, section.open);
  });
  const summary = document.createElement("summary");
  summary.className = "layer-section-title";
  summary.textContent = title;
  const body = document.createElement("div");
  body.className = "layer-section-body";
  section.append(summary, body);
  return { el: section, body };
}

function getSceneAccent(sceneId) {
  // Hashed from the layer's own id (not its position in the list) so a
  // layer keeps its color when it's reordered - only adding/removing
  // layers changes the palette, never a drag-reorder.
  const accents = ["#6f98ff", "#c69aff", "#5dde72", "#ff9f2e", "#ff6b7d", "#ffd447"];
  let hash = 0;
  for (let i = 0; i < sceneId.length; i++) {
    hash = (hash * 31 + sceneId.charCodeAt(i)) | 0;
  }
  return accents[Math.abs(hash) % accents.length];
}

function createControlIcon(icon) {
  if (!icon) return null;
  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon);
  iconEl.className = "range-control-icon";
  return iconEl;
}

function createRangeControl(labelText, value, min, max, step, onInput, icon) {
  const label = document.createElement("label");
  label.className = "range-control";
  const iconEl = createControlIcon(icon);
  const title = document.createElement("span");
  title.textContent = labelText;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const valueInput = document.createElement("input");
  valueInput.type = "number";
  valueInput.className = "range-control-value";
  valueInput.min = String(min);
  valueInput.max = String(max);
  valueInput.step = String(step);
  valueInput.value = formatControlValue(value);
  prepareSceneHistoryControl(input);
  prepareSceneHistoryControl(valueInput);

  const applyValue = (rawValue, current) => {
    const parsed = clampNumber(rawValue, min, max, current);
    input.value = String(parsed);
    valueInput.value = formatControlValue(parsed);
    onInput(parsed);
    return parsed;
  };

  input.addEventListener("input", () => applyValue(input.value, value));
  valueInput.addEventListener("change", () => applyValue(valueInput.value, Number(input.value)));
  valueInput.addEventListener("wheel", (event) => {
    event.preventDefault();
    applyValue(Number(input.value) + (event.deltaY < 0 ? step : -step), Number(input.value));
  }, { passive: false });
  input.addEventListener("wheel", (event) => {
    event.preventDefault();
    applyValue(Number(input.value) + (event.deltaY < 0 ? step : -step), Number(input.value));
  }, { passive: false });

  label.append(...(iconEl ? [iconEl] : []), title, input, valueInput);
  return label;
}

function createSelectControl(labelText, value, options, onChange, icon) {
  const label = document.createElement("label");
  label.className = "range-control";
  const iconEl = createControlIcon(icon);
  const title = document.createElement("span");
  title.textContent = labelText;
  const select = document.createElement("select");
  select.style.height = "24px";
  select.style.padding = "0 4px";
  select.style.fontSize = "10px";
  options.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.text;
    o.selected = opt.value === value;
    select.append(o);
  });
  select.addEventListener("change", () => onChange(select.value));
  label.append(...(iconEl ? [iconEl] : []), title, select);
  return label;
}

function formatControlValue(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function startSceneImagePan(event, scene) {
  if (scene.isLocked) return;
  if (isSpacePanning) return;
  if (event.button !== 0 || event.target.closest(".image-transform-handle")) return;
  const box = event.currentTarget;
  const stage = box.closest(".composite-stage");
  if (!stage) return;

  event.preventDefault();
  event.stopPropagation();
  const isGroupMember = selectedSceneIds.includes(scene.id) && selectedSceneIds.length > 1;
  if (!isGroupMember) setSelectedScene(scene.id);
  pushSceneHistory();
  const stageRect = stage.getBoundingClientRect();
  const startBoxRect = box.getBoundingClientRect();
  const visualWidth = startBoxRect.width;
  const visualHeight = startBoxRect.height;
  const startX = event.clientX;
  const startY = event.clientY;
  const initialX = scene.imageX || 0;
  const initialY = scene.imageY || 0;

  const groupIds = getGroupDragSceneIds(scene.id).filter((id) => id !== scene.id);
  const groupInitial = new Map(groupIds.map((id) => [id, getScenePosition(scenes.find((s) => s.id === id))]));

  box.setPointerCapture(event.pointerId);
  box.classList.add("moving");

  const onMove = (moveEvent) => {
    const deltaX = ((moveEvent.clientX - startX) / Math.max(1, stageRect.width)) * 100;
    const deltaY = ((moveEvent.clientY - startY) / Math.max(1, stageRect.height)) * 100;
    scene.imageX = roundPositionValue(initialX + deltaX);
    scene.imageY = roundPositionValue(initialY + deltaY);
    const snap = snapStageBox(stage, getImageVisualBox(stageRect, scene, visualWidth, visualHeight), { disabled: moveEvent.altKey, excludeSceneId: scene.id });
    scene.imageX = roundPositionValue(scene.imageX + (snap.deltaX / Math.max(1, stageRect.width)) * 100);
    scene.imageY = roundPositionValue(scene.imageY + (snap.deltaY / Math.max(1, stageRect.height)) * 100);
    updateSceneImageTransform(scene);
    if (groupIds.length) {
      applyGroupDragDelta(groupIds, groupInitial, scene.imageX - initialX, scene.imageY - initialY);
    }
  };

  const onUp = () => {
    clearSmartGuides(stage);
    box.classList.remove("moving");
    box.removeEventListener("pointermove", onMove);
    box.removeEventListener("pointerup", onUp);
    box.removeEventListener("pointercancel", onUp);
  };

  box.addEventListener("pointermove", onMove);
  box.addEventListener("pointerup", onUp);
  box.addEventListener("pointercancel", onUp);
}

function startStageResize(event, direction) {
  if (event.button !== 0) return;
  if (isSpacePanning) return;
  const handle = event.currentTarget;
  const stage = handle.closest(".composite-stage");
  if (!stage) return;

  event.preventDefault();
  event.stopPropagation();
  pushSceneHistory();
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = getSceneOutputWidth();
  const startHeight = getSceneBackgroundHeight();

  handle.setPointerCapture(event.pointerId);
  stage.classList.add("resizing-canvas");

  const onMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / Math.max(0.1, sceneViewportZoom);
    const deltaY = (moveEvent.clientY - startY) / Math.max(0.1, sceneViewportZoom);
    const nextWidth = Math.round((direction.includes("e") ? startWidth + deltaX : startWidth) / 10) * 10;
    const nextHeight = Math.round((direction.includes("s") ? startHeight + deltaY : startHeight) / 10) * 10;
    setSceneCanvasSize(nextWidth, nextHeight, stage);
  };

  const onUp = () => {
    stage.classList.remove("resizing-canvas");
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    renderScenes();
    setSceneStatus(t("status.canvasResized", { width: getSceneOutputWidth(), height: getSceneBackgroundHeight() }));
  };

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
}

function setSceneCanvasSize(width, height, stage) {
  const nextWidth = Math.round(clampNumber(width, 640, sceneCanvasMaxDimension, getSceneOutputWidth()));
  const nextHeight = Math.round(clampNumber(height, 300, sceneCanvasMaxDimension, getSceneBackgroundHeight()));
  sceneOutputWidth.value = nextWidth;
  sceneBackgroundHeight.value = nextHeight;
  saveState();
  if (stage) {
    stage.style.width = `${nextWidth}px`;
    stage.style.height = `${nextHeight}px`;
    const badge = stage.querySelector(".stage-size-badge");
    if (badge) badge.textContent = `${nextWidth} x ${nextHeight}`;
  }
  applySceneViewportZoom();
}

function startSceneImageScale(event, scene) {
  if (scene.isLocked) return;
  if (event.button !== 0) return;
  const handle = event.currentTarget;
  const box = handle.closest(".scene-image-transform-box");
  const stage = box?.closest(".composite-stage");
  if (!box || !stage) return;

  event.preventDefault();
  event.stopPropagation();
  setSelectedScene(scene.id);
  pushSceneHistory();
  const rect = box.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const handleName = handle.dataset.handle || handle.dataset.corner || "se";
  const isHorizontal = handleName.includes("e") || handleName.includes("w");
  const isVertical = handleName.includes("n") || handleName.includes("s");
  const isCorner = isHorizontal && isVertical;
  const startDistance = Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY));
  const startHorizontalDistance = Math.max(1, Math.abs(event.clientX - centerX));
  const startVerticalDistance = Math.max(1, Math.abs(event.clientY - centerY));
  const startZoom = scene.imageZoom || 100;
  const startScaleX = scene.imageScaleX || 100;
  const startScaleY = scene.imageScaleY || 100;
  const startEffectiveScaleX = Math.max(0.01, (startZoom / 100) * (startScaleX / 100));
  const startEffectiveScaleY = Math.max(0.01, (startZoom / 100) * (startScaleY / 100));
  const baseWidth = Math.max(1, rect.width / startEffectiveScaleX);
  const baseHeight = Math.max(1, rect.height / startEffectiveScaleY);
  const fixedLeft = rect.left - stageRect.left;
  const fixedRight = rect.right - stageRect.left;
  const fixedTop = rect.top - stageRect.top;
  const fixedBottom = rect.bottom - stageRect.top;

  const keepOppositeSideAnchored = () => {
    const effectiveScaleX = (scene.imageZoom || 100) / 100 * ((scene.imageScaleX || 100) / 100);
    const effectiveScaleY = (scene.imageZoom || 100) / 100 * ((scene.imageScaleY || 100) / 100);
    const scaledWidth = baseWidth * effectiveScaleX;
    const scaledHeight = baseHeight * effectiveScaleY;

    if (handleName === "e") {
      scene.imageX = roundPositionValue(((fixedLeft - (baseWidth - scaledWidth) / 2) / Math.max(1, stageRect.width)) * 100);
    } else if (handleName === "w") {
      scene.imageX = roundPositionValue(((fixedRight - (baseWidth + scaledWidth) / 2) / Math.max(1, stageRect.width)) * 100);
    } else if (handleName === "s") {
      scene.imageY = roundPositionValue(((fixedTop - (baseHeight - scaledHeight) / 2) / Math.max(1, stageRect.height)) * 100);
    } else if (handleName === "n") {
      scene.imageY = roundPositionValue(((fixedBottom - (baseHeight + scaledHeight) / 2) / Math.max(1, stageRect.height)) * 100);
    }
  };

  handle.setPointerCapture(event.pointerId);
  box.classList.add("scaling");

  const onMove = (moveEvent) => {
    if (isCorner) {
      const distance = Math.max(1, Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY));
      scene.imageZoom = roundScaleValue(startZoom * (distance / startDistance));
    } else if (isHorizontal) {
      const distance = Math.max(1, Math.abs(moveEvent.clientX - centerX));
      scene.imageScaleX = roundScaleValue(startScaleX * (distance / startHorizontalDistance));
      keepOppositeSideAnchored();
    } else if (isVertical) {
      const distance = Math.max(1, Math.abs(moveEvent.clientY - centerY));
      scene.imageScaleY = roundScaleValue(startScaleY * (distance / startVerticalDistance));
      keepOppositeSideAnchored();
    }
    updateSceneImageTransform(scene);
    if (moveEvent.altKey) clearSmartGuides(stage);
    else {
      const liveRect = box.getBoundingClientRect();
      snapStageBox(stage, {
        left: liveRect.left - stageRect.left,
        top: liveRect.top - stageRect.top,
        width: liveRect.width,
        height: liveRect.height,
      }, { allowX: true, allowY: true, excludeSceneId: scene.id });
    }
  };

  const onUp = () => {
    clearSmartGuides(stage);
    box.classList.remove("scaling");
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
  };

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
}

function roundScaleValue(value) {
  return Math.round(clampNumber(value, 5, 1200, 100) * 10) / 10;
}

function roundPositionValue(value) {
  return Math.round(clampNumber(value, -1000, 1000, 0) * 10) / 10;
}

function startSceneTextDrag(event, textBlock) {
  if (event.button !== 0) return;
  if (isSpacePanning) return;
  if (event.target.closest(".scene-resize-handle")) return;
  const block = event.currentTarget;
  const stage = block.closest(".composite-stage");
  if (!stage) return;

  event.preventDefault();
  event.stopPropagation();
  const isGroupMember = selectedSceneIds.includes(block.dataset.sceneId) && selectedSceneIds.length > 1;
  if (!isGroupMember) setSelectedScene(block.dataset.sceneId);
  if (textBlock.isLocked) return;
  pushSceneHistory();
  const stageRect = stage.getBoundingClientRect();
  const blockRect = block.getBoundingClientRect();
  const offsetX = event.clientX - blockRect.left;
  const offsetY = event.clientY - blockRect.top;
  const initialX = textBlock.x ?? 0;
  const initialY = textBlock.y ?? 0;

  const groupIds = getGroupDragSceneIds(textBlock.id).filter((id) => id !== textBlock.id);
  const groupInitial = new Map(groupIds.map((id) => [id, getScenePosition(scenes.find((s) => s.id === id))]));

  block.setPointerCapture(event.pointerId);
  block.classList.add("dragging");

  const moveBlock = (clientX, clientY, snapDisabled = false) => {
    const maxLeft = Math.max(0, stageRect.width - blockRect.width);
    const maxTop = Math.max(0, stageRect.height - blockRect.height);
    let left = Math.min(maxLeft, Math.max(0, clientX - stageRect.left - offsetX));
    let top = Math.min(maxTop, Math.max(0, clientY - stageRect.top - offsetY));
    const snap = snapStageBox(stage, {
      left,
      top,
      width: blockRect.width,
      height: blockRect.height,
    }, { disabled: snapDisabled, excludeSceneId: textBlock.id });
    left = Math.min(maxLeft, Math.max(0, left + snap.deltaX));
    top = Math.min(maxTop, Math.max(0, top + snap.deltaY));
    textBlock.x = (left / stageRect.width) * 100;
    textBlock.y = (top / stageRect.height) * 100;
    block.style.left = `${textBlock.x}%`;
    block.style.top = `${textBlock.y}%`;
    if (groupIds.length) {
      applyGroupDragDelta(groupIds, groupInitial, textBlock.x - initialX, textBlock.y - initialY);
    }
  };

  const onMove = (moveEvent) => moveBlock(moveEvent.clientX, moveEvent.clientY, moveEvent.altKey);
  const onUp = () => {
    clearSmartGuides(stage);
    block.classList.remove("dragging");
    block.removeEventListener("pointermove", onMove);
    block.removeEventListener("pointerup", onUp);
    block.removeEventListener("pointercancel", onUp);
  };

  block.addEventListener("pointermove", onMove);
  block.addEventListener("pointerup", onUp);
  block.addEventListener("pointercancel", onUp);
}

function startSceneTextResize(event, textBlock) {
  if (event.button !== 0) return;
  if (textBlock.isLocked) return;
  const handle = event.currentTarget;
  const block = handle.closest(".scene-text-block");
  const stage = block?.closest(".composite-stage");
  if (!block || !stage) return;

  event.preventDefault();
  event.stopPropagation();
  pushSceneHistory();
  const stageRect = stage.getBoundingClientRect();
  const blockRect = block.getBoundingClientRect();
  const startX = event.clientX;
  const startWidth = blockRect.width;
  const left = blockRect.left - stageRect.left;

  handle.setPointerCapture(event.pointerId);
  block.classList.add("resizing");

  const resizeBlock = (clientX, snapDisabled = false) => {
    const nextWidth = startWidth + clientX - startX;
    const minWidth = Math.min(260, stageRect.width * 0.42);
    const maxWidth = Math.max(minWidth, stageRect.width - left);
    let clampedWidth = Math.min(maxWidth, Math.max(minWidth, nextWidth));
    const snap = snapStageBox(stage, {
      left,
      top: blockRect.top - stageRect.top,
      width: clampedWidth,
      height: blockRect.height,
    }, { allowY: false, disabled: snapDisabled, excludeSceneId: textBlock.id });
    clampedWidth = Math.min(maxWidth, Math.max(minWidth, clampedWidth + snap.deltaX));
    textBlock.width = (clampedWidth / stageRect.width) * 100;
    block.style.width = `${textBlock.width}%`;
  };

  const onMove = (moveEvent) => resizeBlock(moveEvent.clientX, moveEvent.altKey);
  const onUp = () => {
    clearSmartGuides(stage);
    block.classList.remove("resizing");
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
  };

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
}

// Scales width/height down proportionally, if needed, to fit the total
// pixel budget - keeps the aspect ratio so the composite still looks like
// what the user configured, just smaller, rather than cropping or
// stretching it.
function clampCanvasPixelBudget(width, height) {
  const area = width * height;
  if (area <= sceneCanvasMaxPixels) return { width, height, scaled: false };
  const factor = Math.sqrt(sceneCanvasMaxPixels / area);
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
    scaled: true,
  };
}

async function buildCompositeCanvas() {
  ensureSceneModel();
  const images = new Map(await Promise.all(
    scenes
      .filter((scene) => scene.type !== "text" && scene.dataUrl)
      .map(async (scene) => [scene.id, await loadImage(scene.dataUrl)]),
  ));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const { width: outputWidth, height: outputHeight, scaled } = clampCanvasPixelBudget(
    getSceneOutputWidth(),
    getSceneBackgroundHeight(),
  );
  // Callers report their own final status ("PNG indirildi", "Yuklendi...")
  // right after this returns, which would immediately overwrite a status
  // message set here - so hand the scaled-down flag back on the canvas
  // itself instead, and let each caller fold it into its own message.
  canvas.budgetClamped = scaled;

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.fillStyle = sceneCanvasBackground;
  context.fillRect(0, 0, outputWidth, outputHeight);

  [...scenes].reverse().forEach((scene) => {
    if (scene.type === "text") {
      drawSceneTextBlock(context, scene.text, scene, outputWidth, outputHeight);
      return;
    }
    const image = images.get(scene.id);
    if (image) drawSceneLayerImage(context, image, scene, outputWidth, outputHeight);
  });

  return canvas;
}

async function downloadCompositeScene() {
  const canvas = await buildCompositeCanvas();
  const blob = await canvasToPngBlob(canvas);
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.download = `sahne-kompozit-${Date.now()}.png`;
  link.href = objectUrl;
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  link.click();
  setSceneStatus(canvas.budgetClamped
    ? t("status.canvasBudgetClamped", { width: canvas.width, height: canvas.height })
    : t("status.pngDownloaded"));
}

function showImgbbFallbackToast(bbcode) {
  document.querySelector(".imgbb-fallback-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "imgbb-fallback-toast";

  const header = document.createElement("div");
  header.className = "imgbb-fallback-toast-header";
  const title = document.createElement("span");
  title.textContent = t("toast.clipboardFallbackTitle");
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "layer-icon-btn";
  closeBtn.title = t("shortcuts.close");
  closeBtn.innerHTML = `<i data-lucide="x"></i>`;
  closeBtn.addEventListener("click", () => toast.remove());
  header.append(title, closeBtn);

  const row = document.createElement("div");
  row.className = "imgbb-fallback-toast-row";
  const input = document.createElement("input");
  input.type = "text";
  input.readOnly = true;
  input.value = bbcode;
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "layer-mini-btn";
  copyBtn.textContent = t("edit.copy");
  copyBtn.addEventListener("click", async () => {
    input.select();
    try {
      await navigator.clipboard.writeText(bbcode);
      setSceneStatus(t("status.imgbbUploadedCopied"));
      toast.remove();
    } catch {
      // Still can't use the async clipboard API - the input is selected,
      // so the user's own Ctrl+C keeps working as a manual fallback.
    }
  });
  row.append(input, copyBtn);

  toast.append(header, row);
  document.body.append(toast);
  if (window.lucide) window.lucide.createIcons();
  input.focus();
  input.select();
}

async function showUploadHistoryPanel() {
  document.querySelector(".imgbb-fallback-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "imgbb-fallback-toast upload-history-toast";

  const header = document.createElement("div");
  header.className = "imgbb-fallback-toast-header";
  const title = document.createElement("span");
  title.textContent = t("history.title");
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "layer-icon-btn";
  closeBtn.title = t("shortcuts.close");
  closeBtn.innerHTML = `<i data-lucide="x"></i>`;
  closeBtn.addEventListener("click", () => toast.remove());
  header.append(title, closeBtn);
  toast.append(header);

  document.body.append(toast);
  if (window.lucide) window.lucide.createIcons();

  let entries = [];
  try {
    entries = await readUploadHistory();
  } catch {
    entries = [];
  }
  if (!toast.isConnected) return; // closed while loading

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "upload-history-empty";
    empty.textContent = t("history.empty");
    toast.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "upload-history-item";

    const thumb = document.createElement("img");
    thumb.className = "upload-history-thumb";
    thumb.src = entry.thumbnailDataUrl;
    thumb.alt = "";
    row.append(thumb);

    const meta = document.createElement("div");
    meta.className = "upload-history-meta";
    const link = document.createElement("a");
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = entry.url;
    const dateLine = document.createElement("div");
    dateLine.textContent = new Date(entry.createdAt).toLocaleString();
    meta.append(link, dateLine);
    row.append(meta);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "layer-mini-btn";
    copyBtn.textContent = t("history.copy");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(entry.bbcode);
        setSceneStatus(t("history.copiedStatus"));
      } catch {
        showImgbbFallbackToast(entry.bbcode);
      }
    });
    row.append(copyBtn);

    toast.append(row);
  });
}

// Free-tier key, meant to live in client-side code (Persona has no backend -
// see README) - anyone viewing source can see it, but it only grants upload
// access to this account's ImgBB quota, nothing more sensitive.
const imgbbApiKey = "0f89bd300a14fa3bef8baa0bbb70416b";
const imgbbUploadTimeoutMs = 45_000;
const imgbbMaxUploadBytes = 32 * 1024 * 1024;
const imageLoadTimeoutMs = 20_000;
const pngEncodeTimeoutMs = 30_000;
const clipboardWriteTimeoutMs = 5_000;
let isImgbbUploadInFlight = false;

function promiseWithTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function canvasToPngBlob(canvas) {
  const encodePromise = new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG olusturulamadi."));
    }, "image/png");
  });
  return promiseWithTimeout(encodePromise, pngEncodeTimeoutMs, "PNG olusturma zaman asimina ugradi.");
}

function normalizeImgbbResultUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("ImgBB gorsel adresi dondurmedi.");
  if (/[\[\]]/.test(value)) throw new Error("ImgBB gecersiz bir gorsel adresi dondurdu.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ImgBB gecersiz bir gorsel adresi dondurdu.");
  }
  if (url.protocol !== "https:") throw new Error("ImgBB guvenli olmayan bir gorsel adresi dondurdu.");
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "ibb.co" && !hostname.endsWith(".ibb.co")) {
    throw new Error(t("error.imgbbUnexpectedHost"));
  }
  return url.href;
}

async function uploadCompositeSceneToImgbb() {
  if (isImgbbUploadInFlight) {
    setSceneStatus(t("status.imgbbInProgress"));
    return;
  }

  isImgbbUploadInFlight = true;
  uploadImgbbBtn.disabled = true;
  uploadImgbbBtn.setAttribute("aria-busy", "true");
  setSceneStatus(t("status.imgbbUploading"));
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), imgbbUploadTimeoutMs);

  try {
    const canvas = await buildCompositeCanvas();
    const blob = await canvasToPngBlob(canvas);
    if (blob.size > imgbbMaxUploadBytes) {
      throw new Error(t("error.imgbbSizeLimit"));
    }

    const form = new FormData();
    form.append("image", blob, `sahne-kompozit-${Date.now()}.png`);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new Error(result?.error?.message || (response.ok ? t("error.imgbbInvalidResponse") : t("error.serverError", { status: response.status })));
    }

    const url = normalizeImgbbResultUrl(result.data?.url);
    const bbcode = `[url=${url}][img]${url}[/img][/url]`;
    recordUploadHistory({
      id: Date.now(),
      url,
      bbcode,
      thumbnailDataUrl: createUploadThumbnail(canvas),
      createdAt: Date.now(),
    });
    const budgetNote = canvas.budgetClamped
      ? ` ${t("status.canvasBudgetClamped", { width: canvas.width, height: canvas.height })}`
      : "";
    const discordResult = await sendDiscordLinkMessage(url, bbcode);
    const discordNote = discordResult
      ? ` ${discordResult.ok ? t("status.discordShared") : t("status.discordShareFailed", { error: discordResult.error })}`
      : "";
    try {
      await promiseWithTimeout(
        navigator.clipboard.writeText(bbcode),
        clipboardWriteTimeoutMs,
        t("error.clipboardTimeout"),
      );
      setSceneStatus(t("status.imgbbUploadedCopied") + budgetNote + discordNote);
    } catch {
      // Upload itself succeeded - a clipboard permission issue shouldn't
      // strand the user without the link, so fall back to showing it. The
      // status bar text is truncated with an ellipsis at 260px (see
      // .menu-bar-status), so the BBCode itself would be unreadable there -
      // show it in a small fixed toast with a readonly, pre-selected input
      // instead, which the user can read in full and copy manually.
      setSceneStatus(t("status.imgbbUploadedNoCopy") + budgetNote + discordNote);
      showImgbbFallbackToast(bbcode);
    }
  } catch (error) {
    const message = error?.name === "AbortError"
      ? t("error.imgbbTimeout")
      : error?.message || t("error.unknown");
    setSceneStatus(t("status.imgbbUploadFailed", { error: message }));
  } finally {
    window.clearTimeout(timeoutId);
    isImgbbUploadInFlight = false;
    uploadImgbbBtn.disabled = false;
    uploadImgbbBtn.removeAttribute("aria-busy");
  }
}

const discordMessageTimeoutMs = 15_000;

function isValidDiscordWebhookUrl(url) {
  return /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+/i.test(url);
}

// No separate "share to Discord" action anymore - if a webhook is
// configured, every successful ImgBB upload also drops the link + BBCode
// into that channel as a plain text message (no PNG re-upload needed;
// Discord auto-embeds a preview from the raw image URL). Returns a
// {ok, error} result instead of touching setSceneStatus itself, so the
// caller can fold it into the main upload's own status message.
async function sendDiscordLinkMessage(url, bbcode) {
  const webhookUrl = discordWebhookInput.value.trim();
  if (!webhookUrl) return null;
  if (!isValidDiscordWebhookUrl(webhookUrl)) {
    return { ok: false, error: t("error.discordInvalidUrl") };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), discordMessageTimeoutMs);
  try {
    // The bbcode wraps the same URL twice ([url=X][img]X[/img][/url]) -
    // Discord doesn't dedupe repeated links, it unfurls a separate preview
    // per occurrence, so sending url + bbcode as plain text produced two
    // stacked image embeds for one upload. A fenced code block is exempt
    // from Discord's link-unfurling, so the bbcode line still renders as
    // exact, copy-pasteable text but no longer triggers its own preview(s) -
    // only the single bare url line above it does.
    const content = `${url}\n\`\`\`\n${bbcode}\n\`\`\``;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.message || t("error.serverError", { status: response.status }));
    }
    return { ok: true };
  } catch (error) {
    const message = error?.name === "AbortError" ? t("error.discordTimeout") : error?.message || t("error.unknown");
    return { ok: false, error: message };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function drawSceneLayerImage(context, image, scene, width, height) {
  const zoom = (scene.imageZoom || 100) / 100;
  const scaleX = (scene.imageScaleX || 100) / 100;
  const scaleY = (scene.imageScaleY || 100) / 100;
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const baseHeight = Math.round((naturalHeight * width) / Math.max(1, naturalWidth));
  const drawWidth = Math.ceil(width * zoom * scaleX);
  const drawHeight = Math.ceil(baseHeight * zoom * scaleY);
  const drawX = ((scene.imageX || 0) / 100) * width + (width - drawWidth) / 2;
  const drawY = ((scene.imageY || 0) / 100) * height + (baseHeight - drawHeight) / 2;

  // Temporary canvas to process filters and masks/transitions per layer
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = drawWidth;
  tempCanvas.height = drawHeight;
  const tempCtx = tempCanvas.getContext("2d");

  // Draw filtered image on temp canvas
  tempCtx.save();
  tempCtx.filter = getSceneImageFilter(scene);
  tempCtx.drawImage(image, 0, 0, drawWidth, drawHeight);
  tempCtx.restore();

  const style = scene.transitionStyle || "none";
  const transSize = scene.transitionStyle === "none" ? 0 : (scene.transitionSize ?? 150);
  const sides = scene.transitionSides || "both";

  if (style !== "none" && transSize > 0) {
    if (style === "soft") {
      tempCtx.save();
      tempCtx.globalCompositeOperation = "destination-in";
      const grad = tempCtx.createLinearGradient(0, 0, 0, drawHeight);
      if (sides === "both") {
        const stop1 = Math.min(1, transSize / drawHeight);
        const stop2 = Math.max(0, 1 - transSize / drawHeight);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(stop1, "rgba(0,0,0,1)");
        grad.addColorStop(stop2, "rgba(0,0,0,1)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
      } else if (sides === "top") {
        const stop = Math.min(1, transSize / drawHeight);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(stop, "rgba(0,0,0,1)");
      } else if (sides === "bottom") {
        const stop = Math.max(0, 1 - transSize / drawHeight);
        grad.addColorStop(stop, "rgba(0,0,0,1)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
      }
      tempCtx.fillStyle = grad;
      tempCtx.fillRect(0, 0, drawWidth, drawHeight);
      tempCtx.restore();
    } else if (style === "cinematic") {
      tempCtx.save();
      const gradTop = tempCtx.createLinearGradient(0, 0, 0, transSize);
      gradTop.addColorStop(0, "#000000");
      gradTop.addColorStop(1, "rgba(0,0,0,0)");

      const gradBottom = tempCtx.createLinearGradient(0, drawHeight - transSize, 0, drawHeight);
      gradBottom.addColorStop(0, "rgba(0,0,0,0)");
      gradBottom.addColorStop(1, "#000000");

      if (sides === "both" || sides === "top") {
        tempCtx.fillStyle = gradTop;
        tempCtx.fillRect(0, 0, drawWidth, transSize);
      }
      if (sides === "both" || sides === "bottom") {
        tempCtx.fillStyle = gradBottom;
        tempCtx.fillRect(0, drawHeight - transSize, drawWidth, transSize);
      }
      tempCtx.restore();
    } else if (style === "blur") {
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = drawWidth;
      blurCanvas.height = drawHeight;
      const blurCtx = blurCanvas.getContext("2d");

      blurCtx.save();
      blurCtx.filter = `blur(15px) ${getSceneImageFilter(scene)}`;
      blurCtx.drawImage(image, 0, 0, drawWidth, drawHeight);
      blurCtx.restore();

      blurCtx.save();
      blurCtx.globalCompositeOperation = "destination-in";
      const grad = blurCtx.createLinearGradient(0, 0, 0, drawHeight);
      if (sides === "both") {
        const stop1 = Math.min(1, transSize / drawHeight);
        const stop2 = Math.max(0, 1 - transSize / drawHeight);
        grad.addColorStop(0, "rgba(0,0,0,1)");
        grad.addColorStop(stop1, "rgba(0,0,0,0)");
        grad.addColorStop(stop2, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,1)");
      } else if (sides === "top") {
        const stop = Math.min(1, transSize / drawHeight);
        grad.addColorStop(0, "rgba(0,0,0,1)");
        grad.addColorStop(stop, "rgba(0,0,0,0)");
      } else if (sides === "bottom") {
        const stop = Math.max(0, 1 - transSize / drawHeight);
        grad.addColorStop(stop, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,1)");
      }
      blurCtx.fillStyle = grad;
      blurCtx.fillRect(0, 0, drawWidth, drawHeight);
      blurCtx.restore();

      tempCtx.drawImage(blurCanvas, 0, 0);
    }
  }

  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  context.drawImage(tempCanvas, drawX, drawY);
  context.restore();
}

function drawSceneTextBlock(context, text, textBlock, width, height) {
  const stageWidth = getSceneOutputWidth() || 934;
  const scale = width / Math.max(1, stageWidth);
  const blockWidth = Math.min(width - getScenePadding() * scale * 2, Math.round(width * (textBlock.width || 88) / 100));
  const fontSize = (textBlock.fontSize || getSceneFontSize()) * scale;
  const lineHeight = fontSize * (textBlock.lineHeight || 1.18);
  const padding = getScenePadding() * scale;
  const maxWidth = blockWidth - padding * 2;
  const x = (textBlock.x / 100) * width;
  const y = (textBlock.y / 100) * height;

  context.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.textBaseline = "top";
  if ("letterSpacing" in context) context.letterSpacing = `${(textBlock.letterSpacing || 0) * scale}px`;
  const sceneOptions = { ...getOptions(), fontSize, lineGap: lineHeight - fontSize };
  const wrapped = parseLines(text).flatMap((line) => wrapLine(context, line, maxWidth, sceneOptions));
  if (!wrapped.length) return;

  const boxHeight = padding * 2 + wrapped.length * lineHeight;
  const textStyle = textBlock.textStyle || "box";
  if (textStyle === "box" || textStyle === "boxSoft") {
    context.fillStyle = textStyle === "boxSoft" ? "rgba(0, 0, 0, 0.6)" : "#000000";
    context.fillRect(x, y, blockWidth, boxHeight);
  }

  const textEffect = (textStyle === "box" || textStyle === "boxSoft") ? "plain" : textStyle;
  wrapped.forEach((line, index) => {
    drawSegmentedText(context, line.segments, x + padding, y + padding + index * lineHeight, { ...sceneOptions, textEffect });
  });
}

function getSceneFontSize() {
  return clampNumber(sceneFontSize.value, 10, 42, 18);
}

function getSceneOutputWidth() {
  const val = parseInt(sceneOutputWidth.value, 10);
  if (isNaN(val)) return sceneCanvasDefaultWidth;
  return Math.max(640, Math.min(sceneCanvasMaxDimension, val));
}

function getScenePreviewWidth() {
  return getSceneOutputWidth();
}

function getSceneBackgroundHeight() {
  const val = parseInt(sceneBackgroundHeight.value, 10);
  if (isNaN(val)) return sceneCanvasDefaultHeight;
  return Math.max(300, Math.min(sceneCanvasMaxDimension, val));
}

function getSceneTransitionSize() {
  if (getSceneTransitionStyle() === "none") return 0;
  const parsed = clampNumber(sceneTransitionSize.value, 0, 600, sceneTransitionPx);
  sceneTransitionSize.value = parsed;
  return parsed;
}

function getSceneTransitionStyle() {
  const value = sceneTransitionStyle.value;
  return ["soft", "cinematic", "blur", "none"].includes(value) ? value : "soft";
}

function getSceneTransitionSides() {
  const value = sceneTransitionSides.value;
  return ["both", "top", "bottom"].includes(value) ? value : "both";
}

function getScenePreviewHeight() {
  return getSceneBackgroundHeight();
}

function getScenePadding() {
  return clampNumber(scenePadding.value, 4, 80, 18);
}

function getSavedLayersWidth() {
  const savedWidth = Number(getClientStoredValue(storageKeys.layersWidth));
  if (!Number.isFinite(savedWidth)) return 380;
  return clampNumber(savedWidth, 320, 640, 380);
}

function getSavedLayersHeight() {
  const savedHeight = Number(getClientStoredValue(storageKeys.layersHeight));
  if (!Number.isFinite(savedHeight)) return 320;
  return clampNumber(savedHeight, 220, 640, 320);
}

function getSavedLayersDock() {
  const saved = getClientStoredValue(storageKeys.layersDock);
  // "top" used to be a valid dock, but a wide-short strip at the top is a
  // bad fit for what's fundamentally a vertical card list - it was removed
  // as an option. Any previously-saved "top" falls back to "right".
  return ["left", "bottom", "right"].includes(saved) ? saved : "right";
}

function applyLayersDock(dock) {
  document.body.classList.remove("layers-dock-left", "layers-dock-bottom");
  if (dock === "left") document.body.classList.add("layers-dock-left");
  else if (dock === "bottom") document.body.classList.add("layers-dock-bottom");
  localStorage.setItem(clientStorageKey(storageKeys.layersDock), dock);
}

function getCurrentLayersDock() {
  if (document.body.classList.contains("layers-dock-left")) return "left";
  if (document.body.classList.contains("layers-dock-bottom")) return "bottom";
  return "right";
}

function getLayersPanelResizeEdgeInfo() {
  const panel = document.querySelector(".scene-layers-panel");
  if (!panel || panel.closest(".dockable-panel.floating")) return null;
  const panelRect = panel.getBoundingClientRect();
  const dock = getCurrentLayersDock();
  const isVertical = dock === "bottom";
  const edge = dock === "left" ? panelRect.right
    : dock === "bottom" ? panelRect.top
    : panelRect.left;
  return { panel, panelRect, dock, isVertical, edge };
}

function isNearLayersPanelResizeEdge(event) {
  const info = getLayersPanelResizeEdgeInfo();
  if (!info) return false;
  const pointerCoord = info.isVertical ? event.clientY : event.clientX;
  return Math.abs(pointerCoord - info.edge) <= 14;
}

function startLayersPanelResize(event) {
  const info = getLayersPanelResizeEdgeInfo();
  if (!info) return;
  const { panelRect, dock, isVertical, edge } = info;
  const pointerCoord = isVertical ? event.clientY : event.clientX;
  if (Math.abs(pointerCoord - edge) > 14) return;

  event.preventDefault();
  const startCoord = pointerCoord;
  const startSize = isVertical ? panelRect.height : panelRect.width;

  const onMove = (moveEvent) => {
    const moveCoord = isVertical ? moveEvent.clientY : moveEvent.clientX;
    const delta = moveCoord - startCoord;
    if (isVertical) {
      // isVertical is only true for the "bottom" dock now that "top" is gone.
      const height = clampNumber(startSize - delta, 220, 640, startSize);
      appShell.style.setProperty("--layers-height", `${height}px`);
      localStorage.setItem(clientStorageKey(storageKeys.layersHeight), String(Math.round(height)));
    } else {
      const width = clampNumber(dock === "left" ? startSize + delta : startSize - delta, 320, 640, startSize);
      appShell.style.setProperty("--layers-width", `${width}px`);
      localStorage.setItem(clientStorageKey(storageKeys.layersWidth), String(Math.round(width)));
    }
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.body.classList.remove("resizing-layers");
  };

  document.body.classList.add("resizing-layers");
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function createPanelResizeHandles() {
  return ["n", "e", "s", "w", "ne", "nw", "se", "sw"].map((direction) => {
    const handle = document.createElement("span");
    handle.className = `panel-resize-handle ${direction}`;
    handle.dataset.resizeDirection = direction;
    handle.title = t("canvas.panelResizeTitle");
    handle.addEventListener("pointerdown", startFloatingPanelResize);
    return handle;
  });
}

function startFloatingPanelResize(event) {
  const handle = event.target.closest(".panel-resize-handle");
  const panel = handle?.closest(".scene-layers-panel.dockable-panel.floating");
  if (!handle || !panel) return;

  event.preventDefault();
  event.stopPropagation();

  const direction = handle.dataset.resizeDirection || "";
  const startRect = panel.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const minWidth = 300;
  const minHeight = 220;
  const edgeGap = 12;

  const onMove = (moveEvent) => {
    moveEvent.preventDefault();
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    let left = startRect.left;
    let top = startRect.top;
    let width = startRect.width;
    let height = startRect.height;

    if (direction.includes("e")) {
      width = clampNumber(startRect.width + dx, minWidth, window.innerWidth - edgeGap - startRect.left, startRect.width);
    }
    if (direction.includes("s")) {
      height = clampNumber(startRect.height + dy, minHeight, window.innerHeight - edgeGap - startRect.top, startRect.height);
    }
    if (direction.includes("w")) {
      left = clampNumber(startRect.left + dx, edgeGap, startRect.right - minWidth, startRect.left);
      width = startRect.right - left;
    }
    if (direction.includes("n")) {
      top = clampNumber(startRect.top + dy, edgeGap, startRect.bottom - minHeight, startRect.top);
      height = startRect.bottom - top;
    }

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.width = `${Math.round(width)}px`;
    panel.style.height = `${Math.round(height)}px`;
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.body.classList.remove("resizing-floating-panel");
  };

  document.body.classList.add("resizing-floating-panel");
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  const loadPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  return promiseWithTimeout(loadPromise, imageLoadTimeoutMs, "Gorsel yukleme zaman asimina ugradi.");
}

function safeFilePart(value) {
  return value.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "scene";
}

function setSceneStatus(message) {
  sceneStatus.textContent = message;
}

function applyGlobalTransitionToAllScenes() {
  const style = sceneTransitionStyle.value;
  const size = Number(sceneTransitionSize.value) || 150;
  const sides = sceneTransitionSides.value;
  scenes.forEach((scene) => {
    if (scene.type === "text") return;
    scene.transitionStyle = style;
    scene.transitionSize = size;
    scene.transitionSides = sides;
  });
}

function setDateDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  controls.startDate.value = today;
  controls.endDate.value = today;
}

Object.values(controls).forEach((control) => control.addEventListener("input", saveState));
sceneOutputWidth.addEventListener("input", () => {
  saveState();
  renderScenes();
});
sceneOutputWidth.addEventListener("change", () => {
  sceneOutputWidth.value = getSceneOutputWidth();
  saveState();
  renderScenes();
});
sceneBackgroundHeight.addEventListener("input", () => {
  saveState();
  renderScenes();
});
sceneBackgroundHeight.addEventListener("change", () => {
  sceneBackgroundHeight.value = getSceneBackgroundHeight();
  saveState();
  renderScenes();
});
prepareSceneHistoryControl(sceneTransitionSize);
prepareSceneHistoryControl(sceneTransitionStyle);
prepareSceneHistoryControl(sceneTransitionSides);
sceneTransitionSize.addEventListener("input", () => {
  applyGlobalTransitionToAllScenes();
  saveState();
  renderScenes();
});
sceneTransitionStyle.addEventListener("change", () => {
  applyGlobalTransitionToAllScenes();
  saveState();
  renderScenes();
  setSceneStatus(t("status.transitionApplied"));
});
sceneTransitionSides.addEventListener("change", () => {
  applyGlobalTransitionToAllScenes();
  saveState();
  renderScenes();
  setSceneStatus(t("status.transitionApplied"));
});
prepareSceneHistoryControl(sceneFontSize);
sceneFontSize.addEventListener("input", () => {
  saveState();
  applyGlobalSceneFontSize();
});
scenePadding.addEventListener("input", refreshSceneStyles);
window.addEventListener("resize", () => {
  renderScenes();
});
downloadBtn.addEventListener("click", handleMainDownload);
copySceneBtn.addEventListener("click", handleCopyScene);
uploadImgbbBtn.addEventListener("click", uploadCompositeSceneToImgbb);
uploadHistoryBtn.addEventListener("click", showUploadHistoryPanel);
discordWebhookInput.value = localStorage.getItem("personaDiscordWebhook") || "";
discordWebhookInput.addEventListener("change", () => {
  localStorage.setItem("personaDiscordWebhook", discordWebhookInput.value.trim());
});
sceneImageInput.addEventListener("change", () => addSceneImages(sceneImageInput.files));
blankSceneBtn.addEventListener("click", addBlankScene);
cetvelToggleBtn.classList.toggle("active", cetvelEnabled);
cetvelToggleBtn.addEventListener("click", () => {
  setCetvelEnabled(!cetvelEnabled);
  cetvelToggleBtn.classList.toggle("active", cetvelEnabled);
  setSceneStatus(cetvelEnabled ? t("status.cetvelOn") : t("status.cetvelOff"));
});
exportSceneProjectBtn.addEventListener("click", exportSceneProject);
sceneProjectInput.addEventListener("change", importSceneProject);
clearScenesBtn.addEventListener("click", clearScenes);
hideShortcutsBtn.addEventListener("click", hideShortcuts);
showShortcutsBtn.addEventListener("click", showShortcuts);
document.querySelector(".preview-panel").addEventListener("pointerdown", startLayersPanelResize);

languageSelect.value = getLanguage();
translateStaticDom();
languageSelect.addEventListener("change", () => {
  setLanguage(languageSelect.value);
});
onLanguageChange(() => {
  translateStaticDom();
  renderAboutPanel();
  renderScenes();
  renderIdeaCategoryOptions();
});

renderIdeaCategoryOptions();
ideaNewBtn.addEventListener("click", showRandomIdea);

initMenuBar();
renderAboutPanel();
document.querySelector("#aboutChangelogPrev").addEventListener("click", (event) => {
  event.stopPropagation();
  aboutChangelogPage -= 1;
  renderAboutPanel();
});
document.querySelector("#aboutChangelogNext").addEventListener("click", (event) => {
  event.stopPropagation();
  aboutChangelogPage += 1;
  renderAboutPanel();
});
document.addEventListener("paste", handlePaste);
document.addEventListener("pointermove", (event) => {
  lastPointerClientX = event.clientX;
  lastPointerClientY = event.clientY;
});
window.addEventListener("wheel", handleSceneWheel, { passive: false, capture: true });
window.addEventListener("keydown", handleSceneKeyDown);
window.addEventListener("keyup", handleSceneKeyUp);
window.addEventListener("beforeunload", () => {
  saveState();
  saveLocalScenesNow().catch(() => {});
});
document.addEventListener("pointerdown", startSceneViewportPan);

switchMode();
loadLocalScenes().catch(() => setSceneStatus(t("status.localLoadFailed")));
if (window.lucide) window.lucide.createIcons();

/* ── Window Manager (Dock & Float) ── */
document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".panel-drag-handle");
  if (!handle) return;
  if (e.target.closest(".layer-window-button, .panel-resize-handle")) return;
  
  const panel = handle.closest(".scene-layers-panel");
  if (!panel) return;

  e.preventDefault();

  const isLayersPanel = panel.classList.contains("scene-layers-panel");

  const rect = panel.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  let indicator = document.querySelector(".dock-drop-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "dock-drop-indicator";
    document.body.appendChild(indicator);
  }

  // Setup dragging state
  panel.classList.add("dockable-panel", "floating", "dragging");
  
  if (isLayersPanel) {
    document.body.classList.add("layers-floating");
    document.body.classList.remove("layers-hidden");
  }

  // A left/right-docked panel is full-height and a bottom-docked one is
  // full-width; carrying that dimension over verbatim makes the detached
  // floating window mostly empty space. Fall back to the other dock type's
  // saved size instead, which is already a sensible panel size.
  const dockBeforeFloat = isLayersPanel ? getCurrentLayersDock() : null;
  const startWidth = dockBeforeFloat === "bottom"
    ? getSavedLayersWidth()
    : Math.min(rect.width, window.innerWidth - 24);
  const startHeight = dockBeforeFloat === "left" || dockBeforeFloat === "right"
    ? getSavedLayersHeight()
    : Math.min(rect.height, window.innerHeight - 24);
  panel.style.width = `${Math.min(startWidth, window.innerWidth - 24)}px`;
  panel.style.height = `${Math.min(startHeight, window.innerHeight - 24)}px`;
  panel.style.left = rect.left + "px";
  panel.style.top = rect.top + "px";
  
  let currentDock = null;
  const dockZone = 130;

  // Floating panels sit at a higher z-index than the top menu bar so they
  // can be dragged above scene content; keeping the drag's top bound below
  // the menu bar's height (44px) stops a floating panel from ever being
  // parked on top of it and swallowing menu clicks.
  const minTop = 52;

  const onPointerMove = (moveEvent) => {
    moveEvent.preventDefault();
    const maxLeft = Math.max(12, window.innerWidth - panel.offsetWidth - 12);
    const maxTop = Math.max(minTop, window.innerHeight - panel.offsetHeight - 12);
    const newLeft = clampNumber(moveEvent.clientX - offsetX, 12, maxLeft, 12);
    const newTop = clampNumber(moveEvent.clientY - offsetY, minTop, maxTop, minTop);
    panel.style.left = newLeft + "px";
    panel.style.top = newTop + "px";

    if (!isLayersPanel) {
      currentDock = null;
      indicator.style.display = "none";
      return;
    }

    // Determine nearest edge drop zone. No "top" zone on purpose: a wide,
    // short strip at the top is a bad fit for what's fundamentally a
    // vertical card list - dragging up there just leaves the panel
    // floating instead of forcing a dock.
    const distLeft = moveEvent.clientX;
    const distRight = window.innerWidth - moveEvent.clientX;
    const distBottom = window.innerHeight - moveEvent.clientY;
    const minDist = Math.min(distLeft, distRight, distBottom);

    if (minDist > dockZone) {
      currentDock = null;
      indicator.style.display = "none";
      return;
    }

    const dockWidth = getSavedLayersWidth();
    const dockHeight = getSavedLayersHeight();
    if (minDist === distLeft) {
      currentDock = "left";
      indicator.style.left = "0";
      indicator.style.top = "0";
      indicator.style.width = `${dockWidth}px`;
      indicator.style.height = "100vh";
    } else if (minDist === distRight) {
      currentDock = "right";
      indicator.style.left = `${window.innerWidth - dockWidth}px`;
      indicator.style.top = "0";
      indicator.style.width = `${dockWidth}px`;
      indicator.style.height = "100vh";
    } else {
      currentDock = "bottom";
      indicator.style.left = "0";
      indicator.style.top = `${window.innerHeight - dockHeight}px`;
      indicator.style.width = "100vw";
      indicator.style.height = `${dockHeight}px`;
    }
    indicator.style.display = "block";
  };

  const onPointerUp = (upEvent) => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);

    panel.classList.remove("dragging");
    indicator.style.display = "none";

    // Docking logic
    if (currentDock && isLayersPanel) {
      panel.classList.remove("floating", "dockable-panel");
      document.body.classList.remove("layers-floating");
      panel.style.width = "";
      panel.style.height = "";
      panel.style.left = "";
      panel.style.top = "";
      applyLayersDock(currentDock);
    }
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
});

// ── Debug surface ──
// app.js is an ES module now (see index.html), so its top-level bindings
// are no longer reachable from the page's global scope the way a classic
// script's were. This exposes a small, explicit surface for console
// debugging - getters/setters for the mutable state so they stay live
// instead of going stale after the next reassignment.
window.__persona = {
  get scenes() { return scenes; },
  get selectedSceneIds() { return selectedSceneIds; },
  set selectedSceneIds(value) { selectedSceneIds = value; },
  get selectedSceneId() { return selectedSceneId; },
  set selectedSceneId(value) { selectedSceneId = value; },
  get expandedLayerIds() { return expandedLayerIds; },
  get hoveredSceneId() { return hoveredSceneId; },
  set hoveredSceneId(value) { hoveredSceneId = value; },
  renderScenes,
  applyLayersDock,
  getCurrentLayersDock,
  addTextLayer,
  addBlankScene,
  addSceneImages,
  setSelectedScene,
  toggleSceneSelection,
  selectSceneRange,
  selectAllScenes,
  clearSceneSelection,
  copySelectedScenes,
  cutSelectedScenes,
  pasteSceneClipboard,
  duplicateSelectedScenes,
  removeScene,
  removeScenes,
  undoSceneHistory,
  redoSceneHistory,
  showShortcuts,
  hideShortcuts,
  drawSceneTextBlock,
  createExampleScenes,
};
