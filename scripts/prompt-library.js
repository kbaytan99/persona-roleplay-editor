"use strict";

// Static AI prompt templates for the "Promptlar" menu - each one is meant
// to be copied and pasted into an external AI chat (ChatGPT, Claude, vb.)
// to generate roleplay text in the exact format Persona's own text engine
// understands (scripts/rp-text.js): "*" emote lines, "** Isim durum"
// shorthand, "(( ... ))" OOC lines. Kept Turkish-only for now, unlike the
// UI chrome around it - these are content templates for a Turkish RP
// audience, not UI strings.
//
// Important: the AI never invents a fake chat log or a made-up image
// description on its own - "chatlog'lu"/"resimli" mean the USER is about
// to paste a real chat log or attach a real image right after the prompt,
// and the AI's job is to read/look at THAT and write matching text. The
// prompt only tells the AI what to expect and how to format its output.

const formatRules = `
Bicim kurallari (cok onemli, aynen uy):
- Aksiyon/emote satirlari "*" ile basin. Ornek: "* Araçtan iner, çevresine bakinir."
- "**" ile baslayan bir satir "** Isim Soyisim durum" seklinde yazilirsa bu otomatik olarak "* durum (( Isim Soyisim ))" haline gelir; istersen bu kisayolu kullanabilirsin.
- Karakter konusmalari duz metin olarak, istersen "Isim Soyisim: soz" formatinda yaz.
- Oyun disi (OOC) notlar ayri bir satirda "(( ... ))" icinde olsun, RP akisina karismasin.
- Ciktiyi dogrudan kopyala-yapistir yapabilecegim duz metin olarak ver, markdown baslik/liste isaretleri kullanma.
- Gorsel uretme, gorsel tarif etme veya gorsel onerme - sadece metin yaz.`.trim();

export const promptCategories = [
  {
    id: "chatlog-image",
    label: { tr: "Chat log'lu + Resimli" },
    prompt: `Sana az sonra gercek bir GTA roleplay sunucu chat log'u yapistiracagim VE bir referans goruntu/ekran goruntusu vereceğim - ikisini de sen uretmeyeceksin, ben veriyorum.

Gorevin: yapistiracagim chat log'u oku, verecegim goruntudeki sahneyle tutarli olacak sekilde metni Persona'nin anladigi bicime cevir/duzenle/gerekirse dogal bir sekilde kisalt-uzat. Log'daki sistem/departman etiketli satirlari (orn. "[CH: ...]", "[S: ...]") oldugu gibi koru, uydurma yeni etiket ekleme.

${formatRules}

Simdi ben chat log'u ve goruntuyu asagida/bir sonraki mesajda verecegim, onlari bekle.`,
  },
  {
    id: "chatlog-noimage",
    label: { tr: "Chat log'lu + Resimsiz" },
    prompt: `Sana az sonra gercek bir GTA roleplay sunucu chat log'u yapistiracagim - onu sen uretmeyeceksin, ben veriyorum. Goruntu/gorsel vermeyecegim, gerek yok.

Gorevin: yapistiracagim chat log'u oku ve metni Persona'nin anladigi bicime cevir/duzenle/gerekirse dogal bir sekilde kisalt-uzat. Log'daki sistem/departman etiketli satirlari (orn. "[CH: ...]", "[S: ...]") oldugu gibi koru, uydurma yeni etiket ekleme.

${formatRules}

Simdi ben chat log'u asagida/bir sonraki mesajda verecegim, onu bekle.`,
  },
  {
    id: "nochatlog-image",
    label: { tr: "Chat log'suz + Resimli" },
    prompt: `Chat log vermeyecegim - sana sadece bir referans goruntu/ekran goruntusu verecegim, onu da ben veriyorum, sen uretmeyeceksin.

Gorevin: verecegim goruntuye bakip, o sahnede ne oldugunu tahmin ederek sade, dogal bir RP anlatisi (emote + diyalog) yaz. Sistem/departman etiketli satirlar veya sahte chat log formati ISTEMIYORUM - sadece dogal bir anlati.

${formatRules}
- En az 6-10 satirlik akici bir sahne olsun; sadece tek yonlu monolog degil, en az iki karakter arasinda gecsin.

Simdi ben goruntuyu asagida/bir sonraki mesajda verecegim, onu bekle.`,
  },
  {
    id: "nochatlog-noimage",
    label: { tr: "Chat log'suz + Resimsiz" },
    prompt: `Sana ne chat log ne de goruntu verecegim - sadece bir konu basligi verecegim. [BURAYA KONUYU YAZ: orn. "bir arac tamiri" / "bir bar sohbeti" / "gerilim dolu bir yol kenari karsilasmasi"]

Gorevin: bu konuya uygun, sifirdan, sade ve dogal bir RP anlatisi (emote + diyalog) yaz. Sistem/departman etiketli satirlar veya sahte chat log formati ISTEMIYORUM - sadece dogal bir anlati.

${formatRules}
- En az 6-10 satirlik akici bir sahne olsun; sadece tek yonlu monolog degil, en az iki karakter arasinda gecsin.`,
  },
];
