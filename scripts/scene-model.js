"use strict";

// Scene data model: CRUD, selection, clipboard, undo/redo history, cetvel
// (size-matching), sticky text-layer defaults, RSE project export/import,
// and turning the composite into an output (PNG download/copy, ImgBB
// upload, Discord webhook). Everything here operates on the shared
// `scenes` array/selection state owned by app.js - nothing in here is a
// canvas pointer-interaction or layer-panel-card renderer (see
// scripts/canvas.js and scripts/layer-panel.js for those).

import { clampNumber } from "./utils.js?v=3.19.0";
import { t, getLanguage } from "./i18n.js?v=3.19.0";
import {
  saveState,
  scheduleSceneAutosave,
  recordUploadHistory,
  readUploadHistory,
  createUploadThumbnail,
} from "./storage.js?v=3.19.0";
import {
  isEditableTarget,
  drawSceneLayerImage,
  drawSceneTextBlock,
  getSceneOutputWidth,
  getSceneBackgroundHeight,
  getSceneFontSize,
  getScenePadding,
  getSceneTransitionSize,
  getSceneTransitionStyle,
  getSceneTransitionSides,
} from "./canvas.js?v=3.19.0";
import { renderScenes, flashSceneEditorItem } from "./layer-panel.js?v=3.19.0";
import {
  scenes,
  selectedSceneId,
  selectedSceneIds,
  hoveredSceneId,
  expandedLayerIds,
  lastPointerClientX,
  lastPointerClientY,
  sceneUndoStack,
  sceneRedoStack,
  sceneHistoryLimit,
  sceneImageFilterDefaults,
  sceneCanvasDefaultWidth,
  sceneCanvasDefaultHeight,
  sceneCanvasMaxDimension,
  sceneCanvasMaxPixels,
  sceneCanvasBackground,
  sceneTransitionPx,
  rseProjectMagic,
  rseProjectVersion,
  rseMaxImportBytes,
  sceneOutputWidth,
  sceneBackgroundHeight,
  sceneFontSize,
  scenePadding,
  sceneTransitionSize,
  sceneTransitionStyle,
  sceneTransitionSides,
  sceneImageInput,
  sceneProjectInput,
  downloadBtn,
  copySceneBtn,
  uploadImgbbBtn,
  discordWebhookInput,
  setSelectedSceneIdRaw,
  setSelectedSceneIdsRaw,
  setHoveredSceneIdRaw,
  setSceneStatus,
  switchMode,
  isSceneUndoShortcut,
  isSceneRedoShortcut,
} from "../app.js?v=3.19.0";

// "Sticky" text layer defaults: whatever font size/style/spacing the user
// last set on any text layer becomes the starting point for the next new
// one (button-added or pasted), instead of always resetting to a fixed
// factory default. Persisted so it survives a reload too.
const textLayerDefaultsStorageKey = "personaLastTextLayerStyle";
let lastTextLayerDefaults = loadLastTextLayerDefaults();
export let sceneClipboardScenes = [];
export let sceneClipboardPasteCount = 0;

export function loadLastTextLayerDefaults() {
  try {
    const stored = JSON.parse(localStorage.getItem(textLayerDefaultsStorageKey) || "null");
    if (stored && typeof stored === "object") return stored;
  } catch {
    // Corrupt/foreign localStorage value - fall through to defaults.
  }
  return { fontSize: 18, textStyle: "box", letterSpacing: 0, lineHeight: 1.18 };
}

export function rememberTextLayerDefaults(scene) {
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
export let cetvelEnabled = localStorage.getItem(cetvelStorageKey) === "1";

export function setCetvelEnabled(enabled) {
  cetvelEnabled = enabled;
  localStorage.setItem(cetvelStorageKey, enabled ? "1" : "0");
}

export function findCetvelReferenceScene() {
  const selectedImage = scenes.find((scene) => selectedSceneIds.includes(scene.id) && scene.type !== "text" && scene.dataUrl);
  if (selectedImage) return selectedImage;
  return scenes.find((scene) => scene.type !== "text" && scene.dataUrl) || null;
}

// Reuses the exact width/height math drawSceneLayerImage() uses for PNG
// export, so "does this overflow" is judged against the same geometry the
// user will actually see in the final image, not an approximation.
export function computeCetvelImagePlacement(reference, naturalWidth, naturalHeight) {
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

export async function handleMainDownload() {
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
export async function handleCopyScene() {
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

export async function addSceneImages(files) {
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
  setSelectedSceneIdsRaw(newScenes.map((scene) => scene.id));
  setSelectedSceneIdRaw(selectedSceneIds[0] || "");
  setHoveredSceneIdRaw("");
  newScenes.forEach((scene) => expandedLayerIds.add(scene.id));

  if (wasEmpty) shouldAutoFitSceneViewport = true;
  renderScenes();
  setSceneStatus(t("status.imagesAdded", { count: imageFiles.length }));
  sceneImageInput.value = "";
  switchMode();
}

export function addBlankScene() {
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
  setSelectedSceneIdRaw(scene.id);
  setSelectedSceneIdsRaw([scene.id]);
  setHoveredSceneIdRaw("");
  expandedLayerIds.add(scene.id);
  shouldAutoFitSceneViewport = true;
  renderScenes();
  switchMode();
  setSceneStatus(t("status.blankSceneAdded"));
}

export function addSceneImageBlobs(blobs) {
  const files = blobs.map((blob, index) => new File([blob], `pasted-scene-${Date.now()}-${index + 1}.png`, { type: blob.type || "image/png" }));
  return addSceneImages(files);
}

export function handlePaste(event) {
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

export function removeScene(id) {
  const index = scenes.findIndex((scene) => scene.id === id);
  if (index === -1) return;
  if (scenes[index].isLocked) {
    setSceneStatus(t("status.lockedCannotDelete"));
    return;
  }
  if (!confirm(t("confirm.deleteScene", { n: index + 1 }))) return;
  pushSceneHistory();
  scenes.splice(index, 1);
  setHoveredSceneIdRaw("");
  setSelectedSceneIdRaw(scenes[Math.min(index, scenes.length - 1)]?.id || "");
  setSelectedSceneIdsRaw(selectedSceneId ? [selectedSceneId] : []);
  renderScenes();
  setSceneStatus(t("status.sceneDeleted"));
}

export function removeScenes(ids) {
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
  setHoveredSceneIdRaw("");
  setSelectedSceneIdRaw(scenes[Math.min(Math.max(firstIndex, 0), scenes.length - 1)]?.id || "");
  setSelectedSceneIdsRaw(selectedSceneId ? [selectedSceneId] : []);
  renderScenes();
  setSceneStatus(lockedCount
    ? t("status.scenesDeletedWithLocked", { count: targetIds.length, lockedCount })
    : t("status.scenesDeletedPlain", { count: targetIds.length }));
}

export function copySelectedScenes() {
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

export function cutSelectedScenes() {
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
  setHoveredSceneIdRaw("");
  setSelectedSceneIdRaw(scenes[Math.min(Math.max(firstIndex, 0), scenes.length - 1)]?.id || "");
  setSelectedSceneIdsRaw(selectedSceneId ? [selectedSceneId] : []);
  renderScenes();
  setSceneStatus(lockedCount
    ? t("status.scenesCutWithLocked", { count: targetIds.length, lockedCount })
    : t("status.scenesCutPlain", { count: targetIds.length }));
}

export function pasteSceneClipboard() {
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
  setSelectedSceneIdsRaw(clones.map((scene) => scene.id));
  setSelectedSceneIdRaw(selectedSceneIds[0] || "");
  setHoveredSceneIdRaw("");
  clones.forEach((clone) => expandedLayerIds.add(clone.id));
  renderScenes();
  switchMode();
  setSceneStatus(t("status.scenesPasted", { count: clones.length }));
  clones.forEach((clone) => flashSceneEditorItem(clone.id));
}

export function duplicateSelectedScenes() {
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
  setSelectedSceneIdsRaw(clones.map((scene) => scene.id));
  setSelectedSceneIdRaw(selectedSceneIds[0] || "");
  setHoveredSceneIdRaw("");
  clones.forEach((clone) => expandedLayerIds.add(clone.id));
  renderScenes();
  setSceneStatus(t("status.layersDuplicated", { count: clones.length }));
  clones.forEach((clone) => flashSceneEditorItem(clone.id));
}

export function cloneSceneSnapshot(scene) {
  return JSON.parse(JSON.stringify(scene));
}

export function cloneSceneForPaste(scene, offsetPercent = 0) {
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

export function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// Shown once, only on a visitor's very first-ever load (see loadLocalScenes)
// so the app isn't a blank canvas the first time someone opens it. The
// background is a generated, generic night-street silhouette - not a real
// screenshot or any specific game/show's artwork, to keep this free of
// copyright concerns in a public, permanently-deployed repo.
export function createExampleBackgroundDataUrl() {
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

export function createExampleScenes() {
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

export function clearScenes() {
  if (!scenes.length) return;
  const lockedCount = scenes.filter((scene) => scene.isLocked).length;
  if (lockedCount === scenes.length) {
    setSceneStatus(t("status.lockedLayersCannotDelete"));
    return;
  }
  if (!confirm(t("confirm.clearAll"))) return;
  pushSceneHistory();
  scenes.splice(0, scenes.length, ...scenes.filter((scene) => scene.isLocked));
  setSelectedSceneIdRaw("");
  setSelectedSceneIdsRaw([]);
  setHoveredSceneIdRaw("");
  renderScenes();
  setSceneStatus(lockedCount
    ? t("status.allScenesDeletedWithLocked", { lockedCount })
    : t("status.allScenesDeletedPlain"));
}

export function exportSceneProject() {
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

export function createSceneProjectPayload() {
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

export function createSceneProjectFileName(payload) {
  const firstSceneName = payload.scenes.find((scene) => scene?.name)?.name || "sahne-projesi";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return `${safeFilePart(firstSceneName)}-${stamp}.rse`;
}

export async function importSceneProject(event) {
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

export function normalizeSceneProjectPayload(payload) {
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
export function deduplicateImportedSceneIds(scenes) {
  const seenIds = new Set();
  for (const scene of scenes) {
    if (seenIds.has(scene.id)) scene.id = createId();
    seenIds.add(scene.id);
  }
}

export function normalizeImportedScene(scene, index) {
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

export function applySceneProjectPayload(project) {
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
  setSelectedSceneIdRaw(typeof project.selection.selectedSceneId === "string" ? project.selection.selectedSceneId : scenes[0]?.id || "");
  setSelectedSceneIdsRaw(Array.isArray(project.selection.selectedSceneIds) ? project.selection.selectedSceneIds : selectedSceneId ? [selectedSceneId] : []);
  setHoveredSceneIdRaw("");
  shouldAutoFitSceneViewport = true;
  ensureSceneModel();
  normalizeSceneSelection();
}

export function normalizeSceneSelection() {
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  setSelectedSceneIdsRaw(selectedSceneIds.filter((id) => sceneIds.has(id)));
  if (selectedSceneId && !sceneIds.has(selectedSceneId)) setSelectedSceneIdRaw("");
  if (!selectedSceneIds.length && selectedSceneId) setSelectedSceneIdsRaw([selectedSceneId]);
  if (selectedSceneIds.length && !selectedSceneId) setSelectedSceneIdRaw(selectedSceneIds[0]);
  if (hoveredSceneId && !sceneIds.has(hoveredSceneId)) setHoveredSceneIdRaw("");
}

export function setSelectedScene(id) {
  if (!scenes.some((scene) => scene.id === id)) return;
  setSelectedSceneIdRaw(id);
  setSelectedSceneIdsRaw([id]);
  refreshSceneSelection();
}

// Ctrl/Cmd+click: toggle a single layer in/out of the current selection,
// same as file-explorer / Photoshop layer panel conventions.
export function toggleSceneSelection(id) {
  if (!scenes.some((scene) => scene.id === id)) return;
  if (selectedSceneIds.includes(id)) {
    setSelectedSceneIdsRaw(selectedSceneIds.filter((sceneId) => sceneId !== id));
    if (selectedSceneId === id) setSelectedSceneIdRaw(selectedSceneIds[selectedSceneIds.length - 1] || "");
  } else {
    setSelectedSceneIdsRaw([...selectedSceneIds, id]);
    setSelectedSceneIdRaw(id);
  }
  refreshSceneSelection();
}

// Shift+click: select the contiguous range between the current anchor
// (selectedSceneId) and the clicked layer, re-anchored from the same
// origin on repeated shift-clicks until a plain click resets it.
export function selectSceneRange(id) {
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
  setSelectedSceneIdsRaw(scenes.slice(start, end + 1).map((scene) => scene.id));
  setSelectedSceneIdRaw(anchorId);
  refreshSceneSelection();
}

export function clearSceneSelection() {
  setSelectedSceneIdRaw("");
  setSelectedSceneIdsRaw([]);
  refreshSceneSelection();
}

export function selectAllScenes() {
  setSelectedSceneIdsRaw(scenes.map((scene) => scene.id));
  setSelectedSceneIdRaw(selectedSceneIds[0] || "");
  setHoveredSceneIdRaw("");
  refreshSceneSelection();
  setSceneStatus(t("status.scenesSelected", { count: selectedSceneIds.length }));
}

export function isSceneSelected(id) {
  return selectedSceneIds.includes(id) || selectedSceneId === id;
}

export function getSelectedSceneIds() {
  normalizeSceneSelection();
  return selectedSceneIds.length ? [...selectedSceneIds] : selectedSceneId ? [selectedSceneId] : [];
}

export function getSceneDeleteTargets() {
  const selectedIds = getSelectedSceneIds();
  if (selectedIds.length > 1 && (!hoveredSceneId || selectedIds.includes(hoveredSceneId))) return selectedIds;
  return hoveredSceneId ? [hoveredSceneId] : selectedIds;
}

export function getSceneClipboardTargets() {
  const selectedIds = getSelectedSceneIds();
  return selectedIds.length ? selectedIds : hoveredSceneId ? [hoveredSceneId] : [];
}

export function refreshSceneSelection() {
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

export function prepareSceneHistoryControl(control) {
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

export function pushSceneHistory() {
  const entry = createSceneHistoryEntry();
  if (historyEntriesEqual(sceneUndoStack.at(-1), entry)) return;
  sceneUndoStack.push(entry);
  if (sceneUndoStack.length > sceneHistoryLimit) sceneUndoStack.shift();
  sceneRedoStack.length = 0;
}

export function undoSceneHistory() {
  if (!sceneUndoStack.length) {
    setSceneStatus(t("status.noUndoAction"));
    return;
  }

  sceneRedoStack.push(createSceneHistoryEntry());
  if (sceneRedoStack.length > sceneHistoryLimit) sceneRedoStack.shift();
  restoreSceneHistoryEntry(sceneUndoStack.pop(), "Geri alindi.");
}

export function redoSceneHistory() {
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
export function cloneSceneForHistory(scene) {
  return { ...scene };
}

export function scenesEqualForHistory(a, b) {
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

export function idArraysEqualForHistory(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function historyEntriesEqual(a, b) {
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

export function createSceneHistoryEntry() {
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

export function restoreSceneHistoryEntry(entry, message) {
  // Clone on the way back in too - entry.scenes must stay untouched by
  // subsequent live edits, since undo/redo can restore the SAME entry
  // object again later (e.g. redo after undo).
  scenes.splice(0, scenes.length, ...(entry.scenes || []).map(cloneSceneForHistory));
  if (entry.sceneOutputWidth) sceneOutputWidth.value = entry.sceneOutputWidth;
  if (entry.sceneBackgroundHeight) sceneBackgroundHeight.value = entry.sceneBackgroundHeight;
  if (entry.sceneTransitionSize) sceneTransitionSize.value = entry.sceneTransitionSize;
  if (entry.sceneTransitionStyle) sceneTransitionStyle.value = entry.sceneTransitionStyle;
  if (entry.sceneTransitionSides) sceneTransitionSides.value = entry.sceneTransitionSides;
  setSelectedSceneIdRaw(entry.selectedSceneId || scenes[0]?.id || "");
  setSelectedSceneIdsRaw(Array.isArray(entry.selectedSceneIds) ? [...entry.selectedSceneIds] : selectedSceneId ? [selectedSceneId] : []);
  setHoveredSceneIdRaw("");
  normalizeSceneSelection();
  saveState();
  renderScenes();
  setSceneStatus(message);
}

export function createSceneBlock(text = "") {
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

export function ensureSceneModel() {
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

export function getTextLayerSpawnPosition(width) {
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

export function addTextLayer(initialText = "") {
  pushSceneHistory();
  const layer = createSceneBlock(initialText);
  layer.type = "text";
  layer.isLocked = false;
  layer.name = t("layer.defaultTextLayerName", { n: scenes.length + 1 });
  Object.assign(layer, getTextLayerSpawnPosition(layer.width));
  scenes.unshift(layer);
  setSelectedSceneIdRaw(layer.id);
  setSelectedSceneIdsRaw([layer.id]);
  setHoveredSceneIdRaw("");
  expandedLayerIds.add(layer.id);
  renderScenes();
  switchMode();
  setSceneStatus(t("status.textLayerAdded"));
}
export function clampCanvasPixelBudget(width, height) {
  const area = width * height;
  if (area <= sceneCanvasMaxPixels) return { width, height, scaled: false };
  const factor = Math.sqrt(sceneCanvasMaxPixels / area);
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
    scaled: true,
  };
}

export async function buildCompositeCanvas() {
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

export async function downloadCompositeScene() {
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

export function showImgbbFallbackToast(bbcode) {
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

export async function showUploadHistoryPanel() {
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

export function promiseWithTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function canvasToPngBlob(canvas) {
  const encodePromise = new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG olusturulamadi."));
    }, "image/png");
  });
  return promiseWithTimeout(encodePromise, pngEncodeTimeoutMs, "PNG olusturma zaman asimina ugradi.");
}

export function normalizeImgbbResultUrl(value) {
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

export async function uploadCompositeSceneToImgbb() {
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

export function isValidDiscordWebhookUrl(url) {
  return /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+/i.test(url);
}

// No separate "share to Discord" action anymore - if a webhook is
// configured, every successful ImgBB upload also drops the link + BBCode
// into that channel as a plain text message (no PNG re-upload needed;
// Discord auto-embeds a preview from the raw image URL). Returns a
// {ok, error} result instead of touching setSceneStatus itself, so the
// caller can fold it into the main upload's own status message.
export async function sendDiscordLinkMessage(url, bbcode) {
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

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function loadImage(src) {
  const loadPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  return promiseWithTimeout(loadPromise, imageLoadTimeoutMs, "Gorsel yukleme zaman asimina ugradi.");
}

export function safeFilePart(value) {
  return value.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "scene";
}

