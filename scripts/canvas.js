"use strict";

// Canvas: pointer-driven interactions (pan/zoom, marquee select, drag/
// resize/scale handles, smart alignment guides), the composite renderer
// (drawSceneLayerImage/drawSceneTextBlock/getOptions), and the scene
// output-dimension getters (Ayarlar panel values, clamped). Nothing in
// here builds layer-panel card DOM (see scripts/layer-panel.js) or menu
// chrome (see scripts/menu-ui.js).

import { clampNumber } from "./utils.js?v=3.20.2";
import { parseLines, appendSegments, wrapLine, drawSegmentedText } from "./rp-text.js?v=3.20.2";
import { textFontFamily } from "./text-fonts.js?v=3.20.2";
import { t, getLanguage } from "./i18n.js?v=3.20.2";
import { saveState, scheduleSceneAutosave } from "./storage.js?v=3.20.2";
import {
  clearSceneSelection,
  refreshSceneSelection,
  isSceneSelected,
  setSelectedScene,
  selectAllScenes,
  copySelectedScenes,
  cutSelectedScenes,
  duplicateSelectedScenes,
  pasteSceneClipboard,
  removeScene,
  removeScenes,
  getSceneDeleteTargets,
  pushSceneHistory,
  undoSceneHistory,
  redoSceneHistory,
  uploadCompositeSceneToImgbb,
  sceneClipboardScenes,
  addSceneImages,
  loadImage,
  applySceneModifierSelection,
  keepOnlySelectedArea,
} from "./scene-model.js?v=3.20.2";
import { renderScenes, reorderScene } from "./layer-panel.js?v=3.20.2";
import {
  closeLayersPanel,
  showLayersPanel,
  isSceneUndoShortcut,
  isSceneRedoShortcut,
  isSceneSelectAllShortcut,
  isSceneCopyShortcut,
  isSceneCutShortcut,
  isSceneDuplicateShortcut,
  isSceneUploadShortcut,
  isScenePasteShortcut,
} from "./menu-ui.js?v=3.20.2";
import {
  scenes,
  selectedSceneId,
  selectedSceneIds,
  hoveredSceneId,
  sceneOutputWidth,
  sceneBackgroundHeight,
  sceneFontSize,
  scenePadding,
  sceneTransitionSize,
  sceneTransitionStyle,
  sceneTransitionSides,
  sceneImageFilterDefaults,
  sceneCanvasDefaultWidth,
  sceneCanvasDefaultHeight,
  sceneCanvasMaxDimension,
  sceneSnapThresholdPx,
  sceneTransitionPx,
  setSelectedSceneIdRaw,
  setSelectedSceneIdsRaw,
  setHoveredSceneIdRaw,
  setSceneStatus,
} from "../app.js?v=3.20.2";

export let sceneViewportZoom = 1;
export let isSpacePanning = false;

export function getOptions() {
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

export function startSceneMarqueeSelect(event, stage) {
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

    setHoveredSceneIdRaw("");
    setSelectedSceneIdsRaw(hitIds);
    setSelectedSceneIdRaw(hitIds[0] || "");
    refreshSceneSelection();
    if (hitIds.length) setSceneStatus(t("status.layersSelected", { count: hitIds.length }));
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}
export function handleSceneWheel(event) {
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

export function setSceneViewportZoom(nextZoom, focalClientX, focalClientY) {
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

export function applySceneViewportZoom() {
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

export function fitSceneToViewport() {
  const viewport = document.querySelector(".scene-canvas-viewport");
  const stage = document.querySelector(".composite-stage");
  if (!viewport || !stage) return;

  const horizontalFit = (viewport.clientWidth - 96) / Math.max(1, stage.offsetWidth);
  const verticalFit = (viewport.clientHeight - 96) / Math.max(1, stage.offsetHeight);
  setSceneViewportZoom(Math.min(horizontalFit, verticalFit), undefined, undefined);
  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
}

export function getSmartGuideLayer(stage) {
  let layer = stage.querySelector(".scene-smart-guides");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "scene-smart-guides";
    stage.append(layer);
  }
  return layer;
}

export function clearSmartGuides(stage = document.querySelector(".composite-stage")) {
  stage?.querySelector(".scene-smart-guides")?.replaceChildren();
}

export function drawSmartGuides(stage, guides) {
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
export function getOtherLayerSnapTargets(stage, excludeSceneId) {
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

export function snapStageBox(stage, box, { allowX = true, allowY = true, disabled = false, excludeSceneId } = {}) {
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

export function findSnapMatches(points, targets) {
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

export function getImageVisualBox(stageRect, scene, visualWidth, visualHeight) {
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

export function handleSceneKeyDown(event) {
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

  // Ctrl+B: keep the crop area and clear everything outside it (not a text box).
  if (!isTextEntryTarget(event.target) && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey
    && event.key.toLowerCase() === "b") {
    event.preventDefault();
    keepOnlySelectedArea();
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

  // Delete inside a text box edits that text; only outside one does it remove layers.
  if ((event.key === "Delete" || event.code === "Delete") && !isTextEntryTarget(event.target)) {
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

export function handleSceneKeyUp(event) {
  if (event.code !== "Space") return;
  isSpacePanning = false;
  document.body.classList.remove("space-pan-ready");
}

export function startSceneViewportPan(event) {
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

export function isTextEntryTarget(target) {
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
export function hasActiveTextSelection(target) {
  const field = target?.closest?.("input, textarea");
  if (field && typeof field.selectionStart === "number" && typeof field.selectionEnd === "number") {
    return field.selectionStart !== field.selectionEnd;
  }
  const selection = window.getSelection?.();
  return !!selection && selection.toString().length > 0;
}

export function refreshSceneStyles() {
  document.querySelectorAll(".composite-stage").forEach((stage) => {
    stage.style.setProperty("--scene-padding", `${getScenePadding()}px`);
  });
  document.querySelectorAll(".scene-text-block").forEach((block) => {
    const layer = scenes.find((scene) => scene.id === block.dataset.sceneId);
    block.style.fontSize = `${layer?.fontSize || getSceneFontSize()}px`;
  });
}

export function applyGlobalSceneFontSize() {
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

export function renderSceneTextBlock(container, text) {
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
export function startInlineSceneTextEdit(scene, block, content) {
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

export function createSceneImageTransformBox(scene) {
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

export function createStageResizeFrame() {
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

export function getSceneImageTransform(scene) {
  const zoom = (scene.imageZoom || 100) / 100;
  const scaleX = (scene.imageScaleX || 100) / 100;
  const scaleY = (scene.imageScaleY || 100) / 100;
  return `scale(${zoom * scaleX}, ${zoom * scaleY})`;
}

export function getSceneLayerZIndex(index, offset = 0) {
  return (scenes.length - index) * 10 + offset;
}

export function applySceneLayerPosition(wrap, scene) {
  wrap.style.left = `${scene.imageX || 0}%`;
  wrap.style.top = `${scene.imageY || 0}%`;
}

// Text and image layers keep position in different fields (x/y vs
// imageX/imageY) but both are percent-of-stage-dimension, so a single
// delta computed from the dragged layer can be applied uniformly across
// a mixed text+image multi-selection during a group drag.
export function getScenePosition(scene) {
  return scene.type === "text"
    ? { x: scene.x ?? 0, y: scene.y ?? 0 }
    : { x: scene.imageX || 0, y: scene.imageY || 0 };
}

export function setScenePosition(scene, x, y) {
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
export function getGroupDragSceneIds(primarySceneId) {
  if (!selectedSceneIds.includes(primarySceneId) || selectedSceneIds.length <= 1) return [primarySceneId];
  return selectedSceneIds.filter((id) => {
    const scene = scenes.find((sc) => sc.id === id);
    return scene && !scene.isLocked;
  });
}

export function applyGroupDragDelta(groupIds, groupInitial, deltaX, deltaY) {
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

export function getSceneImageFilter(scene) {
  const brightness = clampNumber(scene.filterBrightness, 70, 145, sceneImageFilterDefaults.brightness);
  const contrast = clampNumber(scene.filterContrast, 70, 150, sceneImageFilterDefaults.contrast);
  const saturate = clampNumber(scene.filterSaturate, 60, 180, sceneImageFilterDefaults.saturate);
  const sepia = clampNumber(scene.filterSepia, 0, 18, sceneImageFilterDefaults.sepia);
  const blur = clampNumber(scene.filterBlur, 0, 8, sceneImageFilterDefaults.blur);
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) blur(${blur}px)`;
}

// "Arka plan sil" is a luma key: pixels darker than `low` become transparent,
// and the `band` above it fades in so anti-aliased text edges don't get a
// hard cut. The live preview (SVG filter below) and the export
// (getSceneKeyedSource) both read these numbers, so the stage and the PNG
// key exactly the same pixels.
export function getSceneBgKeyRange(threshold) {
  return { low: (threshold / 100) * 0.6, band: 0.08 };
}

export function getSceneImagePreviewFilter(scene) {
  const threshold = clampNumber(scene.bgRemove, 0, 100, sceneImageFilterDefaults.bgRemove);
  const colorFilter = getSceneImageFilter(scene);
  if (!threshold) return colorFilter;
  return `url(#${ensureSceneBgKeyFilter(threshold)}) ${colorFilter}`;
}

// The preview is a DOM <img>, so the key has to be an SVG filter there: a
// luma-based mask multiplied into the source alpha. One <filter> per
// threshold value (at most 100), created on first use, so the slider never
// has to track or clean up per-layer filter nodes.
function ensureSceneBgKeyFilter(threshold) {
  const id = `scene-bgkey-${threshold}`;
  if (document.getElementById(id)) return id;
  const svgNs = "http://www.w3.org/2000/svg";
  let defs = document.getElementById("sceneBgKeyDefs");
  if (!defs) {
    defs = document.createElementNS(svgNs, "svg");
    defs.id = "sceneBgKeyDefs";
    defs.setAttribute("aria-hidden", "true");
    // Positioned off to the side rather than display:none - Chromium won't
    // resolve url() filters that live inside a display:none SVG.
    defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
    document.body.append(defs);
  }
  const { low, band } = getSceneBgKeyRange(threshold);
  const k = 1 / band;
  const filter = document.createElementNS(svgNs, "filter");
  filter.id = id;
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const mask = document.createElementNS(svgNs, "feColorMatrix");
  mask.setAttribute("in", "SourceGraphic");
  mask.setAttribute("type", "matrix");
  mask.setAttribute("values", `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${0.2126 * k} ${0.7152 * k} ${0.0722 * k} 0 ${-low * k}`);
  mask.setAttribute("result", "lumaMask");
  const composite = document.createElementNS(svgNs, "feComposite");
  composite.setAttribute("in", "SourceGraphic");
  composite.setAttribute("in2", "lumaMask");
  composite.setAttribute("operator", "in");
  filter.append(mask, composite);
  defs.append(filter);
  return id;
}

// Drag-and-drop of image files from the OS. Dropping over the stage centers the
// new layers on the cursor (same stage-percent basis as the text layer spawn);
// dropping anywhere else adds them at the default position, like "Resim ekle".
function getStagePercentAt(clientX, clientY) {
  const stage = document.querySelector(".composite-stage");
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  const withinStage = clientX >= rect.left && clientX <= rect.right
    && clientY >= rect.top && clientY <= rect.bottom;
  if (!withinStage || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

function isFileDrag(event) {
  return [...(event.dataTransfer?.types || [])].includes("Files");
}

export function handleSceneFileDragOver(event) {
  if (!isFileDrag(event)) return;
  // Without preventDefault() the browser won't accept the drop and instead
  // navigates to the file - so this is also what keeps a stray drop from
  // replacing the editor with the image.
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  document.querySelector(".composite-stage")
    ?.classList.toggle("file-drag-over", Boolean(getStagePercentAt(event.clientX, event.clientY)));
}

export function handleSceneFileDragLeave(event) {
  if (!isFileDrag(event)) return;
  document.querySelector(".composite-stage")
    ?.classList.toggle("file-drag-over", Boolean(getStagePercentAt(event.clientX, event.clientY)));
}

export function handleSceneFileDrop(event) {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  document.querySelector(".composite-stage")?.classList.remove("file-drag-over");
  addSceneImages(event.dataTransfer.files, getStagePercentAt(event.clientX, event.clientY));
}

// ---- Silgi (per-layer eraser) ----
// scene.eraseMask is a PNG the size of the source image: opaque = visible,
// transparent = erased. The preview applies it as a CSS mask
// (applySceneEraseMask) and the export multiplies it into the layer's alpha
// (getSceneKeyedSource). While a layer is in erase mode its <img> is hidden
// and a live canvas (createSceneEraseCanvas) shows image x mask, so strokes
// appear while dragging; the mask is encoded once per stroke, on release.
let eraseModeSceneId = "";
let eraseBrushPercent = 3;
// "erase" removes everything under the brush; "bgErase" only removes pixels
// close to the color under the stroke's start point (background eraser).
let eraseBrushMode = "erase";
let bgEraserTolerance = 25;
let eraseMaskCache = { sceneId: "", source: "", base: null, canvas: null };
let eraseStroke = null;

export function isSceneEraseMode(scene) {
  return eraseModeSceneId === scene.id;
}

export function getEraseBrushPercent() {
  return eraseBrushPercent;
}

export function setEraseBrushPercent(value) {
  eraseBrushPercent = clampNumber(value, 0.5, 20, eraseBrushPercent);
}

async function loadEraseMaskCache(scene) {
  const source = scene.eraseMask || "";
  // The live canvas shows the outlined pixels too, so an outline change must reload it.
  const baseSource = await getSceneOutlinedSource(scene);
  if (
    eraseMaskCache.canvas && eraseMaskCache.sceneId === scene.id
    && eraseMaskCache.source === source && eraseMaskCache.baseSource === baseSource
  ) {
    return eraseMaskCache;
  }
  const base = await loadImage(baseSource);
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth;
  canvas.height = base.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (source) {
    ctx.drawImage(await loadImage(source), 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Pixels of the base, used by the background eraser to match colors.
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = canvas.width;
  baseCanvas.height = canvas.height;
  const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
  baseCtx.drawImage(base, 0, 0, canvas.width, canvas.height);
  const baseData = baseCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  eraseMaskCache = { sceneId: scene.id, source, baseSource, base, canvas, baseData };
  return eraseMaskCache;
}

function drawSceneEraseDisplay(display, cache) {
  const mask = cache.canvas;
  if (display.width !== mask.width) display.width = mask.width;
  if (display.height !== mask.height) display.height = mask.height;
  const ctx = display.getContext("2d");
  ctx.clearRect(0, 0, display.width, display.height);
  ctx.drawImage(cache.base, 0, 0, display.width, display.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

function getEraseLocalPoint(clientX, clientY, display) {
  const rect = display.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * display.width,
    y: ((clientY - rect.top) / rect.height) * display.height,
  };
}

function paintEraseSegment(stroke, from, to) {
  if (stroke.mode === "bgErase") {
    paintBgEraseSegment(stroke, from, to);
    return;
  }
  const ctx = stroke.cache.canvas.getContext("2d");
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineWidth = stroke.radius * 2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(to.x, to.y, stroke.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function setEraseBrushMode(mode) {
  eraseBrushMode = mode === "bgErase" ? "bgErase" : "erase";
}

export function getEraseBrushMode() {
  return eraseBrushMode;
}

export function setBgEraserTolerance(value) {
  bgEraserTolerance = clampNumber(value, 0, 100, bgEraserTolerance);
}

export function getBgEraserTolerance() {
  return bgEraserTolerance;
}

// Average of a 5x5 patch of the base image, so one noisy pixel doesn't set the color.
function sampleEraseBaseColor(cache, point) {
  const { baseData, canvas } = cache;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = Math.round(point.x) + dx;
      const y = Math.round(point.y) + dy;
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
      const i = (y * canvas.width + x) * 4;
      r += baseData[i];
      g += baseData[i + 1];
      b += baseData[i + 2];
      count++;
    }
  }
  return count ? [r / count, g / count, b / count] : [0, 0, 0];
}

// Background eraser stroke: inside the brush, pixels whose color is close to the
// sampled color are erased from the mask; everything else stays.
function paintBgEraseSegment(stroke, from, to) {
  const { canvas, baseData } = stroke.cache;
  const width = canvas.width;
  const radius = stroke.radius;
  const minX = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
  const minY = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(from.x, to.x) + radius));
  const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(from.y, to.y) + radius));
  if (maxX < minX || maxY < minY) return;
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const area = ctx.getImageData(minX, minY, boxWidth, boxHeight);
  const data = area.data;
  const [sr, sg, sb] = stroke.sample;
  const limit = (bgEraserTolerance / 100) * 0.4 * 255 * Math.sqrt(3);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  for (let by = 0; by < boxHeight; by++) {
    for (let bx = 0; bx < boxWidth; bx++) {
      const x = minX + bx;
      const y = minY + by;
      const along = lengthSquared ? clampNumber(((x - from.x) * dx + (y - from.y) * dy) / lengthSquared, 0, 1, 0) : 0;
      const nearX = from.x + dx * along - x;
      const nearY = from.y + dy * along - y;
      if (nearX * nearX + nearY * nearY > radius * radius) continue;
      const i = (y * width + x) * 4;
      const dr = baseData[i] - sr;
      const dg = baseData[i + 1] - sg;
      const db = baseData[i + 2] - sb;
      if (Math.sqrt(dr * dr + dg * dg + db * db) > limit) continue;
      data[(by * boxWidth + bx) * 4 + 3] = 0;
    }
  }
  ctx.putImageData(area, minX, minY);
}

// Erase mode on or off, without the toggle's flip, so the tool bar can drive it.
export function setSceneEraseMode(scene, on) {
  if (on) {
    if (eraseModeSceneId === scene.id) return;
    eraseModeSceneId = scene.id;
    document.addEventListener("keydown", handleEraseModeKeyDown);
    renderScenes();
    return;
  }
  if (eraseModeSceneId === scene.id) exitSceneEraseMode();
}

function startEraseStroke(event, scene, display) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    display.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic events have no active pointer to capture; real ones always do.
  }
  // One undo step per stroke: the snapshot is taken before the mask changes.
  pushSceneHistory();
  const stroke = {
    scene, display, pointerId: event.pointerId, cache: null, radius: 0, last: null, ended: false,
    mode: eraseBrushMode, sample: null,
  };
  eraseStroke = stroke;
  loadEraseMaskCache(scene).then((cache) => {
    stroke.cache = cache;
    // Brush size is a percent of the image width, so the same slider value
    // removes the same visible amount at any source resolution.
    stroke.radius = (eraseBrushPercent / 100) * cache.canvas.width;
    stroke.last = getEraseLocalPoint(event.clientX, event.clientY, display);
    if (stroke.mode === "bgErase") stroke.sample = sampleEraseBaseColor(cache, stroke.last);
    paintEraseSegment(stroke, stroke.last, stroke.last);
    drawSceneEraseDisplay(display, cache);
    if (stroke.ended) finishEraseStroke(stroke);
  }).catch(() => {
    eraseStroke = null;
    setSceneStatus(t("error.unknown"));
  });
}

function continueEraseStroke(event) {
  const stroke = eraseStroke;
  if (!stroke || stroke.ended || !stroke.cache || event.pointerId !== stroke.pointerId) return;
  const point = getEraseLocalPoint(event.clientX, event.clientY, stroke.display);
  paintEraseSegment(stroke, stroke.last, point);
  stroke.last = point;
  drawSceneEraseDisplay(stroke.display, stroke.cache);
}

function endEraseStroke(event) {
  const stroke = eraseStroke;
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  stroke.ended = true;
  // Released before the mask finished loading: finish once it arrives.
  if (stroke.cache) finishEraseStroke(stroke);
}

function finishEraseStroke(stroke) {
  eraseStroke = null;
  stroke.scene.eraseMask = stroke.cache.canvas.toDataURL("image/png");
  stroke.cache.source = stroke.scene.eraseMask;
  scheduleSceneAutosave();
}

export function createSceneEraseCanvas(scene, transitionMask = "") {
  const display = document.createElement("canvas");
  display.className = "scene-erase-canvas";
  display.dataset.sceneEraseId = scene.id;
  display.style.transform = getSceneImageTransform(scene);
  display.style.filter = getSceneImagePreviewFilter(scene);
  applySceneEraseMask(display, scene, transitionMask, false);
  display.addEventListener("pointerdown", (event) => startEraseStroke(event, scene, display));
  display.addEventListener("pointermove", continueEraseStroke);
  display.addEventListener("pointerup", endEraseStroke);
  display.addEventListener("pointercancel", endEraseStroke);
  loadEraseMaskCache(scene)
    .then((cache) => drawSceneEraseDisplay(display, cache))
    .catch(() => setSceneStatus(t("error.unknown")));
  return display;
}

function handleEraseModeKeyDown(event) {
  if (event.key === "Escape") exitSceneEraseMode();
}

export function toggleSceneEraseMode(scene) {
  if (eraseModeSceneId === scene.id) {
    exitSceneEraseMode();
    return;
  }
  eraseModeSceneId = scene.id;
  setSelectedScene(scene.id);
  document.addEventListener("keydown", handleEraseModeKeyDown);
  renderScenes();
  setSceneStatus(t("status.eraseOn"));
}

export function exitSceneEraseMode() {
  if (!eraseModeSceneId) return;
  // Keep a stroke that's still being saved; drop nothing mid-edit.
  if (eraseStroke?.cache) finishEraseStroke(eraseStroke);
  eraseModeSceneId = "";
  document.removeEventListener("keydown", handleEraseModeKeyDown);
  renderScenes();
  setSceneStatus(t("status.eraseOff"));
}

export function clearSceneEraseMask(scene) {
  if (!scene.eraseMask) return;
  pushSceneHistory();
  scene.eraseMask = "";
  eraseMaskCache = { sceneId: "", source: "", base: null, canvas: null };
  scheduleSceneAutosave();
  renderScenes();
  setSceneStatus(t("status.eraseCleared"));
}

// Shared by the layer image and its blur-transition copy. transitionMask is
// the CSS mask the transition style produced (or ""); the erase mask is
// intersected with it so both still apply. The live erase canvas passes
// includeErase=false because its pixels already have the erase baked in.
export function applySceneEraseMask(element, scene, transitionMask = "", includeErase = true) {
  const erase = includeErase && scene.eraseMask ? `url("${scene.eraseMask}")` : "";
  const both = Boolean(erase && transitionMask);
  const mask = both ? `${erase}, ${transitionMask}` : (erase || transitionMask);
  element.style.webkitMaskImage = mask;
  element.style.maskImage = mask;
  element.style.webkitMaskComposite = both ? "source-in" : "";
  element.style.maskComposite = both ? "intersect" : "";
  element.style.webkitMaskSize = erase ? "100% 100%" : "";
  element.style.maskSize = erase ? "100% 100%" : "";
}

export function updateSceneImageTransform(scene) {
  const image = document.querySelector(`[data-scene-image-id="${CSS.escape(scene.id)}"]`);
  const box = document.querySelector(`[data-scene-transform-id="${CSS.escape(scene.id)}"]`);
  const wrap = document.querySelector(`.scene-image-wrap[data-scene-id="${CSS.escape(scene.id)}"]`);
  const transform = getSceneImageTransform(scene);
  if (image) {
    image.style.transform = transform;
    image.style.filter = getSceneImagePreviewFilter(scene);
  }
  if (box) box.style.transform = transform;
  if (wrap) applySceneLayerPosition(wrap, scene);
  if (box) applySceneLayerPosition(box, scene);
}
// ---- Click-through picking ----
// Each layer's pointer target is its full image rectangle, so a transparent part
// of the top layer used to swallow presses meant for the layers under it. Picking
// looks at the pixels instead: a press goes to the topmost layer that is opaque
// at that point. Each picture keeps a small alpha copy for this, rebuilt after
// each render; until a copy is ready the old behaviour applies.
const layerPickCache = new Map();
const PICK_MAX_SIDE = 512;
const PICK_MIN_ALPHA = 16;

async function buildLayerPick(scene) {
  const image = await loadImage(scene.dataUrl);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, PICK_MAX_SIDE / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  if (scene.eraseMask) {
    // Erased parts are transparent for picking too.
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(await loadImage(scene.eraseMask), 0, 0, width, height);
  }
  const data = ctx.getImageData(0, 0, width, height).data;
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  return { dataUrl: scene.dataUrl, eraseMask: scene.eraseMask || "", naturalWidth, naturalHeight, width, height, alpha };
}

// Alpha copy for one layer, built now when the cache doesn't hold a current one.
async function getLayerPick(scene) {
  const cached = layerPickCache.get(scene.id);
  if (cached && cached.dataUrl === scene.dataUrl && cached.eraseMask === (scene.eraseMask || "")) return cached;
  const pick = await buildLayerPick(scene);
  layerPickCache.set(scene.id, pick);
  return pick;
}

// True when a picture layer has visible pixels inside a rectangle (output px).
// Copy, cut and keep-only use this, so an empty or transparent spot of the
// canvas (even one inside a full-canvas paint layer) is not a layer.
export async function rectHasSceneContent(scene, rect) {
  if (!scene || scene.type === "text" || !scene.dataUrl) return false;
  const pick = await getLayerPick(scene);
  const outputWidth = getSceneOutputWidth();
  const outputHeight = getSceneBackgroundHeight();
  const layer = getSceneImageDrawRect(scene, pick.naturalWidth, pick.naturalHeight, outputWidth, outputHeight);
  const x0 = Math.max(rect.x, layer.x);
  const y0 = Math.max(rect.y, layer.y);
  const x1 = Math.min(rect.x + rect.width, layer.x + layer.width);
  const y1 = Math.min(rect.y + rect.height, layer.y + layer.height);
  if (x1 <= x0 || y1 <= y0) return false;
  const u0 = Math.max(0, Math.floor(((x0 - layer.x) / layer.width) * pick.width));
  const u1 = Math.min(pick.width - 1, Math.ceil(((x1 - layer.x) / layer.width) * pick.width) - 1);
  const v0 = Math.max(0, Math.floor(((y0 - layer.y) / layer.height) * pick.height));
  const v1 = Math.min(pick.height - 1, Math.ceil(((y1 - layer.y) / layer.height) * pick.height) - 1);
  for (let v = v0; v <= v1; v++) {
    for (let u = u0; u <= u1; u++) {
      if (pick.alpha[v * pick.width + u] >= PICK_MIN_ALPHA) return true;
    }
  }
  return false;
}

export function warmLayerPickCache() {
  const live = new Set(scenes.map((scene) => scene.id));
  for (const id of layerPickCache.keys()) {
    if (!live.has(id)) layerPickCache.delete(id);
  }
  scenes.forEach((scene) => {
    if (scene.type === "text" || !scene.dataUrl) return;
    const cached = layerPickCache.get(scene.id);
    if (cached && cached.dataUrl === scene.dataUrl && cached.eraseMask === (scene.eraseMask || "")) return;
    buildLayerPick(scene)
      .then((pick) => layerPickCache.set(scene.id, pick))
      .catch(() => {});
  });
}

// Topmost picture layer that is opaque under the mouse. `unknown` means a layer
// above the point has no alpha copy yet, so the answer isn't known.
function findPictureLayerAt(clientX, clientY) {
  const stage = document.querySelector(".composite-stage");
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const outputWidth = getSceneOutputWidth();
  const outputHeight = getSceneBackgroundHeight();
  const x = ((clientX - rect.left) / rect.width) * outputWidth;
  const y = ((clientY - rect.top) / rect.height) * outputHeight;
  for (const scene of scenes) {
    if (scene.type === "text" || !scene.dataUrl) continue;
    const pick = layerPickCache.get(scene.id);
    if (!pick || pick.dataUrl !== scene.dataUrl || pick.eraseMask !== (scene.eraseMask || "")) {
      return { scene, unknown: true };
    }
    const layer = getSceneImageDrawRect(scene, pick.naturalWidth, pick.naturalHeight, outputWidth, outputHeight);
    if (x < layer.x || y < layer.y || x >= layer.x + layer.width || y >= layer.y + layer.height) continue;
    const u = Math.min(pick.width - 1, Math.floor(((x - layer.x) / layer.width) * pick.width));
    const v = Math.min(pick.height - 1, Math.floor(((y - layer.y) / layer.height) * pick.height));
    if (pick.alpha[v * pick.width + u] >= PICK_MIN_ALPHA) return { scene, unknown: false };
  }
  return null;
}

// Runs in the capture phase on the stage, before the layer boxes see the press.
// A press on a layer's transparent part goes to the layer that is opaque there,
// or starts a marquee when no layer is.
export function handleStagePressCapture(event, stage) {
  if (event.button !== 0 || isSpacePanning || eraseModeSceneId) return;
  if (event.target.closest(".image-transform-handle, .scene-text-block, .scene-resize-handle, .scene-erase-canvas")) return;
  const layerEl = event.target.closest(".scene-image-wrap, .scene-image-transform-box");
  if (!layerEl) return;
  const ownId = layerEl.dataset.sceneId || layerEl.dataset.sceneTransformId;
  const pick = findPictureLayerAt(event.clientX, event.clientY);
  if (pick && pick.unknown) return;
  if (pick && pick.scene.id === ownId) return;
  event.stopPropagation();
  event.preventDefault();
  if (pick) {
    if (!applySceneModifierSelection(event, pick.scene.id)) setSelectedScene(pick.scene.id);
    return;
  }
  startSceneMarqueeSelect(event, stage);
}

export function startSceneImagePan(event, scene) {
  if (scene.isLocked) return;
  if (isSpacePanning) return;
  if (event.button !== 0 || event.target.closest(".image-transform-handle")) return;
  const box = event.currentTarget;
  const stage = box.closest(".composite-stage");
  if (!stage) return;

  event.preventDefault();
  event.stopPropagation();
  // Ctrl/Shift press only changes the selection; it doesn't start a move.
  if (applySceneModifierSelection(event, scene.id)) return;
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

export function startStageResize(event, direction) {
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

export function setSceneCanvasSize(width, height, stage) {
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

export function startSceneImageScale(event, scene) {
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

export function roundScaleValue(value) {
  return Math.round(clampNumber(value, 5, 1200, 100) * 10) / 10;
}

export function roundPositionValue(value) {
  return Math.round(clampNumber(value, -1000, 1000, 0) * 10) / 10;
}

export function startSceneTextDrag(event, textBlock) {
  if (event.button !== 0) return;
  if (isSpacePanning) return;
  if (event.target.closest(".scene-resize-handle")) return;
  const block = event.currentTarget;
  const stage = block.closest(".composite-stage");
  if (!stage) return;

  event.preventDefault();
  event.stopPropagation();
  if (applySceneModifierSelection(event, block.dataset.sceneId)) return;
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

export function startSceneTextResize(event, textBlock) {
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
// ---- Kontur (text outline) ----
// Photoshop's way, on a flat picture: pick the text's color, take the pixels of
// that color as the text, expand that selection by the outline width, and paint
// the ring around it. The text pixels themselves are never changed. The export
// applies it while it builds the layer (getSceneKeyedSource); the preview shows
// the same pixels as a baked PNG (getSceneOutlinedSource), so they match.
const outlinedSourceCache = new Map();

function hexToRgb(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function hasSceneTextOutline(scene) {
  return clampNumber(scene.outlineWidth, 0, 5, 0) > 0 && hexToRgb(scene.outlineTextColor) !== null;
}

// Two-pass chamfer distance (3-4 weights) from every pixel to the nearest text
// pixel. Values are in 1/3 px, so dividing by 3 gives roughly Euclidean px.
function distanceToTextPixels(isText, width, height) {
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = isText[i] ? 0 : 1e9;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let best = dist[i];
      if (x > 0) best = Math.min(best, dist[i - 1] + 3);
      if (y > 0) {
        const up = i - width;
        best = Math.min(best, dist[up] + 3);
        if (x > 0) best = Math.min(best, dist[up - 1] + 4);
        if (x < width - 1) best = Math.min(best, dist[up + 1] + 4);
      }
      dist[i] = best;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let best = dist[i];
      if (x < width - 1) best = Math.min(best, dist[i + 1] + 3);
      if (y < height - 1) {
        const down = i + width;
        best = Math.min(best, dist[down] + 3);
        if (x < width - 1) best = Math.min(best, dist[down + 1] + 4);
        if (x > 0) best = Math.min(best, dist[down - 1] + 4);
      }
      dist[i] = best;
    }
  }
  return dist;
}

// Paints the outline ring onto `canvas` in place, at the canvas's own size.
// Width is a percent of the canvas width, so the look is the same at preview
// and export resolutions.
export function applySceneTextOutline(canvas, scene) {
  if (!hasSceneTextOutline(scene)) return;
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  const text = hexToRgb(scene.outlineTextColor);
  const outline = hexToRgb(scene.outlineColor) || [0, 0, 0];
  // Tolerance is a fraction of the largest RGB distance (black to white).
  const limit = (clampNumber(scene.outlineTolerance, 0, 100, 20) / 100) * 0.4 * 255 * Math.sqrt(3);
  const isText = new Uint8Array(width * height);
  for (let i = 0; i < isText.length; i++) {
    const p = i * 4;
    if (data[p + 3] === 0) continue;
    const dr = data[p] - text[0];
    const dg = data[p + 1] - text[1];
    const db = data[p + 2] - text[2];
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= limit) isText[i] = 1;
  }
  const radius = (clampNumber(scene.outlineWidth, 0, 5, 0) / 100) * width;
  const distance = distanceToTextPixels(isText, width, height);
  const maxUnits = radius * 3;
  for (let i = 0; i < isText.length; i++) {
    if (isText[i] || distance[i] > maxUnits) continue;
    const p = i * 4;
    data[p] = outline[0];
    data[p + 1] = outline[1];
    data[p + 2] = outline[2];
    data[p + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
}

function getSceneOutlineKey(scene) {
  return [scene.id, scene.outlineTextColor, scene.outlineTolerance, scene.outlineWidth, scene.outlineColor].join("|");
}

// Preview version of the outline: the layer's natural-size pixels with the ring
// already painted in, as a PNG. Cached per settings; without an outline it's
// just the original image.
export async function getSceneOutlinedSource(scene) {
  if (!hasSceneTextOutline(scene)) return scene.dataUrl;
  const key = getSceneOutlineKey(scene);
  const cached = outlinedSourceCache.get(key);
  if (cached && cached.source === scene.dataUrl) return cached.url;
  const image = await loadImage(scene.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  applySceneTextOutline(canvas, scene);
  const url = canvas.toDataURL("image/png");
  if (outlinedSourceCache.size >= 12) outlinedSourceCache.clear();
  outlinedSourceCache.set(key, { source: scene.dataUrl, url });
  return url;
}

// Puts the outlined pixels into the layer's <img> (and its blur copy). If the
// settings changed while the PNG was being built, the stale result is dropped.
export async function refreshSceneOutlinePreview(scene) {
  const key = getSceneOutlineKey(scene);
  const url = await getSceneOutlinedSource(scene);
  const current = scenes.find((candidate) => candidate.id === scene.id);
  if (!current || getSceneOutlineKey(current) !== key) return;
  document.querySelectorAll(`[data-scene-image-id="${CSS.escape(scene.id)}"]`).forEach((image) => {
    image.src = url;
  });
}

export function updateSceneOutline(scene) {
  updateSceneImageTransform(scene);
  refreshSceneOutlinePreview(scene).catch(() => setSceneStatus(t("error.unknown")));
}

// Export-side twin of the SVG preview key: bakes the same luma key into the
// image's alpha at the size it is drawn, so the PNG / ImgBB output matches
// what the stage shows. Returns the image untouched when the key is off.
function getSceneKeyedSource(image, scene, width, height, eraseMaskImage = null) {
  const threshold = clampNumber(scene.bgRemove, 0, 100, sceneImageFilterDefaults.bgRemove);
  if ((!threshold && !eraseMaskImage) || width < 1 || height < 1) return image;
  const keyed = document.createElement("canvas");
  keyed.width = width;
  keyed.height = height;
  const keyedCtx = keyed.getContext("2d", { willReadFrequently: true });
  keyedCtx.drawImage(image, 0, 0, width, height);
  if (eraseMaskImage) {
    // Keep only where the mask is opaque (= not erased).
    keyedCtx.globalCompositeOperation = "destination-in";
    keyedCtx.drawImage(eraseMaskImage, 0, 0, width, height);
    keyedCtx.globalCompositeOperation = "source-over";
  }
  if (!threshold) return keyed;
  const pixels = keyedCtx.getImageData(0, 0, width, height);
  const data = pixels.data;
  const { low, band } = getSceneBgKeyRange(threshold);
  for (let i = 0; i < data.length; i += 4) {
    const luma = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    const keep = Math.min(1, Math.max(0, (luma - low) / band));
    data[i + 3] = Math.round(data[i + 3] * keep);
  }
  keyedCtx.putImageData(pixels, 0, 0);
  return keyed;
}

// Scales width/height down proportionally, if needed, to fit the total
// pixel budget - keeps the aspect ratio so the composite still looks like
// what the user configured, just smaller, rather than cropping or
// stretching it.
// Where a picture layer lands on the output, in output pixels. Shared by the
// export (drawSceneLayerImage) and the merge, which needs the union box of
// several layers before it draws anything.
export function getSceneImageDrawRect(scene, naturalWidth, naturalHeight, width, height) {
  const zoom = (scene.imageZoom || 100) / 100;
  const scaleX = (scene.imageScaleX || 100) / 100;
  const scaleY = (scene.imageScaleY || 100) / 100;
  const baseHeight = Math.round((naturalHeight * width) / Math.max(1, naturalWidth));
  const drawWidth = Math.ceil(width * zoom * scaleX);
  const drawHeight = Math.ceil(baseHeight * zoom * scaleY);
  return {
    x: ((scene.imageX || 0) / 100) * width + (width - drawWidth) / 2,
    y: ((scene.imageY || 0) / 100) * height + (baseHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

export function drawSceneLayerImage(context, image, scene, width, height, eraseMaskImage = null) {
  const { x: drawX, y: drawY, width: drawWidth, height: drawHeight } = getSceneImageDrawRect(
    scene,
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    width,
    height,
  );

  // Temporary canvas to process filters and masks/transitions per layer
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = drawWidth;
  tempCanvas.height = drawHeight;
  const tempCtx = tempCanvas.getContext("2d");

  // Draw filtered image on temp canvas. The background key goes first so
  // brightness/contrast don't shift which pixels count as "dark" enough to drop.
  const source = getSceneKeyedSource(image, scene, drawWidth, drawHeight, eraseMaskImage);
  tempCtx.save();
  tempCtx.filter = getSceneImageFilter(scene);
  tempCtx.drawImage(source, 0, 0, drawWidth, drawHeight);
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
      blurCtx.drawImage(source, 0, 0, drawWidth, drawHeight);
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

  context.font = `800 ${fontSize}px ${textFontFamily(textBlock.fontId)}`;
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

export function getScenePreviewWidth() {
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

export function getScenePreviewHeight() {
  return getSceneBackgroundHeight();
}

export function getScenePadding() {
  return clampNumber(scenePadding.value, 4, 80, 18);
}

export function applyGlobalTransitionToAllScenes() {
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

