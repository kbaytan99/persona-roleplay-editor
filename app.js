"use strict";

// Cache-buster query strings below (and on index.html's <link>/<script>
// tags) must match appVersion on every release - see index.html for why.
import { clampNumber } from "./scripts/utils.js?v=3.19.0";
import { parseLines, appendSegments, wrapLine, drawSegmentedText } from "./scripts/rp-text.js?v=3.19.0";
import { t, getLanguage, setLanguage, onLanguageChange, translateStaticDom } from "./scripts/i18n.js?v=3.19.0";
import { rpIdeaCategories } from "./scripts/rp-ideas.js?v=3.19.0";
import { promptCategories } from "./scripts/prompt-library.js?v=3.19.0";
import { appChangelog } from "./scripts/changelog.js?v=3.19.0";
import {
  storageKeys,
  clientStorageKey,
  getClientStoredValue,
  saveState,
  restoreState,
  scheduleSceneAutosave,
  saveLocalScenesNow,
  loadLocalScenes,
  recordUploadHistory,
  readUploadHistory,
  createUploadThumbnail,
} from "./scripts/storage.js?v=3.19.0";
import {
  sceneClipboardScenes,
  cetvelEnabled,
  setCetvelEnabled,
  addBlankScene,
  addSceneImages,
  addTextLayer,
  buildCompositeCanvas,
  clearSceneSelection,
  clearScenes,
  copySelectedScenes,
  createExampleScenes,
  cutSelectedScenes,
  duplicateSelectedScenes,
  ensureSceneModel,
  exportSceneProject,
  getSceneClipboardTargets,
  getSceneDeleteTargets,
  handleCopyScene,
  handleMainDownload,
  handlePaste,
  importSceneProject,
  isSceneSelected,
  normalizeSceneSelection,
  pasteSceneClipboard,
  prepareSceneHistoryControl,
  pushSceneHistory,
  redoSceneHistory,
  refreshSceneSelection,
  rememberTextLayerDefaults,
  removeScene,
  removeScenes,
  selectAllScenes,
  selectSceneRange,
  setSelectedScene,
  showUploadHistoryPanel,
  toggleSceneSelection,
  undoSceneHistory,
  uploadCompositeSceneToImgbb,
} from "./scripts/scene-model.js?v=3.19.0";
import {
  sceneViewportZoom,
  isSpacePanning,
  applyGlobalSceneFontSize,
  applyGlobalTransitionToAllScenes,
  applySceneLayerPosition,
  applySceneViewportZoom,
  createSceneImageTransformBox,
  createStageResizeFrame,
  drawSceneTextBlock,
  fitSceneToViewport,
  getSceneBackgroundHeight,
  getSceneFontSize,
  getSceneImageFilter,
  getSceneImageTransform,
  getSceneLayerZIndex,
  getSceneOutputWidth,
  getScenePadding,
  getScenePreviewHeight,
  getScenePreviewWidth,
  handleSceneKeyDown,
  handleSceneKeyUp,
  handleSceneWheel,
  isEditableTarget,
  refreshSceneStyles,
  renderSceneTextBlock,
  setSceneViewportZoom,
  startInlineSceneTextEdit,
  startSceneMarqueeSelect,
  startSceneTextDrag,
  startSceneTextResize,
  startSceneViewportPan,
  updateSceneImageTransform,
} from "./scripts/canvas.js?v=3.19.0";
import {
  createLayerSection,
  createRangeControl,
  renderScenes,
} from "./scripts/layer-panel.js?v=3.19.0";

const appVersion = "3.19.0";

export const appShell = document.querySelector(".app-shell");
export const downloadBtn = document.querySelector("#downloadBtn");
export const copySceneBtn = document.querySelector("#copySceneBtn");
export const uploadImgbbBtn = document.querySelector("#uploadImgbbBtn");
export const uploadHistoryBtn = document.querySelector("#uploadHistoryBtn");
export const discordWebhookInput = document.querySelector("#discordWebhookInput");
export const sceneImageInput = document.querySelector("#sceneImageInput");
export const sceneOutputWidth = document.querySelector("#sceneOutputWidth");
export const sceneBackgroundHeight = document.querySelector("#sceneBackgroundHeight");
export const sceneFontSize = document.querySelector("#sceneFontSize");
export const scenePadding = document.querySelector("#scenePadding");
export const sceneTransitionSize = document.querySelector("#sceneTransitionSize");
export const sceneTransitionStyle = document.querySelector("#sceneTransitionStyle");
export const sceneTransitionSides = document.querySelector("#sceneTransitionSides");
export const languageSelect = document.querySelector("#languageSelect");
export const ideaCategorySelect = document.querySelector("#ideaCategorySelect");
export const ideaNewBtn = document.querySelector("#ideaNewBtn");
export const ideaDisplay = document.querySelector("#ideaDisplay");
export const promptCategorySelect = document.querySelector("#promptCategorySelect");
export const promptCopyBtn = document.querySelector("#promptCopyBtn");
export const promptDisplay = document.querySelector("#promptDisplay");
export const blankSceneBtn = document.querySelector("#blankSceneBtn");
export const cetvelToggleBtn = document.querySelector("#cetvelToggleBtn");
export const exportSceneProjectBtn = document.querySelector("#exportSceneProjectBtn");
export const sceneProjectInput = document.querySelector("#sceneProjectInput");
export const clearScenesBtn = document.querySelector("#clearScenesBtn");
export const hideShortcutsBtn = document.querySelector("#hideShortcutsBtn");
export const showShortcutsBtn = document.querySelector("#showShortcutsBtn");
export const sceneStatus = document.querySelector("#sceneStatus");
export const sceneList = document.querySelector("#sceneList");
export const sceneLayersPanel = document.querySelector("#sceneLayersPanel");
export const appTitle = document.querySelector("#appTitle");
export const appSubtitle = document.querySelector("#appSubtitle");
export const scenePreviewPane = document.querySelector("#scenePreviewPane");

export const controls = {
  sceneFontSize,
  scenePadding,
};

export const scenes = [];
export const sceneTransitionPx = 150;
export const sceneCanvasDefaultWidth = 1200;
export const sceneCanvasDefaultHeight = 800;
export const sceneCanvasMaxDimension = 32767;
// 32767x32767 (the per-side max, mostly there so a single stray huge value
// can't itself overflow canvas APIs) times an equally large other side would
// be ~1.07 billion pixels - a ~4.3GB RGBA buffer, which reliably crashes or
// silently no-ops the tab well before that. This is a separate, much
// smaller total-area budget: generous for a screenshot compositor (a
// 10000x4000 canvas fits comfortably under it) but bounded well short of
// "the browser gives up." Enforced in buildCompositeCanvas() right before
// the canvas is allocated, so it catches every path that can set the two
// dimensions (Ayarlar inputs, RSE import, drag-resize handle).
export const sceneCanvasMaxPixels = 40_000_000;
export const sceneCanvasBackground = "#10141b";
export const rseProjectMagic = "ROLEPLAY_SCENE_EXPORT";
export const rseProjectVersion = 1;
// RSE files embed every layer's image as base64, so a legitimate multi-image
// project can be large - this is a backstop against a corrupt/malicious
// file hanging JSON.parse or blowing up memory, not a normal-use limit.
export const rseMaxImportBytes = 200 * 1024 * 1024;
export const sceneImageFilterDefaults = {
  brightness: 106,
  contrast: 108,
  saturate: 112,
  sepia: 4,
  blur: 0,
};
export const sceneSnapThresholdPx = 12;
export const sceneHistoryLimit = 20;
export const sceneUndoStack = [];
export const sceneRedoStack = [];
export let selectedSceneId = "";
export let selectedSceneIds = [];
export let expandedLayerIds = new Set();
export let hoveredSceneId = "";
export let shouldAutoFitSceneViewport = true;
// Setters for modules that can't reassign the imported selectedSceneId/
// selectedSceneIds/hoveredSceneId bindings directly (ES module imports are
// read-only views) - e.g. scene-model.js's selection/clipboard/history
// logic, or storage.js restoring a saved/legacy selection on load.
export function setSelectedSceneIdRaw(id) {
  selectedSceneId = id;
}
export function setSelectedSceneIdsRaw(ids) {
  selectedSceneIds = ids;
}
export function setHoveredSceneIdRaw(id) {
  hoveredSceneId = id;
}
// Last pointer position over the composite stage, so a new text layer can
// spawn where the mouse actually is instead of a fixed spot. Tracked with a
// plain document-level pointermove (cheap - just two numbers) rather than
// only inside the stage, since the pointer needs to be checked against
// whichever stage element exists at layer-creation time anyway.
export let lastPointerClientX = null;
export let lastPointerClientY = null;

restoreState();

function setIconButtonContent(button, icon, label) {
  button.replaceChildren();
  const iconNode = document.createElement("i");
  iconNode.dataset.lucide = icon;
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  button.append(iconNode, labelNode);
  if (window.lucide) window.lucide.createIcons();
}

export function switchMode() {
  appShell.classList.add("scene-mode");
  scenePreviewPane.classList.add("active");
  setIconButtonContent(downloadBtn, "download", t("file.downloadPng"));
  appTitle.textContent = t("app.title");
  appSubtitle.textContent = t("app.subtitle");
  document.title = t("app.docTitle");
  renderScenes();
}

export function closeLayersPanel() {
  sceneLayersPanel.classList.remove("floating", "dockable-panel", "dragging");
  document.body.classList.remove("layers-floating");
  document.body.classList.add("layers-hidden");
  sceneLayersPanel.style.width = "";
  sceneLayersPanel.style.height = "";
  sceneLayersPanel.style.left = "";
  sceneLayersPanel.style.top = "";
}

export function showLayersPanel() {
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

export function showSceneContextMenu(clientX, clientY, scene) {
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

// "Promptlar" menu: ready-to-paste AI prompt templates (see
// scripts/prompt-library.js) for generating RP text in the exact format
// Persona's own text engine understands. Purely a copy-to-clipboard aid -
// doesn't touch scenes/layers.
function renderPromptCategoryOptions() {
  const previousValue = promptCategorySelect.value;
  promptCategorySelect.replaceChildren();

  promptCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label[getLanguage()] || category.label.tr;
    promptCategorySelect.append(option);
  });

  if ([...promptCategorySelect.options].some((option) => option.value === previousValue)) {
    promptCategorySelect.value = previousValue;
  }
  showSelectedPrompt();
}

// Prompt bodies are Turkish-only (see scripts/prompt-library.js) - only
// the category label and surrounding menu chrome are translated.
function getSelectedPromptText() {
  const category = promptCategories.find((entry) => entry.id === promptCategorySelect.value);
  return category?.prompt || "";
}

function showSelectedPrompt() {
  const text = getSelectedPromptText();
  if (!text) return;
  promptDisplay.textContent = text;
  promptDisplay.removeAttribute("data-i18n");
}

async function copySelectedPrompt() {
  const text = getSelectedPromptText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setSceneStatus(t("prompts.copiedStatus"));
  } catch {
    setSceneStatus(t("prompts.copyFailedStatus"));
  }
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

export function isSceneUndoShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
}

export function isSceneRedoShortcut(event) {
  if (!(event.ctrlKey || event.metaKey)) return false;
  const key = event.key.toLowerCase();
  return key === "y" || (event.shiftKey && key === "z");
}

export function isSceneSelectAllShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";
}

export function isSceneCopyShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
}

export function isSceneCutShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x";
}

export function isSceneDuplicateShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d";
}

export function isSceneUploadShortcut(event) {
  return (event.ctrlKey || event.metaKey)
    && event.shiftKey
    && !event.altKey
    && !event.isComposing
    && event.key.toLowerCase() === "u";
}

export function isScenePasteShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
}


export function getSavedLayersWidth() {
  const savedWidth = Number(getClientStoredValue(storageKeys.layersWidth));
  if (!Number.isFinite(savedWidth)) return 380;
  return clampNumber(savedWidth, 320, 640, 380);
}

export function getSavedLayersHeight() {
  const savedHeight = Number(getClientStoredValue(storageKeys.layersHeight));
  if (!Number.isFinite(savedHeight)) return 320;
  return clampNumber(savedHeight, 220, 640, 320);
}

export function getSavedLayersDock() {
  const saved = getClientStoredValue(storageKeys.layersDock);
  // "top" used to be a valid dock, but a wide-short strip at the top is a
  // bad fit for what's fundamentally a vertical card list - it was removed
  // as an option. Any previously-saved "top" falls back to "right".
  return ["left", "bottom", "right"].includes(saved) ? saved : "right";
}

export function applyLayersDock(dock) {
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

export function isNearLayersPanelResizeEdge(event) {
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

export function createPanelResizeHandles() {
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

export function setSceneStatus(message) {
  sceneStatus.textContent = message;
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
  renderPromptCategoryOptions();
});

renderIdeaCategoryOptions();
ideaNewBtn.addEventListener("click", showRandomIdea);

renderPromptCategoryOptions();
promptCategorySelect.addEventListener("change", showSelectedPrompt);
promptCopyBtn.addEventListener("click", copySelectedPrompt);

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
