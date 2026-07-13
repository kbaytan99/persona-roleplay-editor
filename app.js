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
export let sceneViewportZoom = 1;
export let isSpacePanning = false;
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

export function isEditableTarget(target) {
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
  const isGroupMember = selectedSceneIds.includes(scene.id) && selectedSceneIds.length > 1;
  if (!isGroupMember) setSelectedScene(scene.id);
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

  // Other selected image layers scale by the same relative factor as the
  // one being dragged, each around its own current position - not
  // repositioned to match the dragged handle's anchor edge, just resized.
  const groupIds = getGroupDragSceneIds(scene.id).filter((id) => {
    if (id === scene.id) return false;
    const other = scenes.find((s) => s.id === id);
    return other && other.type !== "text" && other.dataUrl;
  });
  const groupStart = new Map(groupIds.map((id) => {
    const other = scenes.find((s) => s.id === id);
    return [id, { zoom: other.imageZoom || 100, scaleX: other.imageScaleX || 100, scaleY: other.imageScaleY || 100 }];
  }));

  const applyGroupScale = (factorZoom, factorScaleX, factorScaleY) => {
    groupIds.forEach((id) => {
      const other = scenes.find((s) => s.id === id);
      const start = groupStart.get(id);
      if (!other || !start) return;
      if (factorZoom !== null) other.imageZoom = roundScaleValue(start.zoom * factorZoom);
      if (factorScaleX !== null) other.imageScaleX = roundScaleValue(start.scaleX * factorScaleX);
      if (factorScaleY !== null) other.imageScaleY = roundScaleValue(start.scaleY * factorScaleY);
      updateSceneImageTransform(other);
    });
  };

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
      const factor = distance / startDistance;
      scene.imageZoom = roundScaleValue(startZoom * factor);
      applyGroupScale(factor, null, null);
    } else if (isHorizontal) {
      const distance = Math.max(1, Math.abs(moveEvent.clientX - centerX));
      const factor = distance / startHorizontalDistance;
      scene.imageScaleX = roundScaleValue(startScaleX * factor);
      keepOppositeSideAnchored();
      applyGroupScale(null, factor, null);
    } else if (isVertical) {
      const distance = Math.max(1, Math.abs(moveEvent.clientY - centerY));
      const factor = distance / startVerticalDistance;
      scene.imageScaleY = roundScaleValue(startScaleY * factor);
      keepOppositeSideAnchored();
      applyGroupScale(null, null, factor);
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
export function drawSceneLayerImage(context, image, scene, width, height) {
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

export function drawSceneTextBlock(context, text, textBlock, width, height) {
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

export function getSceneFontSize() {
  return clampNumber(sceneFontSize.value, 10, 42, 18);
}

export function getSceneOutputWidth() {
  const val = parseInt(sceneOutputWidth.value, 10);
  if (isNaN(val)) return sceneCanvasDefaultWidth;
  return Math.max(640, Math.min(sceneCanvasMaxDimension, val));
}

function getScenePreviewWidth() {
  return getSceneOutputWidth();
}

export function getSceneBackgroundHeight() {
  const val = parseInt(sceneBackgroundHeight.value, 10);
  if (isNaN(val)) return sceneCanvasDefaultHeight;
  return Math.max(300, Math.min(sceneCanvasMaxDimension, val));
}

export function getSceneTransitionSize() {
  if (getSceneTransitionStyle() === "none") return 0;
  const parsed = clampNumber(sceneTransitionSize.value, 0, 600, sceneTransitionPx);
  sceneTransitionSize.value = parsed;
  return parsed;
}

export function getSceneTransitionStyle() {
  const value = sceneTransitionStyle.value;
  return ["soft", "cinematic", "blur", "none"].includes(value) ? value : "soft";
}

export function getSceneTransitionSides() {
  const value = sceneTransitionSides.value;
  return ["both", "top", "bottom"].includes(value) ? value : "both";
}

function getScenePreviewHeight() {
  return getSceneBackgroundHeight();
}

export function getScenePadding() {
  return clampNumber(scenePadding.value, 4, 80, 18);
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
