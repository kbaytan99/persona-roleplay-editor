"use strict";

const sourceText = document.querySelector("#sourceText");
const appShell = document.querySelector(".app-shell");
const renderSurface = document.querySelector("#renderSurface");
const previewViewport = document.querySelector("#previewViewport");
const previewScaler = document.querySelector("#previewScaler");
const exportCanvas = document.querySelector("#exportCanvas");
const downloadBtn = document.querySelector("#downloadBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const cleanBtn = document.querySelector("#cleanBtn");
const clearAllBtn = document.querySelector("#clearAllBtn");
const copyRawBtn = document.querySelector("#copyRawBtn");
const copyBtn = document.querySelector("#copyBtn");
const statusText = document.querySelector("#statusText");
const sceneImageInput = document.querySelector("#sceneImageInput");
const sceneOutputWidth = document.querySelector("#sceneOutputWidth");
const sceneBackgroundHeight = document.querySelector("#sceneBackgroundHeight");
const sceneFontSize = document.querySelector("#sceneFontSize");
const scenePadding = document.querySelector("#scenePadding");
const sceneTransitionSize = document.querySelector("#sceneTransitionSize");
const sceneTransitionStyle = document.querySelector("#sceneTransitionStyle");
const sceneTransitionSides = document.querySelector("#sceneTransitionSides");
const applyGlobalTransitionBtn = document.querySelector("#applyGlobalTransitionBtn");
const apiEndpoint = document.querySelector("#apiEndpoint");
const apiToken = document.querySelector("#apiToken");
const apiFieldName = document.querySelector("#apiFieldName");
const uploadSceneBtn = document.querySelector("#uploadSceneBtn");
const apiStatus = document.querySelector("#apiStatus");
const blankSceneBtn = document.querySelector("#blankSceneBtn");
const exportSceneProjectBtn = document.querySelector("#exportSceneProjectBtn");
const sceneProjectInput = document.querySelector("#sceneProjectInput");
const clearScenesBtn = document.querySelector("#clearScenesBtn");
const hideToolboxBtn = document.querySelector("#hideToolboxBtn");
const showToolboxBtn = document.querySelector("#showToolboxBtn");
const showLayersBtn = document.querySelector("#showLayersBtn");
const sceneStatus = document.querySelector("#sceneStatus");
const sceneList = document.querySelector("#sceneList");
const sceneLayersPanel = document.querySelector("#sceneLayersPanel");
const appTitle = document.querySelector("#appTitle");
const appSubtitle = document.querySelector("#appSubtitle");
const rollTab = document.querySelector("#rollTab");
const sceneTab = document.querySelector("#sceneTab");
const rollEditorPane = document.querySelector("#rollEditorPane");
const sceneEditorPane = document.querySelector("#sceneEditorPane");
const rollPreviewPane = document.querySelector("#rollPreviewPane");
const scenePreviewPane = document.querySelector("#scenePreviewPane");

const controls = {
  canvasWidth: document.querySelector("#canvasWidth"),
  fontSize: document.querySelector("#fontSize"),
  lineGap: document.querySelector("#lineGap"),
  padding: document.querySelector("#padding"),
  textEffect: document.querySelector("#textEffect"),
  backgroundMode: document.querySelector("#backgroundMode"),
  emoteColor: document.querySelector("#emoteColor"),
  chatColor: document.querySelector("#chatColor"),
  sceneFontSize,
  scenePadding,
};

const sample = `* Santino Stayhigh iki elini ensesinde birlestirip gevsekce arkaya yaslanir, ikisine siritip omzunu silker.
Santino Stayhigh: Ben yine konusurum da... boyle susup manzara izlemek de fena degilmis he.
* Sophia Steinhelm kisa bir kahkaha atar, ardindan Rinn'in omzuna hafifce dokunur.
Sophia Steinhelm: Sen fazla dalinca dunya susuyor saniyorum, o yuzden kontrol ediyorum seni.
Rinn Gyeong: Merak etme, iyiyim... sadece ilk defa bir anin icine gercekten aitmisim gibi geliyor.
* Rinn'in iyi oldugu belli olur. (( Sophia Steinhelm ))
[CH: ***] [S: ***] Amanda Oliver: Muayene islemleri sonlandi.
[?] Bandaj (( BIRIM FIYATI 1.000 DOLAR ))
[Isyeri] Sahip: Nadia Yurasova Sistemsel Fiyat: $70,000
(( Raijin Rinn Gyeong: OOC arindirilmali ))`;

const systemGreen = "#5dde72";
const tagOrange = "#ff9f2e";
const tagYellow = "#ffd447";
const adminRed = "#ff4f4f";
const storageKeys = {
  source: "rollSs.sourceText",
  sceneOutputWidth: "rollSs.sceneOutputWidth",
  sceneBackgroundHeight: "rollSs.sceneBackgroundHeight",
  sceneFontSize: "rollSs.sceneFontSize",
  scenePadding: "rollSs.scenePadding",
  sceneTransitionSize: "rollSs.sceneTransitionSize",
  sceneTransitionStyle: "rollSs.sceneTransitionStyle",
  sceneTransitionSides: "rollSs.sceneTransitionSides",
  apiEndpoint: "rollSs.apiEndpoint",
  apiToken: "rollSs.apiToken",
  apiFieldName: "rollSs.apiFieldName",
  toolboxWidth: "rollSs.toolboxWidth",
  toolboxHidden: "rollSs.toolboxHidden",
};
const localClientId = "local-client";
const legacyUserRegistryKey = "rollSs.users";
const legacyActiveUserKey = "rollSs.activeUser";
const scenes = [];
const sceneTransitionPx = 150;
const sceneCanvasDefaultWidth = 1200;
const sceneCanvasDefaultHeight = 800;
const sceneCanvasMaxDimension = 32767;
const sceneCanvasBackground = "#10141b";
const rseProjectMagic = "ROLEPLAY_SCENE_EXPORT";
const rseProjectVersion = 1;
const sceneImageFilterDefaults = {
  brightness: 106,
  contrast: 108,
  saturate: 112,
  sepia: 4,
  blur: 0,
};
const sceneSnapThresholdPx = 9;
const sceneHistoryLimit = 20;
const sceneUndoStack = [];
const sceneRedoStack = [];
let sceneClipboardScenes = [];
let activeMode = "scene";
let sceneViewportZoom = 1;
let isSpacePanning = false;
let selectedSceneId = "";
let selectedSceneIds = [];
let hoveredSceneId = "";
let shouldAutoFitSceneViewport = true;
let draggingSceneId = "";
let currentUserId = localClientId;
let sceneSaveTimer = 0;

restoreState();

function getOptions() {
  return {
    width: clampNumber(controls.canvasWidth.value, 360, 1800, 774),
    fontSize: clampNumber(controls.fontSize.value, 10, 42, 18),
    lineGap: clampNumber(controls.lineGap.value, 0, 18, 1),
    padding: clampNumber(controls.padding.value, 0, 40, 4),
    textEffect: ["outline", "soft", "plain"].includes(controls.textEffect.value) ? controls.textEffect.value : "outline",
    backgroundMode: ["black", "transparent"].includes(controls.backgroundMode.value) ? controls.backgroundMode.value : "black",
    emoteColor: controls.emoteColor.value,
    chatColor: controls.chatColor.value,
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseLines(text) {
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
    .replace(/\u0130/g, "I")
    .replace(/\u0131/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildSystemSegments(text) {
  const segments = [];
  let index = 0;
  const tagPattern = /\[(CH: [^\]]+|S: [^\]]+|\?|Isyeri|\u0130\u015fyeri|Ev|EV|Arac|Ara\u00e7|ARA\u00c7)[^\]]*\]/gi;
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

function renderPreview() {
  const options = getOptions();
  controls.canvasWidth.value = options.width;
  controls.fontSize.value = options.fontSize;
  controls.lineGap.value = options.lineGap;
  controls.padding.value = options.padding;
  controls.textEffect.value = options.textEffect;
  controls.backgroundMode.value = options.backgroundMode;
  const lines = parseLines(sourceText.value);

  renderSurface.replaceChildren();
  renderSurface.dataset.textEffect = options.textEffect;
  renderSurface.dataset.backgroundMode = options.backgroundMode;
  renderSurface.style.width = `${options.width}px`;
  renderSurface.style.padding = `${options.padding}px`;
  renderSurface.style.setProperty("--emote-line-color", options.emoteColor);
  renderSurface.style.setProperty("--chat-line-color", options.chatColor);

  lines.forEach((line) => {
    const element = document.createElement("p");
    element.className = `chat-line ${line.type}`;
    appendSegments(element, line, options);
    element.style.fontSize = `${options.fontSize}px`;
    element.style.lineHeight = `${options.fontSize + options.lineGap}px`;
    renderSurface.append(element);
  });

  drawCanvas(lines, options);
  scalePreview(options);
}

function scalePreview(options) {
  const availableWidth = Math.max(1, previewViewport.clientWidth);
  const scale = Math.min(1, availableWidth / options.width);
  previewScaler.style.transform = `scale(${scale})`;
  previewScaler.style.width = `${options.width}px`;
  previewScaler.style.height = `${renderSurface.offsetHeight * scale}px`;
}

function saveState() {
  localStorage.setItem(clientStorageKey(storageKeys.source), sourceText.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneOutputWidth), sceneOutputWidth.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneBackgroundHeight), sceneBackgroundHeight.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneFontSize), sceneFontSize.value);
  localStorage.setItem(clientStorageKey(storageKeys.scenePadding), scenePadding.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionSize), sceneTransitionSize.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionStyle), sceneTransitionStyle.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionSides), sceneTransitionSides.value);
  localStorage.setItem(clientStorageKey(storageKeys.apiEndpoint), apiEndpoint.value);
  localStorage.setItem(clientStorageKey(storageKeys.apiToken), apiToken.value);
  localStorage.setItem(clientStorageKey(storageKeys.apiFieldName), apiFieldName.value);
}

function restoreState() {
  migrateLegacyClientStorage();
  sourceText.value = getClientStoredValue(storageKeys.source) ?? sample;
  const savedSceneWidth = getClientStoredValue(storageKeys.sceneOutputWidth);
  const savedSceneHeight = getClientStoredValue(storageKeys.sceneBackgroundHeight);
  sceneOutputWidth.value = !savedSceneWidth || savedSceneWidth === "1920" ? sceneCanvasDefaultWidth : savedSceneWidth;
  sceneBackgroundHeight.value = !savedSceneHeight || savedSceneHeight === "1080" ? sceneCanvasDefaultHeight : savedSceneHeight;
  sceneFontSize.value = getClientStoredValue(storageKeys.sceneFontSize) ?? sceneFontSize.value;
  scenePadding.value = getClientStoredValue(storageKeys.scenePadding) ?? scenePadding.value;
  sceneTransitionSize.value = getClientStoredValue(storageKeys.sceneTransitionSize) ?? sceneTransitionSize.value;
  sceneTransitionStyle.value = getClientStoredValue(storageKeys.sceneTransitionStyle) ?? sceneTransitionStyle.value;
  sceneTransitionSides.value = getClientStoredValue(storageKeys.sceneTransitionSides) ?? sceneTransitionSides.value;
  apiEndpoint.value = getClientStoredValue(storageKeys.apiEndpoint) ?? "";
  apiToken.value = getClientStoredValue(storageKeys.apiToken) ?? "";
  apiFieldName.value = getClientStoredValue(storageKeys.apiFieldName) ?? "image";
  appShell.style.setProperty("--toolbox-width", `${getSavedToolboxWidth()}px`);
  appShell.classList.toggle("toolbox-hidden", getClientStoredValue(storageKeys.toolboxHidden) === "true");
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
  if (!record) {
    record = await readLegacySceneRecord(db);
    if (record) {
      scenes.splice(0, scenes.length, ...((record.scenes || [])));
      selectedSceneId = record.selectedSceneId || scenes[0]?.id || "";
      selectedSceneIds = Array.isArray(record.selectedSceneIds) ? record.selectedSceneIds : selectedSceneId ? [selectedSceneId] : [];
      normalizeSceneSelection();
      await saveLocalScenesNow();
      db.close();
      if (activeMode === "scene") renderScenes();
      return;
    }
  }
  db.close();
  scenes.splice(0, scenes.length, ...((record?.scenes || [])));
  selectedSceneId = record?.selectedSceneId || scenes[0]?.id || "";
  selectedSceneIds = Array.isArray(record?.selectedSceneIds) ? record.selectedSceneIds : selectedSceneId ? [selectedSceneId] : [];
  normalizeSceneSelection();
  if (activeMode === "scene") renderScenes();
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
    saveLocalScenesNow().catch(() => setSceneStatus("Sahne lokal kaydedilemedi."));
  }, 450);
}

function appendSegments(element, line, options) {
  const segments = getLineSegments(line, options);
  segments.forEach((segment) => {
    const span = document.createElement("span");
    span.textContent = segment.text;
    if (segment.color) span.style.color = segment.color;
    if (segment.role === "emote") span.className = "inline-emote";
    element.append(span);
  });
}

function drawCanvas(lines, options) {
  const scale = window.devicePixelRatio || 1;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const lineHeight = options.fontSize + options.lineGap;
  const availableWidth = options.width - options.padding * 2;
  const context = exportCanvas.getContext("2d");

  context.font = `800 ${options.fontSize}px Arial`;
  const wrapped = lines.flatMap((line) => wrapLine(context, line, availableWidth, options));
  const height = Math.max(44, options.padding * 2 + wrapped.length * lineHeight);

  exportCanvas.width = Math.ceil(options.width * scale);
  exportCanvas.height = Math.ceil(height * scale);
  exportCanvas.style.width = `${options.width}px`;
  exportCanvas.style.height = `${height}px`;

  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, options.width, height);
  if (options.backgroundMode === "black") {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, options.width, height);
  }
  context.font = `800 ${options.fontSize}px ${fontFamily}`;
  context.textBaseline = "top";

  wrapped.forEach((line, index) => {
    const x = options.padding;
    const y = options.padding + index * lineHeight;
    drawSegmentedText(context, line.segments, x, y, options);
  });
}

function wrapLine(context, line, width, options) {
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

function drawSegmentedText(context, segments, x, y, options = { textEffect: "outline" }) {
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
  } else if (options.textEffect === "soft") {
    context.save();
    context.shadowColor = "#000000";
    context.shadowBlur = 4;
    context.shadowOffsetX = 1;
    context.shadowOffsetY = 1;
  }

  context.fillStyle = fillStyle;
  context.fillText(text, x, y);
  if (options.textEffect === "soft") context.restore();
}

function downloadPng() {
  renderPreview();
  const link = document.createElement("a");
  link.download = `roll-ss-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function copyParsedText() {
  const parsed = parseLines(sourceText.value).map((line) => line.text).join("\n");
  copyText(parsed, "Cozumlenmis metin kopyalandi.");
}

function copyRawText() {
  copyText(sourceText.value, "Tum metin kopyalandi.");
}

async function copyText(text, successMessage) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(successMessage);
      return;
    } catch {
      // Fall through to the textarea-based copy path.
    }
  }

  if (fallbackCopyText(text)) {
    setStatus(successMessage);
    return;
  }

  sourceText.focus();
  sourceText.select();
  setStatus("Kopyalama engellendi; metin secildi, Ctrl+C ile alabilirsin.");
}

function fallbackCopyText(text) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  helper.style.top = "0";
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  return copied;
}

function setStatus(message) {
  statusText.textContent = message;
}

function switchMode(mode) {
  activeMode = mode;
  const isScene = mode === "scene";
  appShell.classList.toggle("scene-mode", isScene);
  rollTab.classList.toggle("active", !isScene);
  sceneTab.classList.toggle("active", isScene);
  rollEditorPane.classList.toggle("active", !isScene);
  sceneEditorPane.classList.toggle("active", isScene);
  rollPreviewPane.classList.toggle("active", !isScene);
  scenePreviewPane.classList.toggle("active", isScene);
  downloadBtn.textContent = isScene ? "Tek PNG indir" : "PNG indir";
  appTitle.textContent = isScene ? "Sahne Olusturucu" : "Roll SS Editor";
  appSubtitle.textContent = isScene
    ? "Tek canvas uzerinde sahne, resim ve rol yazisi duzenleyici"
    : "SA-MP / RAGE:MP text roleplay ekran goruntusu hazirlayici";
  document.title = isScene ? "Sahne Olusturucu" : "Roll SS Editor";
  if (isScene) renderScenes();
  else renderPreview();
}

function handleMainDownload() {
  if (activeMode === "scene") {
    downloadCompositeScene();
    return;
  }
  downloadPng();
}

function hideToolbox() {
  appShell.classList.add("toolbox-hidden");
  localStorage.setItem(clientStorageKey(storageKeys.toolboxHidden), "true");
  renderScenes();
}

function showToolbox() {
  appShell.classList.remove("toolbox-hidden");
  localStorage.setItem(clientStorageKey(storageKeys.toolboxHidden), "false");
  renderScenes();
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

function startToolboxResize(event) {
  if (activeMode !== "scene" || appShell.classList.contains("toolbox-hidden")) return;
  const panelRect = document.querySelector(".editor-panel").getBoundingClientRect();
  if (Math.abs(event.clientX - panelRect.right) > 14) return;

  event.preventDefault();
  const startX = event.clientX;
  const startWidth = panelRect.width;

  const onMove = (moveEvent) => {
    const width = clampNumber(startWidth + moveEvent.clientX - startX, 300, 620, startWidth);
    appShell.style.setProperty("--toolbox-width", `${width}px`);
    localStorage.setItem(clientStorageKey(storageKeys.toolboxWidth), String(Math.round(width)));
    renderScenes();
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.body.classList.remove("resizing-toolbox");
  };

  document.body.classList.add("resizing-toolbox");
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

function handleSceneWheel(event) {
  if (activeMode !== "scene") return;
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
    node.textContent = `${Math.round(sceneViewportZoom * 100)}%`;
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

function snapStageBox(stage, box, { allowX = true, allowY = true, disabled = false } = {}) {
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

  if (allowX) {
    const xTargets = [0, stageWidth / 2, stageWidth];
    const xPoints = [box.left, box.left + box.width / 2, box.left + box.width];
    const snap = findNearestSnapDelta(xPoints, xTargets);
    if (snap) {
      result.deltaX = snap.delta;
      result.guides.vertical.push(snap.target);
    }
  }

  if (allowY) {
    const yTargets = [0, stageHeight / 2, stageHeight];
    const yPoints = [box.top, box.top + box.height / 2, box.top + box.height];
    const snap = findNearestSnapDelta(yPoints, yTargets);
    if (snap) {
      result.deltaY = snap.delta;
      result.guides.horizontal.push(snap.target);
    }
  }

  drawSmartGuides(stage, result.guides);
  return result;
}

function findNearestSnapDelta(points, targets) {
  let best = null;
  points.forEach((point) => {
    targets.forEach((target) => {
      const delta = target - point;
      const distance = Math.abs(delta);
      if (distance <= sceneSnapThresholdPx && (!best || distance < best.distance)) {
        best = { delta, distance, target };
      }
    });
  });
  return best;
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
  if (activeMode !== "scene") return;

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

  if (!isTextEntryTarget(event.target) && isSceneCopyShortcut(event)) {
    event.preventDefault();
    copySelectedScenes();
    return;
  }

  if (!isTextEntryTarget(event.target) && isSceneCutShortcut(event)) {
    event.preventDefault();
    cutSelectedScenes();
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
  if (activeMode !== "scene" || !isSpacePanning || event.button !== 0) return;
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

function cleanText() {
  resetNotificationDedupe();
  const cleaned = sourceText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && shouldKeepCleanLine(line))
    .map(stripInlineTags)
    .filter(uniqueNotificationLine)
    .join("\n");

  sourceText.value = cleaned;
  renderPreview();
  saveState();
}

function clearAllChats() {
  sourceText.value = "";
  saveState();
  renderPreview();
  setStatus("Editor chat alani silindi.");
}

async function addSceneImages(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) {
    setSceneStatus("Resim dosyasi secilmedi.");
    return;
  }

  const wasEmpty = scenes.length === 0;
  pushSceneHistory();
  const newScenes = [];
  for (const file of imageFiles) {
    const dataUrl = await readFileAsDataUrl(file);
    newScenes.push({
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
    });
  }
  scenes.unshift(...newScenes);
  selectedSceneIds = newScenes.map((scene) => scene.id);
  selectedSceneId = selectedSceneIds[0] || "";
  hoveredSceneId = "";

  if (wasEmpty) shouldAutoFitSceneViewport = true;
  renderScenes();
  setSceneStatus(`${imageFiles.length} katman eklendi. Hepsi ayni sahne canvasinda.`);
  sceneImageInput.value = "";
  switchMode("scene");
}

function addBlankScene() {
  pushSceneHistory();
  const scene = {
    id: createId(),
    name: `Bos sahne ${scenes.length + 1}`,
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
  shouldAutoFitSceneViewport = true;
  renderScenes();
  switchMode("scene");
  setSceneStatus("Bos sahne katmani eklendi. Yaziyi elle ekleyebilirsin.");
}

function addSceneImageBlobs(blobs) {
  const files = blobs.map((blob, index) => new File([blob], `pasted-scene-${Date.now()}-${index + 1}.png`, { type: blob.type || "image/png" }));
  return addSceneImages(files);
}

function handlePaste(event) {
  const imageItems = [...(event.clipboardData?.items || [])].filter((item) => item.type.startsWith("image/"));
  if (!imageItems.length) {
    if (activeMode === "scene" && !isEditableTarget(event.target) && sceneClipboardScenes.length) {
      event.preventDefault();
      pasteSceneClipboard();
    }
    return;
  }

  const blobs = imageItems.map((item) => item.getAsFile()).filter(Boolean);
  if (!blobs.length) return;

  event.preventDefault();
  addSceneImageBlobs(blobs);
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
  title.textContent = scenes.length ? `${scenes.length} katman - tek sahne / tek PNG` : "Bos sahne - tek PNG";

  const zoomReadout = document.createElement("div");
  zoomReadout.className = "zoom-readout";
  zoomReadout.textContent = `${Math.round(sceneViewportZoom * 100)}%`;

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = "Tek PNG indir";
  downloadButton.addEventListener("click", downloadCompositeScene);

  toolbar.append(title, zoomReadout, downloadButton);

  const stage = document.createElement("div");
  stage.className = "composite-stage";
  stage.style.width = `${getScenePreviewWidth()}px`;
  stage.style.height = `${getScenePreviewHeight()}px`;
  stage.style.setProperty("--scene-padding", `${getScenePadding()}px`);
  stage.addEventListener("pointerdown", (event) => {
    hoveredSceneId = "";
    if (event.target === stage || event.target.classList.contains("stage-render-clip") || event.target.classList.contains("stage-resize-frame")) {
      clearSceneSelection();
    }
  });

  const renderClip = document.createElement("div");
  renderClip.className = "stage-render-clip";
  const transformOverlay = document.createElement("div");
  transformOverlay.className = "stage-transform-overlay";
  stage.append(renderClip, transformOverlay);

  scenes.forEach((scene, index) => {
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
      transformBox.style.zIndex = String(getSceneLayerZIndex(index, 500));
      applySceneLayerPosition(transformBox, scene);
      transformOverlay.append(transformBox);
    }
    renderClip.append(wrap);
  });

  scenes.forEach((scene) => {
    const sceneIndex = scenes.findIndex((candidate) => candidate.id === scene.id);
    scene.blocks.forEach((textBlock) => {
    const block = document.createElement("div");
    block.className = "scene-text-block";
    block.dataset.sceneId = scene.id;
      block.dataset.blockId = textBlock.id;
      block.dataset.textStyle = textBlock.textStyle || "box";
      block.style.zIndex = String(getSceneLayerZIndex(sceneIndex, 5));
      block.style.fontSize = `${textBlock.fontSize || getSceneFontSize()}px`;
      block.style.left = `${textBlock.x}%`;
      block.style.top = `${textBlock.y}%`;
      block.style.width = `${textBlock.width}%`;
    block.title = "Surukleyerek konumlandir";
    const content = document.createElement("div");
    content.className = "scene-text-content";
      renderSceneTextBlock(content, textBlock.text);
    block.append(content);
      block.addEventListener("pointerdown", (event) => startSceneTextDrag(event, textBlock));
    const resizeHandle = document.createElement("span");
    resizeHandle.className = "scene-resize-handle";
    resizeHandle.title = "Genisligi ayarla";
      resizeHandle.addEventListener("pointerdown", (event) => startSceneTextResize(event, textBlock));
    block.append(resizeHandle);
    renderClip.append(block);
    });
  });

  stage.append(createStageResizeFrame());

  const canvasViewport = document.createElement("div");
  canvasViewport.className = "scene-canvas-viewport";
  const zoomShell = document.createElement("div");
  zoomShell.className = "scene-zoom-shell";
  zoomShell.append(stage);
  canvasViewport.append(zoomShell);

  const listContainer = document.createElement("div");
  listContainer.className = "scene-editor-list-container";

  const layersTitle = document.createElement("div");
  layersTitle.className = "layers-title panel-drag-handle";
  layersTitle.title = "Surukleyerek tasi";
  const layersTitleText = document.createElement("span");
  layersTitleText.textContent = "Katman Yoneticisi";
  const layersCloseButton = document.createElement("button");
  layersCloseButton.className = "layer-window-button";
  layersCloseButton.type = "button";
  layersCloseButton.textContent = "Kapat";
  layersCloseButton.title = "Katman yoneticisini kapat";
  layersCloseButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  layersCloseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLayersPanel();
  });
  layersTitle.append(layersTitleText, layersCloseButton);
  sceneLayersPanel.append(layersTitle);

  if (!scenes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-layers";
    empty.textContent = "Bos canvas hazir. Resim ekle veya bos sahne olustur.";
    listContainer.append(empty);
  }

  scenes.forEach((scene, index) => {
    const item = document.createElement("div");
    item.className = "scene-editor-item";
    item.dataset.sceneEditorId = scene.id;
    item.addEventListener("dragover", (event) => handleSceneDragOver(event, scene.id));
    item.addEventListener("drop", (event) => handleSceneDrop(event, scene.id));
    if (isSceneSelected(scene.id)) item.classList.add("selected");
    item.style.setProperty("--scene-accent", getSceneAccent(index));
    item.addEventListener("pointerdown", (event) => {
      if (isEditableTarget(event.target)) return;
      setSelectedScene(scene.id);
    });

    // ── Drag grip strip (left edge) ──
    const dragGrip = document.createElement("div");
    dragGrip.className = "layer-drag-grip";
    dragGrip.title = "Surukleyerek sahne sirasini degistir";
    dragGrip.draggable = true;
    dragGrip.innerHTML = `<svg width="6" height="20" viewBox="0 0 6 20" fill="currentColor"><circle cx="1.5" cy="2" r="1.2"/><circle cx="4.5" cy="2" r="1.2"/><circle cx="1.5" cy="6" r="1.2"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="1.5" cy="10" r="1.2"/><circle cx="4.5" cy="10" r="1.2"/><circle cx="1.5" cy="14" r="1.2"/><circle cx="4.5" cy="14" r="1.2"/><circle cx="1.5" cy="18" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/></svg>`;
    dragGrip.addEventListener("dragstart", (event) => startSceneOrderDrag(event, scene.id));
    dragGrip.addEventListener("dragend", endSceneOrderDrag);

    // ── Card inner (header + body) ──
    const cardInner = document.createElement("div");
    cardInner.className = "layer-card-inner";

    // ── Header ──
    const itemHeader = document.createElement("div");
    itemHeader.className = "scene-editor-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "layer-header-left";

    const layerNumber = document.createElement("span");
    layerNumber.className = "layer-number";
    layerNumber.textContent = `${index + 1}`;

    const nameInput = document.createElement("input");
    nameInput.className = "scene-name-input";
    nameInput.type = "text";
    nameInput.value = scene.name || `Katman ${index + 1}`;
    nameInput.placeholder = "Sahne adi";
    nameInput.title = "Sahne ismi";
    prepareSceneHistoryControl(nameInput);
    nameInput.addEventListener("input", () => {
      scene.name = nameInput.value.trim() || `Katman ${index + 1}`;
      const image = document.querySelector(`[data-scene-image-id="${CSS.escape(scene.id)}"]`);
      if (image) image.alt = scene.name;
      scheduleSceneAutosave();
    });

    headerLeft.append(layerNumber, nameInput);

    const headerRight = document.createElement("div");
    headerRight.className = "layer-header-actions";

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = "layer-icon-btn" + (scene.isLocked ? " active" : "");
    lockButton.innerHTML = scene.isLocked ? "🔒" : "🔓";
    lockButton.title = scene.isLocked ? "Kilidi ac" : "Kilitle";
    lockButton.addEventListener("click", () => {
      pushSceneHistory();
      scene.isLocked = !scene.isLocked;
      renderScenes();
    });

    const addTextButton = document.createElement("button");
    addTextButton.type = "button";
    addTextButton.className = "layer-icon-btn";
    addTextButton.innerHTML = "T+";
    addTextButton.title = "Yazi ekle";
    addTextButton.addEventListener("click", () => addTextBlock(scene.id));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "layer-icon-btn danger";
    removeButton.innerHTML = "✕";
    removeButton.title = "Katmani sil";
    removeButton.addEventListener("click", () => removeScene(scene.id));

    headerRight.append(lockButton, addTextButton, removeButton);
    itemHeader.append(headerLeft, headerRight);

    // ── Order buttons row ──
    const orderRow = document.createElement("div");
    orderRow.className = "layer-order-row";
    orderRow.append(
      createSceneOrderButton("En ust", scene.id, "top", index === 0),
      createSceneOrderButton("Uste", scene.id, "up", index === 0),
      createSceneOrderButton("Alta", scene.id, "down", index === scenes.length - 1),
      createSceneOrderButton("En alt", scene.id, "bottom", index === scenes.length - 1),
    );

    // ── Scrollable body ──
    const scrollableBody = document.createElement("div");
    scrollableBody.className = "scene-editor-item-scrollable";

    // ── Image controls (grouped sections) ──
    if (scene.dataUrl) {
      // Position section
      const posSection = createLayerSection("Pozisyon", true);
      posSection.body.append(
        createRangeControl("Boyut", scene.imageZoom || 100, 5, 1200, 1, (value) => {
          scene.imageZoom = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Genislik", scene.imageScaleX || 100, 5, 1200, 1, (value) => {
          scene.imageScaleX = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Yukseklik", scene.imageScaleY || 100, 5, 1200, 1, (value) => {
          scene.imageScaleY = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("X", scene.imageX || 0, -1000, 1000, 0.5, (value) => {
          scene.imageX = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Y", scene.imageY || 0, -1000, 1000, 0.5, (value) => {
          scene.imageY = value;
          updateSceneImageTransform(scene);
        }),
      );
      scrollableBody.append(posSection.el);

      // Filter section
      const filterSection = createLayerSection("Filtreler", false);
      filterSection.body.append(
        createRangeControl("Parlaklik", scene.filterBrightness ?? sceneImageFilterDefaults.brightness, 70, 145, 1, (value) => {
          scene.filterBrightness = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Kontrast", scene.filterContrast ?? sceneImageFilterDefaults.contrast, 70, 150, 1, (value) => {
          scene.filterContrast = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Doygunluk", scene.filterSaturate ?? sceneImageFilterDefaults.saturate, 60, 180, 1, (value) => {
          scene.filterSaturate = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Sicaklik", scene.filterSepia ?? sceneImageFilterDefaults.sepia, 0, 18, 1, (value) => {
          scene.filterSepia = value;
          updateSceneImageTransform(scene);
        }),
        createRangeControl("Blur", scene.filterBlur ?? sceneImageFilterDefaults.blur, 0, 8, 0.1, (value) => {
          scene.filterBlur = value;
          updateSceneImageTransform(scene);
        }),
      );
      const resetFilterButton = document.createElement("button");
      resetFilterButton.type = "button";
      resetFilterButton.className = "layer-mini-btn";
      resetFilterButton.textContent = "Sifirla";
      resetFilterButton.addEventListener("click", () => resetSceneFilter(scene));
      filterSection.body.append(resetFilterButton);
      scrollableBody.append(filterSection.el);

      // Transition section
      const transSection = createLayerSection("Gecis efekti", false);
      transSection.body.append(
        createSelectControl("Stil", scene.transitionStyle || "none", [
          { value: "soft", text: "Soft fade" },
          { value: "cinematic", text: "Sinematik" },
          { value: "blur", text: "Blur gecis" },
          { value: "none", text: "Keskin" }
        ], (value) => {
          pushSceneHistory();
          scene.transitionStyle = value;
          renderScenes();
        }),
        createRangeControl("Boyut", scene.transitionSize ?? 150, 0, 600, 10, (value) => {
          scene.transitionSize = value;
          renderScenes();
        }),
        createSelectControl("Yon", scene.transitionSides || "both", [
          { value: "both", text: "Ust & Alt" },
          { value: "top", text: "Sadece Ust" },
          { value: "bottom", text: "Sadece Alt" }
        ], (value) => {
          pushSceneHistory();
          scene.transitionSides = value;
          renderScenes();
        }),
      );
      scrollableBody.append(transSection.el);

      if (scene.uploadedUrl) {
        const uploadedLink = document.createElement("a");
        uploadedLink.className = "uploaded-scene-link";
        uploadedLink.href = scene.uploadedUrl;
        uploadedLink.target = "_blank";
        uploadedLink.rel = "noreferrer";
        uploadedLink.textContent = "Yuklenen link";
        scrollableBody.append(uploadedLink);
      }
    } else {
      const blankNote = document.createElement("div");
      blankNote.className = "blank-layer-note";
      blankNote.textContent = "Bos katman. Yazi ekleyebilirsin.";
      scrollableBody.append(blankNote);
    }

    // ── Text block editors ──
    const blockEditors = document.createElement("div");
    blockEditors.className = "block-editor-list";

    scene.blocks.forEach((textBlock, blockIndex) => {
      const blockEditor = document.createElement("div");
      blockEditor.className = "block-editor";

      const blockHeader = document.createElement("div");
      blockHeader.className = "block-editor-header";

      const blockTitle = document.createElement("div");
      blockTitle.className = "scene-title";
      blockTitle.textContent = `Yazi ${blockIndex + 1}`;

      const fontInput = document.createElement("input");
      fontInput.className = "block-font-input";
      fontInput.type = "number";
      fontInput.min = "10";
      fontInput.max = "48";
      fontInput.step = "1";
      fontInput.value = textBlock.fontSize || getSceneFontSize();
      fontInput.title = "Bu yazinin font boyutu";
      fontInput.dataset.blockFontInputId = textBlock.id;
      prepareSceneHistoryControl(fontInput);
      fontInput.addEventListener("input", () => {
        const val = parseInt(fontInput.value, 10);
        if (!isNaN(val)) {
          textBlock.fontSize = Math.max(10, Math.min(48, val));
          const block = stage.querySelector(`[data-block-id="${CSS.escape(textBlock.id)}"]`);
          if (block) block.style.fontSize = `${textBlock.fontSize}px`;
        }
      });
      fontInput.addEventListener("change", () => {
        textBlock.fontSize = clampNumber(fontInput.value, 10, 48, getSceneFontSize());
        fontInput.value = textBlock.fontSize;
        saveState();
        renderScenes();
      });

      const styleSelect = document.createElement("select");
      styleSelect.title = "Bu yazinin arka plan/efekt stili";
      styleSelect.innerHTML = `
        <option value="box">Siyah kutu</option>
        <option value="outline">Kontur</option>
        <option value="soft">Soft golge</option>
        <option value="plain">Efektsiz</option>
      `;
      styleSelect.value = textBlock.textStyle || "box";
      prepareSceneHistoryControl(styleSelect);
      styleSelect.addEventListener("change", () => {
        textBlock.textStyle = styleSelect.value;
        const block = stage.querySelector(`[data-block-id="${CSS.escape(textBlock.id)}"]`);
        if (block) block.dataset.textStyle = textBlock.textStyle;
      });

      const deleteBlockButton = document.createElement("button");
      deleteBlockButton.type = "button";
      deleteBlockButton.textContent = "Sil";
      deleteBlockButton.addEventListener("click", () => removeTextBlock(scene.id, textBlock.id));

      blockHeader.append(blockTitle, fontInput, styleSelect, deleteBlockButton);

      const textarea = document.createElement("textarea");
      textarea.className = "scene-text";
      textarea.placeholder = "Bu yaziyi sahneye ekle...";
      textarea.spellcheck = false;
      textarea.value = textBlock.text;
      prepareSceneHistoryControl(textarea);
      textarea.addEventListener("input", () => {
        textBlock.text = textarea.value;
        const block = stage.querySelector(`[data-block-id="${CSS.escape(textBlock.id)}"]`);
        const content = block?.querySelector(".scene-text-content");
        if (content) renderSceneTextBlock(content, textBlock.text);
      });

      blockEditor.append(blockHeader, textarea);
      blockEditors.append(blockEditor);
    });

    scrollableBody.append(blockEditors);

    cardInner.append(itemHeader, orderRow, scrollableBody);
    item.append(dragGrip, cardInner);
    listContainer.append(item);
  });

  sceneLayersPanel.append(listContainer);
  sceneLayersPanel.append(...createPanelResizeHandles());

  composer.append(toolbar, canvasViewport);
  sceneList.append(composer);
  scheduleSceneAutosave();
  requestAnimationFrame(() => {
    applySceneViewportZoom();
    if (shouldAutoFitSceneViewport) {
      fitSceneToViewport();
      shouldAutoFitSceneViewport = false;
    }
  });
}

function removeScene(id) {
  const index = scenes.findIndex((scene) => scene.id === id);
  if (index === -1) return;
  if (!confirm(`Sahne ${index + 1} silinsin mi? Bu islem sadece bu sahneyi kaldirir.`)) return;
  pushSceneHistory();
  scenes.splice(index, 1);
  hoveredSceneId = "";
  selectedSceneId = scenes[Math.min(index, scenes.length - 1)]?.id || "";
  selectedSceneIds = selectedSceneId ? [selectedSceneId] : [];
  renderScenes();
  setSceneStatus("Sahne silindi.");
}

function removeScenes(ids) {
  const targetIds = [...new Set(ids)].filter((id) => scenes.some((scene) => scene.id === id));
  if (!targetIds.length) return;
  if (!confirm(`Secili ${targetIds.length} sahne silinsin mi?`)) return;

  pushSceneHistory();
  const firstIndex = scenes.findIndex((scene) => targetIds.includes(scene.id));
  scenes.splice(0, scenes.length, ...scenes.filter((scene) => !targetIds.includes(scene.id)));
  hoveredSceneId = "";
  selectedSceneId = scenes[Math.min(Math.max(firstIndex, 0), scenes.length - 1)]?.id || "";
  selectedSceneIds = selectedSceneId ? [selectedSceneId] : [];
  renderScenes();
  setSceneStatus(`${targetIds.length} sahne silindi.`);
}

function copySelectedScenes() {
  const targetIds = getSceneClipboardTargets();
  if (!targetIds.length) {
    setSceneStatus("Kopyalanacak sahne yok.");
    return;
  }

  const targetSet = new Set(targetIds);
  sceneClipboardScenes = scenes.filter((scene) => targetSet.has(scene.id)).map(cloneSceneSnapshot);
  setSceneStatus(`${targetIds.length} sahne kopyalandi. Ctrl+V ile yapistir.`);
}

function cutSelectedScenes() {
  const targetIds = getSceneClipboardTargets();
  if (!targetIds.length) {
    setSceneStatus("Kesilecek sahne yok.");
    return;
  }

  const targetSet = new Set(targetIds);
  sceneClipboardScenes = scenes.filter((scene) => targetSet.has(scene.id)).map(cloneSceneSnapshot);
  pushSceneHistory();
  const firstIndex = scenes.findIndex((scene) => targetSet.has(scene.id));
  scenes.splice(0, scenes.length, ...scenes.filter((scene) => !targetSet.has(scene.id)));
  hoveredSceneId = "";
  selectedSceneId = scenes[Math.min(Math.max(firstIndex, 0), scenes.length - 1)]?.id || "";
  selectedSceneIds = selectedSceneId ? [selectedSceneId] : [];
  renderScenes();
  setSceneStatus(`${targetIds.length} sahne kesildi. Ctrl+V ile yapistir.`);
}

function pasteSceneClipboard() {
  if (!sceneClipboardScenes.length) return;

  pushSceneHistory();
  const clones = sceneClipboardScenes.map(cloneSceneForPaste);
  const selectedIds = getSelectedSceneIds();
  const anchorIds = selectedIds.length ? selectedIds : hoveredSceneId ? [hoveredSceneId] : [];
  const anchorIndex = anchorIds.length
    ? Math.max(...anchorIds.map((id) => scenes.findIndex((scene) => scene.id === id)).filter((index) => index >= 0))
    : scenes.length - 1;
  scenes.splice(anchorIndex + 1, 0, ...clones);
  selectedSceneIds = clones.map((scene) => scene.id);
  selectedSceneId = selectedSceneIds[0] || "";
  hoveredSceneId = "";
  renderScenes();
  switchMode("scene");
  setSceneStatus(`${clones.length} sahne yapistirildi.`);
}

function cloneSceneSnapshot(scene) {
  return JSON.parse(JSON.stringify(scene));
}

function cloneSceneForPaste(scene) {
  const clone = cloneSceneSnapshot(scene);
  clone.id = createId();
  clone.name = `${clone.name || "sahne"} kopya`;
  clone.blocks = (clone.blocks || []).map((block) => ({ ...block, id: createId() }));
  return clone;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function clearScenes() {
  if (!scenes.length) return;
  if (!confirm("Tum sahneler silinsin mi?")) return;
  pushSceneHistory();
  scenes.splice(0, scenes.length);
  selectedSceneId = "";
  selectedSceneIds = [];
  hoveredSceneId = "";
  renderScenes();
  setSceneStatus("Tum sahneler silindi.");
}

function exportSceneProject() {
  ensureSceneModel();
  if (!scenes.length) {
    setSceneStatus("RSE icin once en az bir sahne/katman olustur.");
    return;
  }

  const payload = createSceneProjectPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/vnd.rollss.rse+json;charset=utf-8",
  });
  const link = document.createElement("a");
  link.download = createSceneProjectFileName(payload);
  link.href = URL.createObjectURL(blob);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  setSceneStatus(`RSE indirildi: ${payload.scenes.length} katman kaydedildi.`);
}

function createSceneProjectPayload() {
  return {
    magic: rseProjectMagic,
    format: "rse",
    version: rseProjectVersion,
    app: "Roll SS Editor",
    exportedAt: new Date().toISOString(),
    sourceText: sourceText.value,
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
    const payload = JSON.parse(await file.text());
    const project = normalizeSceneProjectPayload(payload);
    if (!project) {
      setSceneStatus("RSE yuklenemedi: dosya bu programa ait degil.");
      return;
    }

    if (scenes.length && !confirm("Mevcut sahne projesi RSE dosyasi ile degistirilsin mi?")) return;

    pushSceneHistory();
    applySceneProjectPayload(project);
    saveState();
    scheduleSceneAutosave();
    switchMode("scene");
    renderScenes();
    setSceneStatus(`RSE yuklendi: ${scenes.length} katman geri getirildi.`);
  } catch (error) {
    setSceneStatus(`RSE yuklenemedi: ${error.message || "gecersiz dosya"}.`);
  } finally {
    sceneProjectInput.value = "";
  }
}

function normalizeSceneProjectPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.magic !== rseProjectMagic || payload.format !== "rse") return null;
  if (!Array.isArray(payload.scenes)) return null;

  const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
  const selection = payload.selection && typeof payload.selection === "object" ? payload.selection : {};
  return {
    sourceText: typeof payload.sourceText === "string" ? payload.sourceText : "",
    settings,
    selection,
    scenes: payload.scenes.map(normalizeImportedScene).filter(Boolean),
  };
}

function normalizeImportedScene(scene, index) {
  if (!scene || typeof scene !== "object") return null;
  const clone = JSON.parse(JSON.stringify(scene));
  clone.id = typeof clone.id === "string" && clone.id ? clone.id : createId();
  clone.name = typeof clone.name === "string" && clone.name ? clone.name : `Katman ${index + 1}`;
  clone.dataUrl = typeof clone.dataUrl === "string" ? clone.dataUrl : "";
  clone.isBlank = !clone.dataUrl;
  clone.blocks = Array.isArray(clone.blocks) ? clone.blocks : [];
  clone.blocks = clone.blocks
    .filter((block) => block && typeof block === "object")
    .map((block) => ({
      ...block,
      id: typeof block.id === "string" && block.id ? block.id : createId(),
      text: typeof block.text === "string" ? block.text : "",
    }));
  return clone;
}

function applySceneProjectPayload(project) {
  sourceText.value = project.sourceText || "";
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
  renderPreview();
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
  setSceneStatus(`${selectedSceneIds.length} sahne secildi.`);
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
  if (sceneUndoStack.at(-1)?.key === entry.key) return;
  sceneUndoStack.push(entry);
  if (sceneUndoStack.length > sceneHistoryLimit) sceneUndoStack.shift();
  sceneRedoStack.length = 0;
}

function undoSceneHistory() {
  if (!sceneUndoStack.length) {
    setSceneStatus("Geri alinacak islem yok.");
    return;
  }

  sceneRedoStack.push(createSceneHistoryEntry());
  if (sceneRedoStack.length > sceneHistoryLimit) sceneRedoStack.shift();
  restoreSceneHistoryEntry(sceneUndoStack.pop(), "Geri alindi.");
}

function redoSceneHistory() {
  if (!sceneRedoStack.length) {
    setSceneStatus("Ileri alinacak islem yok.");
    return;
  }

  sceneUndoStack.push(createSceneHistoryEntry());
  if (sceneUndoStack.length > sceneHistoryLimit) sceneUndoStack.shift();
  restoreSceneHistoryEntry(sceneRedoStack.pop(), "Ileri alindi.");
}

function createSceneHistoryEntry() {
  const key = JSON.stringify({
    scenes,
    selectedSceneId,
    selectedSceneIds,
    sceneOutputWidth: sceneOutputWidth.value,
    sceneBackgroundHeight: sceneBackgroundHeight.value,
    sceneTransitionSize: sceneTransitionSize.value,
    sceneTransitionStyle: sceneTransitionStyle.value,
    sceneTransitionSides: sceneTransitionSides.value,
  });
  return { key, snapshot: JSON.parse(key) };
}

function restoreSceneHistoryEntry(entry, message) {
  scenes.splice(0, scenes.length, ...(entry.snapshot.scenes || []));
  if (entry.snapshot.sceneOutputWidth) sceneOutputWidth.value = entry.snapshot.sceneOutputWidth;
  if (entry.snapshot.sceneBackgroundHeight) sceneBackgroundHeight.value = entry.snapshot.sceneBackgroundHeight;
  if (entry.snapshot.sceneTransitionSize) sceneTransitionSize.value = entry.snapshot.sceneTransitionSize;
  if (entry.snapshot.sceneTransitionStyle) sceneTransitionStyle.value = entry.snapshot.sceneTransitionStyle;
  if (entry.snapshot.sceneTransitionSides) sceneTransitionSides.value = entry.snapshot.sceneTransitionSides;
  selectedSceneId = entry.snapshot.selectedSceneId || scenes[0]?.id || "";
  selectedSceneIds = Array.isArray(entry.snapshot.selectedSceneIds) ? entry.snapshot.selectedSceneIds : selectedSceneId ? [selectedSceneId] : [];
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

function refreshSceneStyles() {
  document.querySelectorAll(".composite-stage").forEach((stage) => {
    stage.style.setProperty("--scene-padding", `${getScenePadding()}px`);
  });
  document.querySelectorAll(".scene-text-block").forEach((block) => {
    const blockData = findTextBlock(block.dataset.blockId);
    block.style.fontSize = `${blockData?.fontSize || getSceneFontSize()}px`;
  });
}

function applyGlobalSceneFontSize() {
  const fontSize = getSceneFontSize();
  scenes.forEach((scene) => {
    scene.blocks?.forEach((block) => {
      block.fontSize = fontSize;
    });
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
    empty.textContent = "Yaziyi buraya surukleyebilirsin";
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

function createSceneImageTransformBox(scene) {
  const box = document.createElement("div");
  box.className = "scene-image-transform-box";
  if (isSceneSelected(scene.id)) box.classList.add("selected");
  box.dataset.sceneTransformId = scene.id;
  box.style.transform = getSceneImageTransform(scene);
  box.title = "Resmi tasimak icin surukle; koseden orantili, kenardan yatay/dikey esnet";
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
  frame.title = "Siyah canvas alanini kenardan veya koseden buyut/kucult";

  const sizeBadge = document.createElement("span");
  sizeBadge.className = "stage-size-badge";
  sizeBadge.textContent = `${getSceneOutputWidth()} x ${getSceneBackgroundHeight()}`;
  frame.append(sizeBadge);

  ["e", "s", "se"].forEach((direction) => {
    const handle = document.createElement("span");
    handle.className = `stage-resize-handle ${direction}`;
    handle.dataset.direction = direction;
    handle.title = direction === "e" ? "Genisligi ayarla" : direction === "s" ? "Yuksekligi ayarla" : "Genislik ve yuksekligi ayarla";
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
    fontSize: getSceneFontSize(),
    textStyle: "box",
  };
}

function ensureSceneModel() {
  scenes.forEach((scene) => {
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
    if (!Array.isArray(scene.blocks)) {
      scene.blocks = scene.text ? [{
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        text: scene.text || "",
        x: scene.x ?? 2,
        y: scene.y ?? 72,
        width: scene.width ?? 88,
        fontSize: scene.fontSize || getSceneFontSize(),
        textStyle: scene.textStyle || "box",
      }] : [];
    }
    scene.blocks = scene.blocks.filter((block) => String(block.text || "").trim().length > 0 || block.userCreated);
    scene.blocks.forEach((block, blockIndex) => {
      block.id ??= crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      block.x ??= 2;
      block.width ??= 88;
      block.fontSize ??= getSceneFontSize();
      block.textStyle ??= "box";
      if (block.y === null || block.y === undefined) {
        block.y = Math.min(92, 72 + blockIndex * 6);
      }
    });
  });
}

function findTextBlock(id) {
  for (const scene of scenes) {
    const block = scene.blocks?.find((candidate) => candidate.id === id);
    if (block) return block;
  }
  return null;
}

function createSceneOrderButton(label, sceneId, placement, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scene-order-button";
  button.textContent = label;
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
  setSceneStatus(`Sahne ${placement === "top" ? "en uste" : placement === "bottom" ? "en alta" : placement === "up" ? "uste" : "alta"} tasindi.`);
}

function startSceneOrderDrag(event, sceneId) {
  draggingSceneId = sceneId;
  setSelectedScene(sceneId);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", sceneId);
  document.querySelector(`[data-scene-editor-id="${CSS.escape(sceneId)}"]`)?.classList.add("dragging-order");
}

function handleSceneDragOver(event, targetSceneId) {
  if (!draggingSceneId || draggingSceneId === targetSceneId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const item = event.currentTarget;
  const rect = item.getBoundingClientRect();
  document.querySelectorAll(".scene-editor-item.drop-before, .scene-editor-item.drop-after").forEach((candidate) => {
    if (candidate !== item) candidate.classList.remove("drop-before", "drop-after");
  });
  item.classList.toggle("drop-before", event.clientY < rect.top + rect.height / 2);
  item.classList.toggle("drop-after", event.clientY >= rect.top + rect.height / 2);
}

function handleSceneDrop(event, targetSceneId) {
  if (!draggingSceneId || draggingSceneId === targetSceneId) return;
  event.preventDefault();
  const item = event.currentTarget;
  const rect = item.getBoundingClientRect();
  const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  reorderSceneByDrop(draggingSceneId, targetSceneId, placement);
  endSceneOrderDrag();
}

function endSceneOrderDrag() {
  draggingSceneId = "";
  document.querySelectorAll(".scene-editor-item").forEach((item) => {
    item.classList.remove("dragging-order", "drop-before", "drop-after");
  });
}

function reorderSceneByDrop(sceneId, targetSceneId, placement) {
  const fromIndex = scenes.findIndex((scene) => scene.id === sceneId);
  const targetIndex = scenes.findIndex((scene) => scene.id === targetSceneId);
  if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) return;

  let insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  if (fromIndex < insertIndex) insertIndex -= 1;
  if (insertIndex === fromIndex) return;

  pushSceneHistory();
  const [scene] = scenes.splice(fromIndex, 1);
  scenes.splice(insertIndex, 0, scene);
  selectedSceneId = sceneId;
  selectedSceneIds = [sceneId];
  hoveredSceneId = "";
  renderScenes();
  setSceneStatus("Sahne sirasi suruklemeyle degistirildi.");
}

function resetSceneFilter(scene) {
  pushSceneHistory();
  scene.filterBrightness = sceneImageFilterDefaults.brightness;
  scene.filterContrast = sceneImageFilterDefaults.contrast;
  scene.filterSaturate = sceneImageFilterDefaults.saturate;
  scene.filterSepia = sceneImageFilterDefaults.sepia;
  scene.filterBlur = sceneImageFilterDefaults.blur;
  renderScenes();
  setSceneStatus("Sahne filtresi sifirlandi.");
}

function addTextBlock(sceneId) {
  ensureSceneModel();
  const sceneIndex = scenes.findIndex((scene) => scene.id === sceneId);
  if (sceneIndex === -1) return;
  const scene = scenes[sceneIndex];
  pushSceneHistory();
  const block = createSceneBlock("");
  block.userCreated = true;
  block.y = Math.min(94, 72 + scene.blocks.length * 6);
  scene.blocks.push(block);
  renderScenes();
  setSceneStatus("Yeni yazi kutusu eklendi.");
}

function createLayerSection(title, openByDefault) {
  const section = document.createElement("details");
  section.className = "layer-section";
  if (openByDefault) section.open = true;
  const summary = document.createElement("summary");
  summary.className = "layer-section-title";
  summary.textContent = title;
  const body = document.createElement("div");
  body.className = "layer-section-body";
  section.append(summary, body);
  return { el: section, body };
}

function removeTextBlock(sceneId, blockId) {
  const scene = scenes.find((candidate) => candidate.id === sceneId);
  if (!scene || !Array.isArray(scene.blocks)) return;
  if (!confirm("Bu yazi kutusu silinsin mi? Resim/sahne kalacak.")) return;
  pushSceneHistory();
  scene.blocks = scene.blocks.filter((block) => block.id !== blockId);
  renderScenes();
  setSceneStatus("Yazi kutusu silindi.");
}

function getSceneAccent(index) {
  const accents = ["#6f98ff", "#c69aff", "#5dde72", "#ff9f2e", "#ff6b7d", "#ffd447"];
  return accents[index % accents.length];
}

function createRangeControl(labelText, value, min, max, step, onInput) {
  const label = document.createElement("label");
  label.className = "range-control";
  const title = document.createElement("span");
  title.textContent = labelText;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const valueText = document.createElement("b");
  valueText.textContent = formatControlValue(value);
  prepareSceneHistoryControl(input);
  input.addEventListener("input", () => {
    const parsed = clampNumber(input.value, min, max, value);
    valueText.textContent = formatControlValue(parsed);
    onInput(parsed);
  });
  label.append(title, input, valueText);
  return label;
}

function createSelectControl(labelText, value, options, onChange) {
  const label = document.createElement("label");
  label.className = "range-control";
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
  label.append(title, select);
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
  setSelectedScene(scene.id);
  pushSceneHistory();
  const stageRect = stage.getBoundingClientRect();
  const startBoxRect = box.getBoundingClientRect();
  const visualWidth = startBoxRect.width;
  const visualHeight = startBoxRect.height;
  const startX = event.clientX;
  const startY = event.clientY;
  const initialX = scene.imageX || 0;
  const initialY = scene.imageY || 0;

  box.setPointerCapture(event.pointerId);
  box.classList.add("moving");

  const onMove = (moveEvent) => {
    const deltaX = ((moveEvent.clientX - startX) / Math.max(1, stageRect.width)) * 100;
    const deltaY = ((moveEvent.clientY - startY) / Math.max(1, stageRect.height)) * 100;
    scene.imageX = roundPositionValue(initialX + deltaX);
    scene.imageY = roundPositionValue(initialY + deltaY);
    const snap = snapStageBox(stage, getImageVisualBox(stageRect, scene, visualWidth, visualHeight), { disabled: moveEvent.altKey });
    scene.imageX = roundPositionValue(scene.imageX + (snap.deltaX / Math.max(1, stageRect.width)) * 100);
    scene.imageY = roundPositionValue(scene.imageY + (snap.deltaY / Math.max(1, stageRect.height)) * 100);
    updateSceneImageTransform(scene);
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
    setSceneStatus(`Canvas ${getSceneOutputWidth()} x ${getSceneBackgroundHeight()} olarak ayarlandi.`);
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
      }, { allowX: true, allowY: true });
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
  setSelectedScene(block.dataset.sceneId);
  pushSceneHistory();
  const stageRect = stage.getBoundingClientRect();
  const blockRect = block.getBoundingClientRect();
  const offsetX = event.clientX - blockRect.left;
  const offsetY = event.clientY - blockRect.top;

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
    }, { disabled: snapDisabled });
    left = Math.min(maxLeft, Math.max(0, left + snap.deltaX));
    top = Math.min(maxTop, Math.max(0, top + snap.deltaY));
    textBlock.x = (left / stageRect.width) * 100;
    textBlock.y = (top / stageRect.height) * 100;
    block.style.left = `${textBlock.x}%`;
    block.style.top = `${textBlock.y}%`;
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
    }, { allowY: false, disabled: snapDisabled });
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

async function downloadCompositeScene() {
  ensureSceneModel();
  const imageEntries = await Promise.all(scenes.map(async (scene) => {
    if (!scene.dataUrl) return { scene, image: null };
    return { scene, image: await loadImage(scene.dataUrl) };
  }));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const outputWidth = getSceneOutputWidth();
  const outputHeight = getSceneBackgroundHeight();

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.fillStyle = sceneCanvasBackground;
  context.fillRect(0, 0, outputWidth, outputHeight);

  [...imageEntries].reverse().forEach(({ scene, image }) => {
    if (!image) return;
    drawSceneLayerImage(context, image, scene, outputWidth, outputHeight);
  });

  [...scenes].reverse().forEach((scene) => {
    scene.blocks.forEach((block) => {
      drawSceneTextBlock(context, block.text, block, outputWidth, outputHeight);
    });
  });

  const link = document.createElement("a");
  link.download = `sahne-kompozit-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  setSceneStatus("Tek PNG indirildi.");
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
  const lineHeight = fontSize * 1.18;
  const padding = getScenePadding() * scale;
  const maxWidth = blockWidth - padding * 2;
  const x = (textBlock.x / 100) * width;
  const y = (textBlock.y / 100) * height;

  context.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.textBaseline = "top";
  const sceneOptions = { ...getOptions(), fontSize, lineGap: lineHeight - fontSize };
  const wrapped = parseLines(text).flatMap((line) => wrapLine(context, line, maxWidth, sceneOptions));
  if (!wrapped.length) return;

  const boxHeight = padding * 2 + wrapped.length * lineHeight;
  const textStyle = textBlock.textStyle || "box";
  if (textStyle === "box") {
    context.fillStyle = "#000000";
    context.fillRect(x, y, blockWidth, boxHeight);
  }

  const textEffect = textStyle === "box" ? "plain" : textStyle;
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

function getSavedToolboxWidth() {
  return clampNumber(getClientStoredValue(storageKeys.toolboxWidth), 300, 620, 330);
}

function createPanelResizeHandles() {
  return ["n", "e", "s", "w", "ne", "nw", "se", "sw"].map((direction) => {
    const handle = document.createElement("span");
    handle.className = `panel-resize-handle ${direction}`;
    handle.dataset.resizeDirection = direction;
    handle.title = "Panel boyutunu ayarla";
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
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function safeFilePart(value) {
  return value.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "scene";
}

function setSceneStatus(message) {
  sceneStatus.textContent = message;
}

function setApiStatus(message) {
  apiStatus.textContent = message;
}

async function uploadSelectedSceneToApi() {
  const endpoint = apiEndpoint.value.trim();
  if (!endpoint) {
    setApiStatus("Endpoint girilmedi.");
    return;
  }

  const sceneId = selectedSceneId || scenes[0]?.id;
  const scene = scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) {
    setApiStatus("Yuklenecek sahne yok.");
    return;
  }
  if (!scene.dataUrl) {
    setApiStatus("Secili katmanda yuklenecek resim yok.");
    return;
  }

  saveState();
  setApiStatus("Yukleniyor...");
  try {
    const form = new FormData();
    const blob = dataUrlToBlob(scene.dataUrl);
    const fieldName = apiFieldName.value.trim() || "image";
    form.append(fieldName, blob, safeFilePart(scene.name || "scene") + ".png");

    const headers = {};
    if (apiToken.value.trim()) headers.Authorization = `Bearer ${apiToken.value.trim()}`;
    const response = await fetch(endpoint, { method: "POST", headers, body: form });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const uploadedUrl = extractFirstUrl(text);
    scene.uploadedUrl = uploadedUrl || "";
    scheduleSceneAutosave();
    renderScenes();
    setApiStatus(uploadedUrl ? `Yuklendi: ${uploadedUrl}` : "Yuklendi ama URL otomatik bulunamadi.");
  } catch (error) {
    setApiStatus(`Yukleme basarisiz: ${error.message}`);
  }
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(payload || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function extractFirstUrl(value) {
  try {
    const parsed = JSON.parse(value);
    const stack = [parsed];
    while (stack.length) {
      const item = stack.shift();
      if (typeof item === "string" && /^https?:\/\//i.test(item)) return item;
      if (item && typeof item === "object") stack.push(...Object.values(item));
    }
  } catch {
    // fall through to regex
  }
  return value.match(/https?:\/\/[^\s"'<>\\]+/i)?.[0] || "";
}

function shouldKeepCleanLine(line) {
  if (isOoc(line) || isSystemLine(line) || isStarredSystemLine(line) || isAdminLine(line) || isHelpdeskLine(line) || isRoleplayUtilityLine(line) || isMechanicalActionLine(line) || isWhisperLogLine(line) || isIdLookupLine(line) || isGlobalSystemLine(line) || isDoingActionLine(line)) return false;
  if (line.startsWith("**")) return true;
  if (line.startsWith("*")) return true;
  return /^[^\[][^:]{1,70}:\s*\S/.test(line) || /^[^\[]+?\s+\([^)]+\):\s*\S/.test(line) || /^[^\[]+?\s+seslenir\s+\([^)]+\):\s*\S/i.test(line);
}

function stripInlineTags(line) {
  return line
    .replace(/\[\/?emote\]/gi, "")
    .replace(/,\s*\*([^\s*][^.]*)/g, ", $1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function uniqueNotificationLine(line) {
  const key = getNotificationKey(line);
  if (!key) return true;

  uniqueNotificationLine.seen ??= new Set();
  if (uniqueNotificationLine.seen.has(key)) return false;
  uniqueNotificationLine.seen.add(key);
  return true;
}

function resetNotificationDedupe() {
  uniqueNotificationLine.seen = new Set();
}

function getNotificationKey(line) {
  const folded = foldText(line);
  const match = folded.match(/^\*\s+telefonu\s+(calmaktadir|titremektedir)\.\s+\(\(\s*(.+?)\s*\)\)\s*$/);
  if (!match) return "";
  return `phone:${match[1]}:${match[2]}`;
}

function setDateDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  controls.startDate.value = today;
  controls.endDate.value = today;
}

Object.values(controls).forEach((control) => control.addEventListener("input", renderPreview));
Object.values(controls).forEach((control) => control.addEventListener("input", saveState));
controls.textEffect.addEventListener("change", renderPreview);
controls.backgroundMode.addEventListener("change", renderPreview);
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
  saveState();
  renderScenes();
});
sceneTransitionStyle.addEventListener("change", () => {
  saveState();
  renderScenes();
});
sceneTransitionSides.addEventListener("change", () => {
  saveState();
  renderScenes();
});
applyGlobalTransitionBtn.addEventListener("click", () => {
  pushSceneHistory();
  const style = sceneTransitionStyle.value;
  const size = Number(sceneTransitionSize.value) || 150;
  const sides = sceneTransitionSides.value;
  scenes.forEach((scene) => {
    scene.transitionStyle = style;
    scene.transitionSize = size;
    scene.transitionSides = sides;
  });
  saveState();
  renderScenes();
  setSceneStatus("Gecis ayarlari tum katmanlara uygulandi.");
});
apiEndpoint.addEventListener("input", saveState);
apiToken.addEventListener("input", saveState);
apiFieldName.addEventListener("input", saveState);
uploadSceneBtn.addEventListener("click", uploadSelectedSceneToApi);
prepareSceneHistoryControl(sceneFontSize);
sceneFontSize.addEventListener("input", () => {
  saveState();
  applyGlobalSceneFontSize();
});
scenePadding.addEventListener("input", refreshSceneStyles);
window.addEventListener("resize", () => {
  renderPreview();
  if (activeMode === "scene") renderScenes();
});
sourceText.addEventListener("input", () => {
  renderPreview();
  saveState();
});
downloadBtn.addEventListener("click", handleMainDownload);
rollTab.addEventListener("click", () => switchMode("roll"));
sceneTab.addEventListener("click", () => switchMode("scene"));
sampleBtn.addEventListener("click", () => {
  sourceText.value = sample;
  renderPreview();
  saveState();
});
cleanBtn.addEventListener("click", cleanText);
clearAllBtn.addEventListener("click", clearAllChats);
copyRawBtn.addEventListener("click", copyRawText);
copyBtn.addEventListener("click", copyParsedText);
sceneImageInput.addEventListener("change", () => addSceneImages(sceneImageInput.files));
blankSceneBtn.addEventListener("click", addBlankScene);
exportSceneProjectBtn.addEventListener("click", exportSceneProject);
sceneProjectInput.addEventListener("change", importSceneProject);
clearScenesBtn.addEventListener("click", clearScenes);
hideToolboxBtn.addEventListener("click", hideToolbox);
showToolboxBtn.addEventListener("click", showToolbox);
showLayersBtn.addEventListener("click", showLayersPanel);
document.querySelector(".editor-panel").addEventListener("pointerdown", startToolboxResize);
document.addEventListener("paste", handlePaste);
window.addEventListener("wheel", handleSceneWheel, { passive: false, capture: true });
window.addEventListener("keydown", handleSceneKeyDown);
window.addEventListener("keyup", handleSceneKeyUp);
window.addEventListener("beforeunload", () => {
  saveState();
  saveLocalScenesNow().catch(() => {});
});
document.addEventListener("pointerdown", startSceneViewportPan);

switchMode("scene");
loadLocalScenes().catch(() => setSceneStatus("Lokal sahneler yuklenemedi."));

/* ── Window Manager (Dock & Float) ── */
document.addEventListener("pointerdown", (e) => {
  if (activeMode !== "scene") return;
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

  panel.style.width = Math.min(rect.width, window.innerWidth - 24) + "px";
  panel.style.height = Math.min(rect.height, window.innerHeight - 24) + "px";
  panel.style.left = rect.left + "px";
  panel.style.top = rect.top + "px";
  
  let currentDock = null;

  const onPointerMove = (moveEvent) => {
    moveEvent.preventDefault();
    const maxLeft = Math.max(12, window.innerWidth - panel.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - panel.offsetHeight - 12);
    const newLeft = clampNumber(moveEvent.clientX - offsetX, 12, maxLeft, 12);
    const newTop = clampNumber(moveEvent.clientY - offsetY, 12, maxTop, 12);
    panel.style.left = newLeft + "px";
    panel.style.top = newTop + "px";

    // Determine drop zones
    if (moveEvent.clientX > window.innerWidth - 150) {
      currentDock = "right";
      indicator.style.display = "block";
      indicator.style.left = (window.innerWidth - 380) + "px";
      indicator.style.top = "0";
      indicator.style.width = "380px";
      indicator.style.height = "100vh";
    } else {
      currentDock = null;
      indicator.style.display = "none";
    }
  };

  const onPointerUp = (upEvent) => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    
    panel.classList.remove("dragging");
    indicator.style.display = "none";

    // Docking logic
    if (currentDock === "right" && isLayersPanel) {
      panel.classList.remove("floating", "dockable-panel");
      document.body.classList.remove("layers-floating");
      panel.style.width = "";
      panel.style.height = "";
      panel.style.left = "";
      panel.style.top = "";
    }
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
});
