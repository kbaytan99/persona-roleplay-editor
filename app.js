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

export function renderScenes() {
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

export function reorderScene(sceneId, placement) {
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

export function flashSceneEditorItem(sceneId) {
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
