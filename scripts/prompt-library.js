"use strict";

// Static AI prompt templates for the "Promptlar" menu - each one is meant
// to be copied and pasted into an external AI chat (ChatGPT, Claude, vb.)
// to generate roleplay text in the exact format Persona's own text engine
// understands (scripts/rp-text.js): "*" emote lines, "** Isim durum"
// shorthand, "(( ... ))" OOC lines. Kept Turkish-only for now, unlike the
// UI chrome around it - these are content templates for a Turkish RP
// audience, not UI strings.

const formatRules = `
Bicim kurallari (cok onemli, aynen uy):
- Aksiyon/emote satirlari "*" ile basin. Ornek: "* Araçtan iner, çevresine bakinir."
- "**" ile baslayan bir satir "** Isim Soyisim durum" seklinde yazilirsa bu otomatik olarak "* durum (( Isim Soyisim ))" haline gelir; istersen bu kisayolu kullanabilirsin.
- Karakter konusmalari duz metin olarak, istersen "Isim Soyisim: soz" formatinda yaz.
- Oyun disi (OOC) notlar ayri bir satirda "(( ... ))" icinde olsun, RP akisina karismasin.
- Ciktiyi dogrudan kopyala-yapistir yapabilecegim duz metin olarak ver, markdown baslik/liste isaretleri kullanma.`.trim();

export const promptCategories = [
  {
    id: "chatlog-image",
    label: { tr: "Chat log'lu + Resimli" },
    prompt: `Bir GTA roleplay sunucusunda gecen, [BURAYA KONUYU YAZ: orn. "bir trafik kontrolu sahnesi" / "hastanede acil bir vaka" / "bir cete toplantisi"] konulu bir sahne icin hem karakter-ici (IC) bir chat log hem de bu sahneye uygun bir arka plan gorseli onerisi uret.

${formatRules}
- Log, gercek bir sunucu chat kaydi gibi hissettirsin: sistem/departman etiketli satirlar da ekle, orn. "[CH: Los Santos Polis Departmani]" veya "[S: Sokak]" gibi kose parantezli basliklarla baslayan satirlar kullanabilirsin.
- En az 8-12 satirlik akici, birbirine baglanan bir sahne olsun; sadece tek yonlu monolog degil, en az iki karakter arasinda gecsin.

Sahne bittikten sonra ayri bir baslikla "ONERILEN GORSEL:" yaz ve bu sahneye uygun ne turden bir arka plan/fotograf kullanilmasi gerektigini 1-2 cumleyle tarif et (isik, mekan, atmosfer gibi detaylar dahil).`,
  },
  {
    id: "chatlog-noimage",
    label: { tr: "Chat log'lu + Resimsiz" },
    prompt: `Bir GTA roleplay sunucusunda gecen, [BURAYA KONUYU YAZ: orn. "bir trafik kontrolu sahnesi" / "hastanede acil bir vaka" / "bir cete toplantisi"] konulu bir sahne icin karakter-ici (IC) bir chat log uret. Gorsel onerisine gerek yok, ben kendi gorselimi kullanacagim.

${formatRules}
- Log, gercek bir sunucu chat kaydi gibi hissettirsin: sistem/departman etiketli satirlar da ekle, orn. "[CH: Los Santos Polis Departmani]" veya "[S: Sokak]" gibi kose parantezli basliklarla baslayan satirlar kullanabilirsin.
- En az 8-12 satirlik akici, birbirine baglanan bir sahne olsun; sadece tek yonlu monolog degil, en az iki karakter arasinda gecsin.`,
  },
  {
    id: "nochatlog-image",
    label: { tr: "Chat log'suz + Resimli" },
    prompt: `Bir GTA roleplay sunucusunda gecen, [BURAYA KONUYU YAZ: orn. "bir arac tamiri" / "bir bar sohbeti" / "gerilim dolu bir yol kenari karsilasmasi"] konulu, sade bir anlati (emote + diyalog) sahnesi ile bu sahneye uygun bir arka plan gorseli onerisi uret. Sistem/departman etiketli satirlar veya sahte chat log formati ISTEMIYORUM - sadece dogal bir RP anlatimi.

${formatRules}
- En az 6-10 satirlik akici bir sahne olsun; sadece tek yonlu monolog degil, en az iki karakter arasinda gecsin.

Sahne bittikten sonra ayri bir baslikla "ONERILEN GORSEL:" yaz ve bu sahneye uygun ne turden bir arka plan/fotograf kullanilmasi gerektigini 1-2 cumleyle tarif et (isik, mekan, atmosfer gibi detaylar dahil).`,
  },
  {
    id: "nochatlog-noimage",
    label: { tr: "Chat log'suz + Resimsiz" },
    prompt: `Bir GTA roleplay sunucusunda gecen, [BURAYA KONUYU YAZ: orn. "bir arac tamiri" / "bir bar sohbeti" / "gerilim dolu bir yol kenari karsilasmasi"] konulu, sade bir anlati (emote + diyalog) sahnesi uret. Sistem/departman etiketli satirlar veya sahte chat log formati ISTEMIYORUM - sadece dogal bir RP anlatimi. Gorsel onerisine gerek yok, ben kendi gorselimi kullanacagim.

${formatRules}
- En az 6-10 satirlik akici bir sahne olsun; sadece tek yonlu monolog degil, en az iki karakter arasinda gecsin.`,
  },
];
