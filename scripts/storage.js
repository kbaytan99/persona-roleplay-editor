"use strict";

// Persistence layer: localStorage settings (per-"client" keyed, with legacy
// multi-user migration from an older build that had real user profiles),
// IndexedDB scene autosave, and a separate IndexedDB upload-history log.
// Nothing in here renders anything - callers re-render after loading.

import { t } from "./i18n.js?v=3.19.0";
import {
  appShell,
  sceneOutputWidth,
  sceneBackgroundHeight,
  sceneFontSize,
  scenePadding,
  sceneTransitionSize,
  sceneTransitionStyle,
  sceneTransitionSides,
  sceneCanvasDefaultWidth,
  sceneCanvasDefaultHeight,
  scenes,
  selectedSceneId,
  selectedSceneIds,
  setSceneSelectionRaw,
  normalizeSceneSelection,
  renderScenes,
  createExampleScenes,
  setSceneStatus,
  getSavedLayersWidth,
  getSavedLayersHeight,
  getSavedLayersDock,
  applyLayersDock,
} from "../app.js?v=3.19.0";

export const storageKeys = {
  sceneOutputWidth: "rollSs.sceneOutputWidth",
  sceneBackgroundHeight: "rollSs.sceneBackgroundHeight",
  sceneFontSize: "rollSs.sceneFontSize",
  scenePadding: "rollSs.scenePadding",
  sceneTransitionSize: "rollSs.sceneTransitionSize",
  sceneTransitionStyle: "rollSs.sceneTransitionStyle",
  sceneTransitionSides: "rollSs.sceneTransitionSides",
  layersWidth: "rollSs.layersWidth",
  layersHeight: "rollSs.layersHeight",
  layersDock: "rollSs.layersDock",
  shortcutsHidden: "rollSs.shortcutsHidden",
};
export const localClientId = "local-client";
const legacyUserRegistryKey = "rollSs.users";
const legacyActiveUserKey = "rollSs.activeUser";
export let currentUserId = localClientId;

export function saveState() {
  localStorage.setItem(clientStorageKey(storageKeys.sceneOutputWidth), sceneOutputWidth.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneBackgroundHeight), sceneBackgroundHeight.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneFontSize), sceneFontSize.value);
  localStorage.setItem(clientStorageKey(storageKeys.scenePadding), scenePadding.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionSize), sceneTransitionSize.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionStyle), sceneTransitionStyle.value);
  localStorage.setItem(clientStorageKey(storageKeys.sceneTransitionSides), sceneTransitionSides.value);
}

export function restoreState() {
  migrateLegacyClientStorage();
  const savedSceneWidth = getClientStoredValue(storageKeys.sceneOutputWidth);
  const savedSceneHeight = getClientStoredValue(storageKeys.sceneBackgroundHeight);
  sceneOutputWidth.value = !savedSceneWidth || savedSceneWidth === "1920" ? sceneCanvasDefaultWidth : savedSceneWidth;
  sceneBackgroundHeight.value = !savedSceneHeight || savedSceneHeight === "1080" ? sceneCanvasDefaultHeight : savedSceneHeight;
  sceneFontSize.value = getClientStoredValue(storageKeys.sceneFontSize) ?? sceneFontSize.value;
  scenePadding.value = getClientStoredValue(storageKeys.scenePadding) ?? scenePadding.value;
  sceneTransitionSize.value = getClientStoredValue(storageKeys.sceneTransitionSize) ?? sceneTransitionSize.value;
  sceneTransitionStyle.value = getClientStoredValue(storageKeys.sceneTransitionStyle) ?? sceneTransitionStyle.value;
  sceneTransitionSides.value = getClientStoredValue(storageKeys.sceneTransitionSides) ?? sceneTransitionSides.value;
  appShell.style.setProperty("--layers-width", `${getSavedLayersWidth()}px`);
  appShell.style.setProperty("--layers-height", `${getSavedLayersHeight()}px`);
  applyLayersDock(getSavedLayersDock());
  document.body.classList.toggle("shortcuts-hidden", getClientStoredValue(storageKeys.shortcutsHidden) === "true");
}

export function clientStorageKey(key) {
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

export function getClientStoredValue(key) {
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

export function openSceneDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("roll-ss-editor-scenes", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("states", { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Separate DB from the scene autosave one on purpose - upload history is
// unrelated data (a log of past ImgBB links, kept as a fallback in case
// ImgBB itself goes down) and keeping it isolated means a bug in one never
// risks corrupting or version-migrating the other.
const uploadHistoryLimit = 50;

export function openUploadHistoryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("roll-ss-editor-uploads", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("uploads", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Small (~160px-wide) JPEG thumbnail, not the full composite - at up to 50
// stored entries, keeping each one small matters for IndexedDB/quota use.
// JPEG (not PNG) is fine here since the composite is always drawn onto an
// opaque background, so there's no transparency to preserve, and JPEG
// compresses a photo-like composite far smaller than PNG.
export function createUploadThumbnail(canvas) {
  const scale = Math.min(1, 160 / canvas.width);
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  thumbCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = thumbCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return thumbCanvas.toDataURL("image/jpeg", 0.7);
}

export async function recordUploadHistory(entry) {
  try {
    const db = await openUploadHistoryDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await pruneUploadHistory(db);
    db.close();
  } catch {
    // History is a convenience/backup, not core functionality - a failure
    // here (quota, private browsing, etc.) must never break the upload
    // flow itself.
  }
}

function pruneUploadHistory(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("uploads", "readwrite");
    const store = tx.objectStore("uploads");
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result.sort((a, b) => a - b);
      const excess = keys.length - uploadHistoryLimit;
      for (let i = 0; i < excess; i++) store.delete(keys[i]);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export function readUploadHistory() {
  return new Promise((resolve, reject) => {
    openUploadHistoryDb().then((db) => {
      const tx = db.transaction("uploads", "readonly");
      const request = tx.objectStore("uploads").getAll();
      request.onsuccess = () => {
        resolve(request.result.sort((a, b) => b.id - a.id));
        db.close();
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    }, reject);
  });
}

export async function saveLocalScenesNow() {
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

export async function loadLocalScenes() {
  const db = await openSceneDb();
  let record = await readSceneRecord(db, currentUserId);
  // Only true when NEITHER this user's own record NOR a legacy record
  // exists at all - i.e. this browser has genuinely never saved anything
  // here before. Distinct from "record exists but scenes is empty" (user
  // intentionally cleared everything via Sahneleri sil), which must not
  // be treated as first-time and re-seeded.
  let isFirstEverVisit = false;
  if (!record) {
    record = await readLegacySceneRecord(db);
    if (record) {
      scenes.splice(0, scenes.length, ...((record.scenes || [])));
      const restoredId = record.selectedSceneId || scenes[0]?.id || "";
      const restoredIds = Array.isArray(record.selectedSceneIds) ? record.selectedSceneIds : restoredId ? [restoredId] : [];
      setSceneSelectionRaw(restoredIds, restoredId);
      normalizeSceneSelection();
      await saveLocalScenesNow();
      db.close();
      renderScenes();
      return;
    }
    isFirstEverVisit = true;
  }
  db.close();
  scenes.splice(0, scenes.length, ...((record?.scenes || [])));
  const restoredId = record?.selectedSceneId || scenes[0]?.id || "";
  const restoredIds = Array.isArray(record?.selectedSceneIds) ? record.selectedSceneIds : restoredId ? [restoredId] : [];
  setSceneSelectionRaw(restoredIds, restoredId);
  normalizeSceneSelection();
  if (isFirstEverVisit) {
    scenes.splice(0, scenes.length, ...createExampleScenes());
    setSceneSelectionRaw([], "");
    scheduleSceneAutosave();
  }
  renderScenes();
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

let sceneSaveTimer = 0;

export function scheduleSceneAutosave() {
  clearTimeout(sceneSaveTimer);
  sceneSaveTimer = window.setTimeout(() => {
    saveLocalScenesNow().catch(() => setSceneStatus(t("status.localSaveFailed")));
  }, 450);
}
