"use strict";

// Layer panel: the main renderScenes() render loop and every layer-card
// builder/control (image + text), drag-reorder, list marquee-select, and
// the small shared UI-control helpers (createRangeControl etc.) those
// cards use. Nothing in here is a canvas pointer-interaction (see
// scripts/canvas.js) or top menu-bar chrome (see scripts/menu-ui.js).

import { clampNumber } from "./utils.js?v=3.20.2";
import { t } from "./i18n.js?v=3.20.2";
import { createToolWorkspace, decorateToolStage, getActiveTool, handleToolStagePointerDown } from "./tool-panel.js?v=3.20.2";
import { saveState, scheduleSceneAutosave } from "./storage.js?v=3.20.2";
import {
  addTextLayer,
  clearSceneSelection,
  ensureSceneModel,
  isSceneSelected,
  normalizeSceneSelection,
  prepareSceneHistoryControl,
  pushSceneHistory,
  refreshSceneSelection,
  rememberTextLayerDefaults,
  removeScene,
  applySceneModifierSelection,
  setSelectedScene,
} from "./scene-model.js?v=3.20.2";
import {
  applySceneLayerPosition,
  applySceneViewportZoom,
  createSceneImageTransformBox,
  createStageResizeFrame,
  fitSceneToViewport,
  getSceneFontSize,
  getSceneImagePreviewFilter,
  hasSceneTextOutline,
  refreshSceneOutlinePreview,
  updateSceneOutline,
  applySceneEraseMask,
  clearSceneEraseMask,
  createSceneEraseCanvas,
  getEraseBrushPercent,
  isSceneEraseMode,
  setEraseBrushPercent,
  toggleSceneEraseMode,
  getSceneImageTransform,
  getSceneLayerZIndex,
  getScenePadding,
  getScenePreviewHeight,
  getScenePreviewWidth,
  isEditableTarget,
  isSpacePanning,
  renderSceneTextBlock,
  sceneViewportZoom,
  startInlineSceneTextEdit,
  startSceneMarqueeSelect,
  startSceneTextDrag,
  startSceneTextResize,
  updateSceneImageTransform,
} from "./canvas.js?v=3.20.2";
import {
  closeLayersPanel,
  createPanelResizeHandles,
  isNearLayersPanelResizeEdge,
  showSceneContextMenu,
} from "./menu-ui.js?v=3.20.2";
import {
  controls,
  expandedLayerIds,
  hoveredSceneId,
  sceneImageFilterDefaults,
  sceneLayersPanel,
  sceneList,
  scenes,
  selectedSceneIds,
  shouldAutoFitSceneViewport,
  setHoveredSceneIdRaw,
  setSceneStatus,
  setSelectedSceneIdRaw,
  setSelectedSceneIdsRaw,
  setShouldAutoFitSceneViewport,
} from "../app.js?v=3.20.2";

export function startLayerListMarqueeSelect(event, listContainer) {
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

    setHoveredSceneIdRaw("");
    setSelectedSceneIdsRaw(hitIds);
    setSelectedSceneIdRaw(hitIds[0] || "");
    refreshSceneSelection();
    if (hitIds.length) setSceneStatus(t("status.layersSelected", { count: hitIds.length }));
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
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
  // Drawing tools (pen, crop) take presses on the empty stage; move does nothing here.
  stage.addEventListener("pointerdown", (event) => {
    handleToolStagePointerDown(event, stage);
  });
  stage.style.width = `${getScenePreviewWidth()}px`;
  stage.style.height = `${getScenePreviewHeight()}px`;
  stage.style.setProperty("--scene-padding", `${getScenePadding()}px`);
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isSpacePanning) return;
    if (event.target !== stage && !event.target.classList.contains("stage-render-clip") && !event.target.classList.contains("stage-resize-frame")) return;
    setHoveredSceneIdRaw("");
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
      if (getActiveTool() !== "move") block.style.pointerEvents = "none";
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
      if (!applySceneModifierSelection(event, scene.id)) setSelectedScene(scene.id);
    });
    wrap.addEventListener("pointerenter", () => {
      setHoveredSceneIdRaw(scene.id);
    });
    wrap.addEventListener("pointerleave", () => {
      if (hoveredSceneId === scene.id) setHoveredSceneIdRaw("");
    });
    const erasing = isSceneEraseMode(scene);
    const image = document.createElement("img");
    image.src = scene.dataUrl;
    image.alt = scene.name;
    image.dataset.sceneImageId = scene.id;
    image.style.transform = getSceneImageTransform(scene);
    image.style.filter = getSceneImagePreviewFilter(scene);
    // While erasing, the live erase canvas (appended below) stands in for it.
    if (erasing) image.style.visibility = "hidden";
    image.addEventListener("load", () => applySceneViewportZoom());
    wrap.append(image);

    // Apply Transition Effects in HTML Preview
    const transStyle = scene.transitionStyle || "none";
    const transSize = scene.transitionStyle === "none" ? 0 : (scene.transitionSize ?? 150);
    const transSides = scene.transitionSides || "both";
    let imageTransitionMask = "";

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
        imageTransitionMask = mask;
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
      } else if (transStyle === "blur" && !erasing) {
        // Skipped while erasing: this copy would paint over the live erase canvas.
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
        applySceneEraseMask(blurImg, scene, mask);
        wrap.append(blurImg);
      }
    }
    applySceneEraseMask(image, scene, imageTransitionMask);
    // A drawing tool owns the pointer, so layers let presses pass through to the stage.
    if (getActiveTool() !== "move" && !erasing) wrap.style.pointerEvents = "none";
    if (hasSceneTextOutline(scene)) {
      refreshSceneOutlinePreview(scene).catch(() => setSceneStatus(t("error.unknown")));
    }
    if (erasing) wrap.append(createSceneEraseCanvas(scene, imageTransitionMask));

    // The move/scale box would sit above the erase canvas and swallow strokes.
    if (!scene.isLocked && !erasing && getActiveTool() === "move") {
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

  decorateToolStage(stage);
  stage.append(createStageResizeFrame());

  const canvasViewport = document.createElement("div");
  canvasViewport.className = "scene-canvas-viewport";
  canvasViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isSpacePanning) return;
    if (isNearLayersPanelResizeEdge(event)) return;
    if (event.target === canvasViewport || event.target === zoomShell) {
      setHoveredSceneIdRaw("");
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
  // Same menu as right-clicking the canvas, so Birlestir (and copy/cut/delete)
  // work from the list too. An unselected card is selected first, matching the
  // canvas behavior; a card already in a multi-selection keeps the selection.
  listContainer.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const item = event.target.closest(".scene-editor-item");
    const targetScene = item ? scenes.find((scene) => scene.id === item.dataset.sceneEditorId) : null;
    if (targetScene && !isSceneSelected(targetScene.id)) setSelectedScene(targetScene.id);
    showSceneContextMenu(event.clientX, event.clientY, targetScene || null);
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

  composer.append(toolbar, createToolWorkspace(canvasViewport));
  sceneList.append(composer);
  scheduleSceneAutosave();
  if (window.lucide) window.lucide.createIcons();
  requestAnimationFrame(() => {
    applySceneViewportZoom();
    if (shouldAutoFitSceneViewport) {
      fitSceneToViewport();
      setShouldAutoFitSceneViewport(false);
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

export function createLayerCard(scene, index, stage, listContainer) {
  const isExpanded = expandedLayerIds.has(scene.id);

  const item = document.createElement("div");
  item.className = "scene-editor-item" + (scene.type === "text" ? " text-layer" : "") + (isExpanded ? " expanded" : "");
  item.dataset.sceneEditorId = scene.id;
  if (isSceneSelected(scene.id)) item.classList.add("selected");
  item.style.setProperty("--scene-accent", getSceneAccent(scene.id));
  item.addEventListener("pointerdown", (event) => {
    if (isEditableTarget(event.target)) return;
    if (!applySceneModifierSelection(event, scene.id)) setSelectedScene(scene.id);
  });

  const cardInner = document.createElement("div");
  cardInner.className = "layer-card-inner";
  cardInner.append(createLayerCardHeader(scene, index, isExpanded));
  cardInner.append(isExpanded ? createLayerOrderRow(scene, index) : createLayerPreviewLine(scene));
  if (isExpanded) cardInner.append(createLayerCardBody(scene, stage));

  item.append(createLayerDragGrip(scene, listContainer), cardInner);
  return item;
}

export function createLayerDragGrip(scene, listContainer) {
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

export function createLayerCardHeader(scene, index, isExpanded) {
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

export function createLayerThumb(scene) {
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

export function createLayerNameInput(scene, index) {
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

export function createLayerHeaderActions(scene, isExpanded) {
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

export function createLayerPreviewLine(scene) {
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

export function createLayerOrderRow(scene, index) {
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

export function createLayerCardBody(scene, stage) {
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

export function createTextLayerControls(scene, stage) {
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

export function updateSceneTextStyle(scene) {
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
export function applyToSelectedSiblings(scene, updater) {
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
export function withSelectedSiblings(scene, propName, liveUpdateFn) {
  return (value) => {
    scene[propName] = value;
    liveUpdateFn(scene);
    applyToSelectedSiblings(scene, (other) => {
      other[propName] = value;
      liveUpdateFn(other);
    });
  };
}

export function createImageLayerControls(scene) {
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
    createRangeControl(t("control.bgRemove"), scene.bgRemove ?? sceneImageFilterDefaults.bgRemove, 0, 100, 1,
      withSelectedSiblings(scene, "bgRemove", updateSceneImageTransform), "eraser"),
  );
  const resetFilterButton = document.createElement("button");
  resetFilterButton.type = "button";
  resetFilterButton.className = "layer-mini-btn";
  resetFilterButton.textContent = t("control.reset");
  resetFilterButton.addEventListener("click", () => resetSceneFilter(scene));
  filterSection.body.append(resetFilterButton);
  nodes.push(filterSection.el);

  const outlineSection = createLayerSection(`${scene.id}:outline`, t("section.outline"), false);
  const outlinePickButton = document.createElement("button");
  outlinePickButton.type = "button";
  outlinePickButton.className = "layer-mini-btn";
  outlinePickButton.textContent = t("control.outlinePick");
  // The screen eyedropper is a Chromium API; elsewhere the color field still works.
  outlinePickButton.disabled = typeof window.EyeDropper !== "function";
  outlinePickButton.addEventListener("click", async () => {
    let picked;
    try {
      picked = await new window.EyeDropper().open();
    } catch {
      return; // cancelled with Esc
    }
    pushSceneHistory();
    withSelectedSiblings(scene, "outlineTextColor", updateSceneOutline)(picked.sRGBHex);
  });
  const outlineOffButton = document.createElement("button");
  outlineOffButton.type = "button";
  outlineOffButton.className = "layer-mini-btn";
  outlineOffButton.textContent = t("control.outlineOff");
  outlineOffButton.addEventListener("click", () => {
    pushSceneHistory();
    withSelectedSiblings(scene, "outlineWidth", updateSceneOutline)(0);
  });
  outlineSection.body.append(
    createColorControl(t("control.outlineTextColor"), scene.outlineTextColor || "#ffffff",
      withSelectedSiblings(scene, "outlineTextColor", updateSceneOutline), "pipette"),
    outlinePickButton,
    createRangeControl(t("control.outlineTolerance"), scene.outlineTolerance ?? 20, 0, 100, 1,
      withSelectedSiblings(scene, "outlineTolerance", updateSceneOutline), "scan-search"),
    createRangeControl(t("control.outlineWidth"), scene.outlineWidth ?? 0, 0, 5, 0.1,
      withSelectedSiblings(scene, "outlineWidth", updateSceneOutline), "circle-dashed"),
    createColorControl(t("control.outlineColor"), scene.outlineColor || "#000000",
      withSelectedSiblings(scene, "outlineColor", updateSceneOutline), "paintbrush"),
    outlineOffButton,
  );
  nodes.push(outlineSection.el);

  const eraseSection = createLayerSection(`${scene.id}:erase`, t("section.erase"), false);
  const erasing = isSceneEraseMode(scene);
  const eraseToggle = document.createElement("button");
  eraseToggle.type = "button";
  eraseToggle.className = "layer-mini-btn";
  eraseToggle.setAttribute("aria-pressed", String(erasing));
  eraseToggle.textContent = erasing ? t("control.eraseDone") : t("control.erase");
  eraseToggle.addEventListener("click", () => toggleSceneEraseMode(scene));
  const eraseClearButton = document.createElement("button");
  eraseClearButton.type = "button";
  eraseClearButton.className = "layer-mini-btn";
  eraseClearButton.textContent = t("control.eraseClear");
  eraseClearButton.addEventListener("click", () => clearSceneEraseMask(scene));
  eraseSection.body.append(
    createRangeControl(t("control.eraseBrush"), getEraseBrushPercent(), 0.5, 20, 0.5,
      (value) => setEraseBrushPercent(value), "brush"),
    eraseToggle,
    eraseClearButton,
  );
  nodes.push(eraseSection.el);

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

export function createSceneOrderButton(label, icon, sceneId, placement, disabled) {
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
  setSelectedSceneIdRaw(sceneId);
  setSelectedSceneIdsRaw([sceneId]);
  setHoveredSceneIdRaw("");
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
export function startLayerDragReorder(event, scene, listContainer) {
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

export function reorderScenesByDrag(draggedIds, targetId, placement) {
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
  setSelectedSceneIdsRaw([...draggedIds]);
  setSelectedSceneIdRaw(draggedIds[0]);
  setHoveredSceneIdRaw("");
  renderScenes();
  setSceneStatus(
    draggedIds.length > 1 ? `${draggedIds.length} katman suruklemeyle tasindi.` : "Sahne sirasi suruklemeyle degistirildi.",
  );
}

export function resetSceneFilter(scene) {
  pushSceneHistory();
  const reset = (target) => {
    target.filterBrightness = sceneImageFilterDefaults.brightness;
    target.filterContrast = sceneImageFilterDefaults.contrast;
    target.filterSaturate = sceneImageFilterDefaults.saturate;
    target.filterSepia = sceneImageFilterDefaults.sepia;
    target.filterBlur = sceneImageFilterDefaults.blur;
    target.bgRemove = sceneImageFilterDefaults.bgRemove;
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

export function createLayerSection(stateKey, title, openByDefault) {
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

// Called by scene-model.js whenever scene(s) are removed - stateKey is
// "sceneId:sectionKey", so every entry belonging to a deleted scene id
// starts with "<id>:" and would otherwise sit in this Map forever, growing
// unbounded over a long session of adding/removing many layers.
export function clearExpandedSectionsFor(sceneIds) {
  if (!sceneIds.length) return;
  const prefixes = sceneIds.map((id) => `${id}:`);
  for (const key of expandedLayerSections.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) expandedLayerSections.delete(key);
  }
}

export function getSceneAccent(sceneId) {
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

export function createControlIcon(icon) {
  if (!icon) return null;
  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon);
  iconEl.className = "range-control-icon";
  return iconEl;
}

export function createRangeControl(labelText, value, min, max, step, onInput, icon) {
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

// Color field with the same label and icon layout as createRangeControl, so it
// sits in the layer card with the other controls.
export function createColorControl(labelText, value, onInput, icon) {
  const label = document.createElement("label");
  label.className = "range-control";
  const iconEl = createControlIcon(icon);
  const title = document.createElement("span");
  title.textContent = labelText;
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  prepareSceneHistoryControl(input);
  input.addEventListener("input", () => onInput(input.value));
  label.append(...(iconEl ? [iconEl] : []), title, input);
  return label;
}

export function createSelectControl(labelText, value, options, onChange, icon) {
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

export function formatControlValue(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}


