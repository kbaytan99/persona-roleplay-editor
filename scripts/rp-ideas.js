"use strict";

// Static roleplay scenario prompts for the "Fikir" (Idea) menu - a small,
// hand-picked starting list per category, not an attempt at an exhaustive
// taxonomy. Each idea carries its own tr/en text (kept together here rather
// than split into scripts/i18n.js, since the two are always used as a pair).
// group is "legal" or "illegal", used only to organize the category select
// into two <optgroup>s.

export const rpIdeaCategories = [
  {
    id: "pd",
    group: "legal",
    label: { tr: "Polis Departmanı (PD)", en: "Police Department (PD)" },
    ideas: [
      { tr: "Rutin bir trafik kontrolünde şüpheli bir araç durduruyorsun, sürücü gergin davranıyor.", en: "You pull over a suspicious vehicle during a routine traffic stop; the driver seems nervous." },
      { tr: "Bir soygun ihbarı geliyor, olay yerine ilk sen varıyorsun.", en: "A robbery call comes in and you're first on scene." },
      { tr: "Ortağınla birlikte bir rehine krizini çözmeye çalışıyorsunuz.", en: "You and your partner are trying to resolve a hostage situation." },
      { tr: "Şehirde artan çete çatışmaları için özel bir operasyon planlıyorsunuz.", en: "You're planning a special operation to respond to rising gang violence in the city." },
      { tr: "Yeni bir çaylak polisi göreve alıştırıyorsun.", en: "You're breaking in a rookie officer on their first shift." },
      { tr: "Bir tanığı korumak için gizli görevdesin.", en: "You're on a covert assignment to protect a witness." },
    ],
  },
  {
    id: "md",
    group: "legal",
    label: { tr: "Sağlık Departmanı (MD)", en: "Medical Department (MD)" },
    ideas: [
      { tr: "Yoğun bir trafik kazasına müdahale ediyorsun, birden fazla yaralı var.", en: "You respond to a major traffic accident with multiple injured." },
      { tr: "Hastanede gece nöbetindesin, beklenmedik bir acil vaka geliyor.", en: "You're on night shift at the hospital when an unexpected emergency comes in." },
      { tr: "Bir çatışma sonrası yaralı bir çete üyesini tedavi etmen gerekiyor, etik bir ikilemle karşılaşıyorsun.", en: "You have to treat an injured gang member after a shootout and face an ethical dilemma." },
      { tr: "Yeni bir stajyer doktoru eğitiyorsun.", en: "You're training a new medical intern." },
      { tr: "Şehirde yayılan gizemli bir hastalık vakasını araştırıyorsun.", en: "You're investigating a mysterious illness spreading through the city." },
      { tr: "Sahada bir ambulans ekibiyle birlikte zor bir kurtarma operasyonuna katılıyorsun.", en: "You join an ambulance crew on a difficult field rescue." },
    ],
  },
  {
    id: "other-legal",
    group: "legal",
    label: { tr: "Diğer (Mekanik/Taksi/Hükümet)", en: "Other (Mechanic/Taxi/Government)" },
    ideas: [
      { tr: "Bir müşterinin garip şekilde hasarlı aracını tamir ederken şüpheli izler buluyorsun.", en: "While repairing a customer's strangely damaged car, you notice suspicious signs." },
      { tr: "Şehrin farklı köşelerinden yolcular taşıyan bir taksi şoförüsün, ilginç bir yolcuyla karşılaşıyorsun.", en: "As a taxi driver picking up passengers across town, you meet an unusually interesting fare." },
      { tr: "Belediyede yeni bir projeyi hayata geçirmeye çalışıyorsun ama bürokratik engellerle karşılaşıyorsun.", en: "You're trying to push a new city project through, but run into bureaucratic obstacles." },
      { tr: "Bir basın toplantısı düzenleyip şehirdeki son gelişmeleri halka duyuruyorsun.", en: "You hold a press conference to announce the latest developments in the city." },
      { tr: "Küçük bir işletme kuruyorsun ve ilk müşterilerini karşılıyorsun.", en: "You're starting a small business and greeting your first customers." },
      { tr: "Şehir konseyi toplantısında tartışmalı bir konuda oy kullanman gerekiyor.", en: "You have to cast a vote on a controversial issue at the city council meeting." },
    ],
  },
  {
    id: "gangs",
    group: "illegal",
    label: { tr: "Çeteler", en: "Gangs" },
    ideas: [
      { tr: "Rakip bir çete bölgenize sızmaya çalışıyor, buna nasıl karşılık vereceksiniz?", en: "A rival gang is trying to move into your territory - how do you respond?" },
      { tr: "Yeni bir üyeyi çeteye kabul etmeden önce güvenini test ediyorsunuz.", en: "You're testing a prospective member's loyalty before letting them join." },
      { tr: "Çete içinde liderlik konusunda bir anlaşmazlık çıkıyor.", en: "A dispute over leadership breaks out within the gang." },
      { tr: "Gizli bir buluşma noktasında rakip çeteyle anlaşma yapmayı deniyorsunuz.", en: "You're trying to broker a deal with a rival gang at a secret meeting point." },
      { tr: "Bölgenizi genişletmek için yeni bir plan yapıyorsunuz.", en: "You're drawing up a new plan to expand your territory." },
      { tr: "Polis baskınından kaçmaya çalışıyorsunuz.", en: "You're trying to escape a police raid." },
    ],
  },
  {
    id: "cartel",
    group: "illegal",
    label: { tr: "Kartel", en: "Cartel" },
    ideas: [
      { tr: "Büyük bir sevkiyatın güvenliğini sağlamakla görevlisiniz.", en: "You're tasked with securing a large shipment." },
      { tr: "Kartel içinde güven sarsılıyor, bir hain olabileceğinden şüpheleniliyor.", en: "Trust within the cartel is breaking down - someone suspects there's an informant." },
      { tr: "Rakip bir kartelle bölge anlaşmazlığı yaşanıyor.", en: "A territorial dispute erupts with a rival cartel." },
      { tr: "Yeni bir rota/bağlantı kurmaya çalışıyorsunuz.", en: "You're trying to establish a new route or connection." },
      { tr: "Kartel liderinin gizli kimliğini korumaya çalışıyorsunuz.", en: "You're working to protect the cartel leader's hidden identity." },
      { tr: "Beklenmedik bir müdahale planlarınızı bozuyor.", en: "An unexpected interference throws your plans into chaos." },
    ],
  },
  {
    id: "heist",
    group: "illegal",
    label: { tr: "Soygun", en: "Heist" },
    ideas: [
      { tr: "Bir banka soygunu için detaylı bir plan hazırlıyorsunuz.", en: "You're drawing up a detailed plan for a bank heist." },
      { tr: "Ekip içinde biri planı ihlal ediyor, kriz yönetimi gerekiyor.", en: "Someone on the crew breaks from the plan and you need to manage the fallout." },
      { tr: "Soygun sırasında beklenmedik bir güvenlik önlemiyle karşılaşıyorsunuz.", en: "You run into an unexpected security measure mid-heist." },
      { tr: "Kaçış rotanız polis tarafından kesiliyor, alternatif plan devreye giriyor.", en: "Your escape route gets cut off by the police and you fall back on a backup plan." },
      { tr: "Soygundan sonra parayı paylaşırken anlaşmazlık çıkıyor.", en: "A dispute breaks out over splitting the money after the heist." },
      { tr: "Büyük bir vurgun için farklı yeteneklere sahip bir ekip kuruyorsunuz.", en: "You're assembling a crew with different skill sets for a big score." },
    ],
  },
];
