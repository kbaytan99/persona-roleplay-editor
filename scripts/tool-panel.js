"use strict";

// Left tool bar, Photoshop-style: move/select, eraser, background eraser, pen and
// crop. The active tool decides what a press on the stage does: "move" keeps the
// normal layer behaviour, the other tools take the pointer until another tool is
// picked. Layers ignore the pointer while a drawing tool is active (see
// renderScenes), so presses reach the stage and the tools below.

import { t } from "./i18n.js?v=3.20.2";
import { scenes, selectedSceneId, setSceneStatus } from "../app.js?v=3.20.2";
import {
  exitSceneEraseMode,
  getBgEraserTolerance,
  getEraseBrushPercent,
  getSceneBackgroundHeight,
  getSceneImageTransform,
  getSceneOutputWidth,
  setBgEraserTolerance,
  setEraseBrushMode,
  setEraseBrushPercent,
  setSceneEraseMode,
} from "./canvas.js?v=3.20.2";
import { createPaintLayer, loadImage, pushSceneHistory } from "./scene-model.js?v=3.20.2";
import { scheduleSceneAutosave } from "./storage.js?v=3.20.2";
import { createColorControl, createRangeControl, renderScenes } from "./layer-panel.js?v=3.20.2";

const TOOLS = [
  { id: "move", icon: "mouse-pointer-2", labelKey: "tool.move" },
  { id: "erase", icon: "eraser", labelKey: "tool.erase" },
  { id: "bgErase", icon: "wand", labelKey: "tool.bgErase" },
  { id: "pen", icon: "pen-tool", labelKey: "tool.pen" },
  { id: "crop", icon: "crop", labelKey: "tool.crop" },
];

let activeTool = "move";
let penColor = "#ffffff";
// Pen width as a percent of the drawing's width, like the eraser brush.
let penSizePercent = 0.6;
// Crop rectangle in output px. It exists while it's being dragged and after,
// until applied or cancelled; cropReady means the drag finished on a real area.
let cropDraft = null;
let cropReady = false;
let penStroke = null;
let cropDrag = null;
let shortcutToggle = null;

export function getActiveTool() {
  return activeTool;
}

// The finished crop area and the layer it belongs to, for Ctrl+C. Null unless a
// crop rectangle is complete and a picture layer is selected.
export function getPendingCropSelection() {
  if (activeTool !== "crop" || !cropReady || !cropDraft) return null;
  const scene = getSelectedPictureScene();
  return scene ? { scene, rect: cropDraft } : null;
}

function getSelectedPictureScene() {
  return scenes.find((scene) => scene.id === selectedSceneId && scene.type !== "text" && scene.dataUrl) || null;
}

function getSelectedPaintScene() {
  return scenes.find((scene) => scene.id === selectedSceneId && scene.paintLayer) || null;
}

export function setActiveTool(tool) {
  if (tool === activeTool || !TOOLS.some((entry) => entry.id === tool)) return;
  activeTool = tool;
  cropDraft = null;
  cropReady = false;
  if (tool === "erase" || tool === "bgErase") {
    const target = getSelectedPictureScene();
    if (!target) {
      activeTool = "move";
      setSceneStatus(t("status.toolNeedsLayer"));
      renderScenes();
      return;
    }
    setEraseBrushMode(tool === "bgErase" ? "bgErase" : "erase");
    setSceneEraseMode(target, true);
    return;
  }
  exitSceneEraseMode();
  renderScenes();
}

function createIconElement(name) {
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", name);
  return icon;
}

function createToolButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "layer-mini-btn";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createToolRail() {
  const rail = document.createElement("div");
  rail.className = "tool-rail";
  rail.setAttribute("role", "toolbar");
  rail.setAttribute("aria-orientation", "vertical");
  TOOLS.forEach((tool) => {
    const button = document.createElement("button");
    const isActive = tool.id === activeTool;
    button.type = "button";
    button.className = `tool-rail-button${isActive ? " active" : ""}`;
    button.title = t(tool.labelKey);
    button.setAttribute("aria-label", t(tool.labelKey));
    button.setAttribute("aria-pressed", String(isActive));
    button.append(createIconElement(tool.icon));
    button.addEventListener("click", () => setActiveTool(tool.id));
    rail.append(button);
  });
  // The keyboard-shortcuts toggle sits at the bottom of the rail. It's the app's
  // own button, moved here, so its existing click wiring keeps working.
  // Kept by reference: each render replaces the whole sidebar, which detaches the
  // button, so a later render can't find it in the document any more.
  if (!shortcutToggle) shortcutToggle = document.querySelector("#showShortcutsBtn");
  if (shortcutToggle) {
    shortcutToggle.classList.add("tool-rail-shortcut");
    rail.append(shortcutToggle);
  }
  return rail;
}

// Options for the active tool, shown above the canvas. The move tool has none.
function createToolOptions() {
  if (activeTool === "move") return null;
  const bar = document.createElement("div");
  bar.className = "tool-options-bar";
  if (activeTool === "erase") {
    bar.append(createRangeControl(t("control.eraseBrush"), getEraseBrushPercent(), 0.5, 20, 0.5,
      (value) => setEraseBrushPercent(value), "brush"));
  } else if (activeTool === "bgErase") {
    bar.append(
      createRangeControl(t("control.outlineTolerance"), getBgEraserTolerance(), 0, 100, 1,
        (value) => setBgEraserTolerance(value), "scan-search"),
      createRangeControl(t("control.eraseBrush"), getEraseBrushPercent(), 0.5, 20, 0.5,
        (value) => setEraseBrushPercent(value), "brush"),
    );
  } else if (activeTool === "pen") {
    bar.append(
      createColorControl(t("tool.color"), penColor, (value) => { penColor = value; }, "palette"),
      createRangeControl(t("tool.thickness"), penSizePercent, 0.2, 10, 0.2,
        (value) => { penSizePercent = value; }, "minus"),
    );
  } else if (activeTool === "crop") {
    const hint = document.createElement("span");
    hint.className = "tool-options-hint";
    hint.textContent = t("tool.cropHint");
    const cancel = createToolButton(t("tool.cancel"), cancelCrop);
    cancel.disabled = !cropDraft;
    bar.append(hint, cancel);
  }
  return bar;
}

// The workspace around the canvas: an optional options bar on top, then the
// thin tool rail on the left of the canvas viewport.
export function createToolWorkspace(viewport) {
  const workspace = document.createElement("div");
  workspace.className = "scene-tool-workspace";
  const options = createToolOptions();
  if (options) workspace.append(options);
  const row = document.createElement("div");
  row.className = "scene-tool-row";
  row.append(createToolRail(), viewport);
  workspace.append(row);
  return workspace;
}

// Called for each freshly rendered stage: marks the stage for the active tool's
// cursor and re-draws the crop rectangle if one is pending.
export function decorateToolStage(stage) {
  stage.classList.toggle("tool-pen", activeTool === "pen");
  stage.classList.toggle("tool-crop", activeTool === "crop");
  if (cropDraft) {
    const rect = document.createElement("div");
    rect.className = "tool-crop-rect";
    stage.append(rect);
    positionCropRect(rect);
  }
}

function positionCropRect(rect) {
  if (!cropDraft) return;
  const outputWidth = getSceneOutputWidth();
  const outputHeight = getSceneBackgroundHeight();
  rect.style.left = `${(cropDraft.x / outputWidth) * 100}%`;
  rect.style.top = `${(cropDraft.y / outputHeight) * 100}%`;
  rect.style.width = `${(cropDraft.width / outputWidth) * 100}%`;
  rect.style.height = `${(cropDraft.height / outputHeight) * 100}%`;
}

// The stage is rebuilt by renderScenes (creating a paint layer does that), so
// strokes always look up the live stage rather than holding on to an old one.
function getLiveStage() {
  return document.querySelector(".composite-stage");
}

// Returns true when the press was used by the active tool.
export function handleToolStagePointerDown(event, stage) {
  if (event.button !== 0) return false;
  if (activeTool === "pen") {
    startPenStroke(event);
    return true;
  }
  if (activeTool === "crop") {
    startCropDrag(event);
    return true;
  }
  return false;
}

// ---- Pen ----

function pointOnCanvas(clientX, clientY, canvas) {
  const rect = getLiveStage().getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

async function loadPaintCanvas(scene) {
  const image = await loadImage(scene.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}

// Live preview while drawing: a canvas laid over the paint layer's image, drawn
// from the working canvas after each segment. Removed again when the stroke ends.
function createPenOverlay(scene, canvas) {
  const wrap = document.querySelector(`.scene-image-wrap[data-scene-id="${CSS.escape(scene.id)}"]`);
  if (!wrap) return null;
  const overlay = document.createElement("canvas");
  overlay.className = "scene-erase-canvas tool-pen-canvas";
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  overlay.style.transform = getSceneImageTransform(scene);
  overlay.style.pointerEvents = "none";
  overlay.getContext("2d").drawImage(canvas, 0, 0);
  wrap.append(overlay);
  return overlay;
}

function paintPenSegment(stroke, from, to) {
  const ctx = stroke.canvas.getContext("2d");
  const radius = (penSizePercent / 100) * stroke.canvas.width / 2;
  ctx.save();
  ctx.strokeStyle = penColor;
  ctx.fillStyle = penColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = radius * 2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(to.x, to.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPenOverlay(stroke) {
  if (!stroke.overlay) return;
  const overlay = stroke.overlay;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.drawImage(stroke.canvas, 0, 0);
}

function startPenStroke(event) {
  event.preventDefault();
  event.stopPropagation();
  // Drawing needs a paint layer: reuse the selected one, or start a new one.
  const target = getSelectedPaintScene() || createPaintLayer();
  pushSceneHistory();
  const stroke = {
    scene: target,
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    canvas: null,
    last: null,
    overlay: null,
    ended: false,
  };
  penStroke = stroke;
  window.addEventListener("pointermove", onPenMove);
  window.addEventListener("pointerup", onPenUp);
  window.addEventListener("pointercancel", onPenUp);
  loadPaintCanvas(target).then((canvas) => {
    stroke.canvas = canvas;
    stroke.last = pointOnCanvas(stroke.clientX, stroke.clientY, canvas);
    stroke.overlay = createPenOverlay(target, canvas);
    paintPenSegment(stroke, stroke.last, stroke.last);
    drawPenOverlay(stroke);
    if (stroke.ended) finishPenStroke(stroke);
  }).catch(() => {
    endPenListeners();
    penStroke = null;
    setSceneStatus(t("error.unknown"));
  });
}

function onPenMove(event) {
  const stroke = penStroke;
  if (!stroke || stroke.ended || !stroke.canvas || event.pointerId !== stroke.pointerId) return;
  const point = pointOnCanvas(event.clientX, event.clientY, stroke.canvas);
  paintPenSegment(stroke, stroke.last, point);
  stroke.last = point;
  drawPenOverlay(stroke);
}

function onPenUp(event) {
  const stroke = penStroke;
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  stroke.ended = true;
  if (stroke.canvas) finishPenStroke(stroke);
}

function endPenListeners() {
  window.removeEventListener("pointermove", onPenMove);
  window.removeEventListener("pointerup", onPenUp);
  window.removeEventListener("pointercancel", onPenUp);
}

function finishPenStroke(stroke) {
  endPenListeners();
  penStroke = null;
  if (stroke.overlay) stroke.overlay.remove();
  const { scene, canvas } = stroke;
  scene.dataUrl = canvas.toDataURL("image/png");
  document.querySelectorAll(`[data-scene-image-id="${CSS.escape(scene.id)}"]`).forEach((image) => {
    image.src = scene.dataUrl;
  });
  scheduleSceneAutosave();
}

// ---- Crop ----

// Pointer position in output px, clamped to the output.
function outputPointAt(clientX, clientY) {
  const stage = getLiveStage();
  const rect = stage.getBoundingClientRect();
  const outputWidth = getSceneOutputWidth();
  const outputHeight = getSceneBackgroundHeight();
  return {
    x: Math.min(outputWidth, Math.max(0, ((clientX - rect.left) / rect.width) * outputWidth)),
    y: Math.min(outputHeight, Math.max(0, ((clientY - rect.top) / rect.height) * outputHeight)),
  };
}

function startCropDrag(event) {
  event.preventDefault();
  event.stopPropagation();
  cropDrag = { start: outputPointAt(event.clientX, event.clientY), pointerId: event.pointerId };
  cropReady = false;
  cropDraft = { x: cropDrag.start.x, y: cropDrag.start.y, width: 0, height: 0 };
  window.addEventListener("pointermove", onCropMove);
  window.addEventListener("pointerup", onCropUp);
  window.addEventListener("pointercancel", onCropUp);
}

function onCropMove(event) {
  if (!cropDrag || event.pointerId !== cropDrag.pointerId) return;
  const now = outputPointAt(event.clientX, event.clientY);
  const { start } = cropDrag;
  cropDraft = {
    x: Math.min(start.x, now.x),
    y: Math.min(start.y, now.y),
    width: Math.abs(now.x - start.x),
    height: Math.abs(now.y - start.y),
  };
  const rect = document.querySelector(".tool-crop-rect");
  if (rect) positionCropRect(rect);
}

function onCropUp(event) {
  if (!cropDrag || event.pointerId !== cropDrag.pointerId) return;
  window.removeEventListener("pointermove", onCropMove);
  window.removeEventListener("pointerup", onCropUp);
  window.removeEventListener("pointercancel", onCropUp);
  cropDrag = null;
  cropReady = Boolean(cropDraft && cropDraft.width >= 2 && cropDraft.height >= 2);
  if (!cropReady) cropDraft = null;
  renderScenes();
}

function cancelCrop() {
  clearCropSelection();
}

// Drops the crop rectangle once it has been cut or kept, or cancelled.
export function clearCropSelection() {
  cropDraft = null;
  cropReady = false;
  renderScenes();
}
