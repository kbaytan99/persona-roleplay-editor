"use strict";

// Cache-buster query strings below (and on index.html's <link>/<script>
// tags) must match appVersion on every release - see index.html for why.
import { clampNumber } from "./scripts/utils.js?v=3.19.0";
import { t, getLanguage, setLanguage, onLanguageChange, translateStaticDom } from "./scripts/i18n.js?v=3.19.0";
import {
  saveState,
  restoreState,
  saveLocalScenesNow,
  loadLocalScenes,
} from "./scripts/storage.js?v=3.19.0";
import {
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
  exportSceneProject,
  handleCopyScene,
  handleMainDownload,
  handlePaste,
  importSceneProject,
  pasteSceneClipboard,
  prepareSceneHistoryControl,
  redoSceneHistory,
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
  applyGlobalSceneFontSize,
  applyGlobalTransitionToAllScenes,
  drawSceneTextBlock,
  getSceneBackgroundHeight,
  getSceneOutputWidth,
  handleSceneKeyDown,
  handleSceneKeyUp,
  handleSceneWheel,
  refreshSceneStyles,
  startSceneViewportPan,
} from "./scripts/canvas.js?v=3.19.0";
import { renderScenes } from "./scripts/layer-panel.js?v=3.19.0";
import {
  hideShortcuts,
  showShortcuts,
  startLayersPanelResize,
  renderIdeaCategoryOptions,
  showRandomIdea,
  renderPromptCategoryOptions,
  showSelectedPrompt,
  copySelectedPrompt,
  initMenuBar,
  renderAboutPanel,
  showPreviousChangelogPage,
  showNextChangelogPage,
  getCurrentLayersDock,
  getSavedLayersWidth,
  getSavedLayersHeight,
  applyLayersDock,
  switchMode,
} from "./scripts/menu-ui.js?v=3.19.0";

export const appVersion = "3.19.0";

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
export function setShouldAutoFitSceneViewport(value) {
  shouldAutoFitSceneViewport = value;
}
// Last pointer position over the composite stage, so a new text layer can
// spawn where the mouse actually is instead of a fixed spot. Tracked with a
// plain document-level pointermove (cheap - just two numbers) rather than
// only inside the stage, since the pointer needs to be checked against
// whichever stage element exists at layer-creation time anyway.
export let lastPointerClientX = null;
export let lastPointerClientY = null;

restoreState();

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
  showPreviousChangelogPage();
});
document.querySelector("#aboutChangelogNext").addEventListener("click", (event) => {
  event.stopPropagation();
  showNextChangelogPage();
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
