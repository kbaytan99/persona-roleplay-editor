"use strict";

// Roleplay chat-log text parsing/formatting: turns raw pasted RP log text
// into typed, colored segments (chat/emote/system/admin/etc.), and renders
// those segments both to the live DOM preview and to a canvas 2d context
// for PNG export. Pure functions only - no dependency on scene/app state.

const systemGreen = "#5dde72";
const tagOrange = "#ff9f2e";
const tagYellow = "#ffd447";
const adminRed = "#ff4f4f";

export function parseLines(text) {
  return text
    .split(/\r?\n/)
    .flatMap((line) => parseLine(line.trim()))
    .filter((line) => line.text.length > 0);
}

function parseLine(raw) {
  if (!raw) return [];

  if (isOoc(raw)) return [];

  if (raw.startsWith("**")) {
    const content = raw.slice(2).trim();
    if (hasDoOwner(content)) return [{ type: "do", text: `* ${content.replace(/^\*\s*/, "")}` }];
    const parsed = splitNameAndMessage(content);
    if (!parsed.name) return [{ type: "do", text: `* ${content}` }];
    return [{ type: "do", text: `* ${parsed.message || parsed.name} (( ${parsed.name} ))` }];
  }

  if (raw.startsWith("*")) {
    if (isStarredSystemLine(raw)) return [{ type: "system", text: raw, segments: [{ text: raw, color: systemGreen }] }];
    if (isRoleplayUtilityLine(raw)) return [{ type: "system", text: raw, segments: [{ text: raw, color: systemGreen }] }];
    if (isMechanicalActionLine(raw)) return [{ type: "system", text: raw, segments: [{ text: raw, color: systemGreen }] }];
    return [{ type: hasDoOwner(raw) ? "do" : "emote", text: raw }];
  }

  if (isAdminLine(raw)) {
    return [{ type: "admin", text: raw, segments: [{ text: raw, color: adminRed }] }];
  }

  if (isHelpdeskLine(raw)) {
    return [{ type: "helpdesk", text: raw, segments: [{ text: raw, color: adminRed }] }];
  }

  if (isDoingActionLine(raw)) {
    return [{ type: "system", text: raw, segments: [{ text: raw, color: systemGreen }] }];
  }

  if (isSystemLine(raw)) {
    return [{ type: "system", text: raw, segments: buildSystemSegments(raw) }];
  }

  return [{ type: "chat", text: raw, segments: buildChatSegments(raw) }];
}

function hasDoOwner(value) {
  return /\(\(\s*[^)]+?\s*\)\)\s*$/.test(value);
}

function isOoc(value) {
  return /^\(\(.+\)\)$/.test(value);
}

function isSystemLine(value) {
  const folded = foldText(value);
  return /^\[(?:\?|isyeri|ev|arac|ch:|s:)/i.test(folded) || /^(arac|ev):/i.test(folded);
}

function isAdminLine(value) {
  return /^ADM:/i.test(value);
}

function isHelpdeskLine(value) {
  return /^\(Helpdesk\)\[Talep\s+#?\d+\]/i.test(value);
}

function isStarredSystemLine(value) {
  const folded = foldText(value);
  return /isyerinin isiklarini acti|isyerinin isiklarini kapatti|giris yapti|sunucudan ayrildi|giris kapisina dogru yoneldi/i.test(folded);
}

function isRoleplayUtilityLine(value) {
  return /^\*\s*(?:\+|pm|ooc(?:\s+izni)?)\s*(?:\(\(.+\)\))?\s*$/i.test(value);
}

function isMechanicalActionLine(value) {
  const folded = foldText(value);
  if (!folded.startsWith("*")) return false;
  return /\barac\w*\s+kilidini\s+ac\w*/.test(folded)
    || /\baraci\s+kilitler/.test(folded)
    || /\barac\w*\s+anahtarini\s+(?:kontaga\s+sokar\s+ve\s+cevirir|cevirerek\s+motoru\s+durdurur)/.test(folded)
    || /^\*\s+motor\s+calistirildi\.\s+\(\(\s*.+?\s*\)\)\s*$/.test(folded)
    || /\bemniyet\s+kemerini\s+(?:takti|cikartti)/.test(folded)
    || /\bcantasindan\s+'.+?'\s+cikartti\s+ve\s+tuketti/.test(folded)
    || /\btelefonundan\s+bir\s+numara\s+cevirir/.test(folded)
    || /\bcagriyi\s+bitirir/.test(folded)
    || /\bcamlari?\s+(?:acti|kapatti)/.test(folded)
    || /\bcamini\s+(?:acti|kapatti)/.test(folded)
    || /\b\d+\s+miktarindaki\s+.+?\s+esyasini\s+.+?\s+kisisine\s+verdi/.test(folded)
    || /\badli\s+kisiye\s+kimligini\s+cikartti\s+ve\s+gosterdi/.test(folded)
    || /\badli\s+hastaya\s+recete\s+yazdi/.test(folded)
    || /^\*\s+telefonunuzda\s+okunmamis\s+\d+\s+adet\s+kisa\s+mesajiniz\s+bulunuyor\.?\s*$/.test(folded)
    || /^\*\s+.+?\s+aracin\s+surus\s+modunu\s+'.+?'\s+olarak\s+degistirdi\.?\s*$/.test(folded);
}

function isWhisperLogLine(value) {
  return /^\*\*\s+.+?\s+fisilda(?:di|din):/i.test(foldText(value));
}

function isIdLookupLine(value) {
  return /^\*\*\s+.+?\s+-\s+ID:\s*\d+\s+\(Lv\.\d+\)(?:\s+\(AFK\))?\s*$/i.test(value);
}

function isGlobalSystemLine(value) {
  return /^(?:LS LOTTO|Catedral):/i.test(value);
}

function isDoingActionLine(value) {
  return /^aksiyon:/i.test(foldText(value)) && /\/doing/i.test(value);
}

function foldText(value) {
  return String(value)
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function buildSystemSegments(text) {
  const segments = [];
  let index = 0;
  const tagPattern = /\[(CH: [^\]]+|S: [^\]]+|\?|Isyeri|İşyeri|Ev|EV|Arac|Araç|ARAÇ)[^\]]*\]/gi;
  let match = tagPattern.exec(text);

  while (match) {
    if (match.index > index) {
      segments.push({ text: text.slice(index, match.index), color: systemGreen });
    }
    segments.push({ text: match[0], color: getTagColor(match[1]) });
    index = match.index + match[0].length;
    match = tagPattern.exec(text);
  }

  if (index < text.length) {
    segments.push({ text: text.slice(index), color: systemGreen });
  }

  return segments.length ? segments : [{ text, color: systemGreen }];
}

function getTagColor(tag) {
  if (/^CH:/i.test(tag)) return tagOrange;
  if (/^S:/i.test(tag)) return tagYellow;
  return systemGreen;
}

function buildChatSegments(text) {
  const segments = [];
  let index = 0;
  const emotePattern = /\[emote\]([\s\S]*?)\[\/emote\]/gi;
  let match = emotePattern.exec(text);

  while (match) {
    if (match.index > index) {
      segments.push({ text: text.slice(index, match.index) });
    }
    segments.push({ text: match[1], role: "emote" });
    index = match.index + match[0].length;
    match = emotePattern.exec(text);
  }

  if (index < text.length) {
    segments.push({ text: text.slice(index) });
  }

  return segments.length ? segments : [{ text }];
}

function splitNameAndMessage(content) {
  const colonMatch = content.match(/^([^:]+):\s*(.*)$/);
  if (colonMatch) {
    return {
      name: normalizeName(colonMatch[1]),
      message: colonMatch[2].trim(),
    };
  }

  const parts = content.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { name: "", message: content };
  }

  return {
    name: normalizeName(parts.slice(0, 2).join(" ")),
    message: parts.slice(2).join(" "),
  };
}

function normalizeName(value) {
  return value.replace(/^\*+/, "").replace(/\s+/g, " ").trim();
}

export function appendSegments(element, line, options) {
  const segments = getLineSegments(line, options);
  segments.forEach((segment) => {
    const span = document.createElement("span");
    span.textContent = segment.text;
    if (segment.color) span.style.color = segment.color;
    if (segment.role === "emote") span.className = "inline-emote";
    element.append(span);
  });
}

export function wrapLine(context, line, width, options) {
  const words = getLineSegments(line, options).flatMap((segment) => splitSegmentWords(segment));
  const wrapped = [];
  let current = [];

  words.forEach((segment) => {
    const test = joinSegmentText([...current, segment]);
    if (context.measureText(test).width <= width || current.length === 0) {
      current.push(segment);
      return;
    }
    wrapped.push({ ...line, text: joinSegmentText(current), segments: current });
    current = [segment];
  });

  if (current.length) wrapped.push({ ...line, text: joinSegmentText(current), segments: current });
  return wrapped;
}

function splitSegmentWords(segment) {
  const parts = segment.text.match(/\S+\s*/g);
  if (!parts) return [];
  return parts.map((text) => ({ ...segment, text }));
}

function joinSegmentText(segments) {
  return segments.map((segment) => segment.text).join("");
}

function getLineSegments(line, options) {
  if (line.segments) {
    return line.segments.map((segment) => ({
      ...segment,
      color: segment.color || (segment.role === "emote" ? options.emoteColor : options.chatColor),
    }));
  }

  const color = line.type === "chat" ? options.chatColor : options.emoteColor;
  return [{ text: line.text, color }];
}

export function drawSegmentedText(context, segments, x, y, options = { textEffect: "outline" }) {
  let cursor = x;
  segments.forEach((segment) => {
    drawStyledText(context, segment.text, cursor, y, segment.color, options);
    cursor += context.measureText(segment.text).width;
  });
}

function drawStyledText(context, text, x, y, fillStyle, options) {
  if (options.textEffect === "outline") {
    context.save();
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.lineWidth = 3;
    context.strokeStyle = "#000000";
    context.strokeText(text, x, y);
    context.restore();
  } else if (options.textEffect === "outlineThick") {
    context.save();
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.lineWidth = 6;
    context.strokeStyle = "#000000";
    context.strokeText(text, x, y);
    context.restore();
  } else if (options.textEffect === "soft") {
    context.save();
    context.shadowColor = "#000000";
    context.shadowBlur = 4;
    context.shadowOffsetX = 1;
    context.shadowOffsetY = 1;
  } else if (options.textEffect === "neon") {
    context.save();
    context.shadowColor = "#52d1c5";
    context.shadowBlur = 10;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  }

  context.fillStyle = fillStyle;
  context.fillText(text, x, y);
  if (options.textEffect === "soft" || options.textEffect === "neon") context.restore();
}
