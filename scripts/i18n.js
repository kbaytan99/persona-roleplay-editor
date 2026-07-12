"use strict";

// Lightweight, no-build i18n: a flat key -> {tr, en} dictionary plus a
// t(key, vars) lookup and a data-i18n-* attribute walker for static HTML.
// Language choice persists in localStorage; falls back to browser locale
// on first visit (navigator.language starting with "tr" -> tr, else en).

const STORAGE_KEY = "personaLanguage";

const tr = {
  "app.title": "Persona",
  "app.subtitle": "Tek canvas üzerinde sahne, resim ve rol yazısı düzenleyici",
  "app.docTitle": "Persona",

  "menu.file": "Dosya",
  "menu.edit": "Düzen",
  "menu.scene": "Sahne",
  "menu.settings": "Ayarlar",
  "menu.view": "Görünüm",
  "menu.help": "Yardım",

  "file.downloadPng": "Tek PNG indir",
  "file.uploadImgbb": "Yükle ve BBCode kopyala",
  "file.exportRse": "RSE indir",
  "file.importRse": "RSE yükle",

  "edit.undo": "Geri al",
  "edit.redo": "İleri al",
  "edit.copy": "Kopyala",
  "edit.cut": "Kes",
  "edit.paste": "Yapıştır",
  "edit.duplicate": "Çoğalt",
  "edit.selectAll": "Tümünü seç",
  "edit.delete": "Sil",

  "scene.blank": "Boş sahne",
  "scene.addImage": "Resim ekle",
  "scene.addImageHint": "Resim seç veya panodaki görseli Ctrl+V ile yapıştır.",
  "scene.clearAll": "Sahneleri sil",

  "settings.outputWidth": "Çıktı genişliği",
  "settings.backgroundHeight": "Arka plan yüksekliği",
  "settings.fontSize": "Sahne fontu",
  "settings.padding": "Sahne boşluk",
  "settings.transitionSize": "Geçiş boyutu",
  "settings.transitionStyle": "Geçiş filtresi",
  "settings.transitionStyleSoft": "Soft fade",
  "settings.transitionStyleCinematic": "Sinematik kararma",
  "settings.transitionStyleBlur": "Blur geçiş",
  "settings.transitionStyleNone": "Keskin",
  "settings.transitionSides": "Geçiş yönü",
  "settings.transitionSidesBoth": "Her iki taraf (Üst & Alt)",
  "settings.transitionSidesTop": "Sadece Üst (Başlangıç)",
  "settings.transitionSidesBottom": "Sadece Alt (Bitiş)",
  "settings.transitionHint": "Geçiş ayarları değiştikçe tüm katmanlara otomatik uygulanır.",
  "settings.language": "Dil",
  "settings.languageTr": "Türkçe",
  "settings.languageEn": "İngilizce",

  "view.toggleLayers": "Katman panelini göster/gizle",
  "view.zoomFit": "Sığdır",
  "view.zoomIn": "Yakınlaştır",
  "view.zoomOut": "Uzaklaştır",

  "help.toggleShortcuts": "Kısayolları göster/gizle",
  "about.version": "Sürüm {version}",
  "about.changelogTitle": "Son güncellemeler",
  "about.pagerPrev": "Daha yeni",
  "about.pagerNext": "Daha eski",
  "about.pagerPage": "{page} / {total}",

  "shortcuts.title": "Kısayollar",
  "shortcuts.close": "Kapat",
  "shortcuts.groupEdit": "Düzenleme",
  "shortcuts.groupView": "Görünüm",
  "shortcuts.scroll": "Kaydır",
  "shortcuts.dragKey": "Sürükle",
  "shortcuts.edgeKey": "Kenar",
  "shortcuts.canvas": "Canvas",
  "shortcuts.snapOff": "Snap kapat",
  "shortcuts.altUpDown": "Yukarı/Aşağı",
  "shortcuts.order": "Sıra",
  "shortcuts.layerPanel": "Katman paneli",

  "section.position": "Pozisyon",
  "section.filters": "Filtreler",
  "section.transition": "Geçiş efekti",
  "control.size": "Boyut",
  "control.width": "Genişlik",
  "control.height": "Yükseklik",
  "control.x": "X",
  "control.y": "Y",
  "control.brightness": "Parlaklık",
  "control.contrast": "Kontrast",
  "control.saturation": "Doygunluk",
  "control.warmth": "Sıcaklık",
  "control.blur": "Blur",
  "control.reset": "Sıfırla",
  "control.style": "Stil",
  "control.direction": "Yön",

  "textStyle.box": "★ Siyah kutu",
  "textStyle.soft": "★ Soft gölge",
  "textStyle.outline": "Kontur",
  "textStyle.plain": "Efektsiz",
  "textStyle.boxSoft": "Yarı saydam kutu",
  "textStyle.outlineThick": "Kalın kontur",
  "textStyle.neon": "Neon parlama",

  "transitionShort.soft": "Soft fade",
  "transitionShort.cinematic": "Sinematik",
  "transitionShort.blur": "Blur geçiş",
  "transitionShort.none": "Keskin",
  "sideShort.both": "Üst & Alt",
  "sideShort.top": "Sadece Üst",
  "sideShort.bottom": "Sadece Alt",

  "layer.dragMove": "Sürükleyerek taşı",
  "layer.managerTitle": "Katman Yöneticisi",
  "layer.addTextShort": "Yazı ekle",
  "layer.addText": "Yeni yazı katmanı ekle",
  "layer.closeManager": "Katman yöneticisini kapat",
  "layer.emptyCanvas": "Boş canvas hazır. Resim ekle veya boş sahne oluştur.",
  "layer.dragReorder": "Sürükleyerek sahne sırasını değiştir",
  "layer.textBadge": "T",
  "layer.textBadgeTitle": "Yazı katmanı",
  "layer.imageBadgeTitle": "Resim katmanı",
  "layer.namePlaceholder": "Katman adı",
  "layer.nameLockedTitle": "Kilitli katman yeniden adlandırılamaz",
  "layer.nameTitle": "Katman ismi",
  "layer.collapse": "Daralt",
  "layer.expand": "Genişlet",
  "layer.unlock": "Kilidi aç",
  "layer.lock": "Kilitle",
  "layer.removeLockedTitle": "Kilitli katman silinemez",
  "layer.removeTitle": "Katmanı sil",
  "layer.emptyTextPreview": "Boş yazı katmanı",
  "layer.sizePreview": "Boyut %{value}",
  "layer.emptyLayerPreview": "Boş katman",
  "layer.orderTop": "En üst",
  "layer.orderUp": "Üste",
  "layer.orderDown": "Alta",
  "layer.orderBottom": "En alt",
  "layer.blankNote": "Boş katman. Yazı ekleyebilirsin.",
  "layer.fontSizeTitle": "Bu yazının font boyutu",
  "layer.styleTitle": "Bu yazının arka plan/efekt stili",
  "layer.textPlaceholder": "Bu yazıyı sahneye ekle...",
  "layer.defaultName": "Katman {n}",

  "canvas.zoomReadout": "%{value}",
  "canvas.summaryMulti": "{count} katman - tek sahne / tek PNG",
  "canvas.summaryEmpty": "Boş sahne - tek PNG",
  "canvas.blockLocked": "Katman kilitli",
  "canvas.blockDrag": "Sürükleyerek konumlandır",
  "canvas.emptyDragText": "Yazıyı buraya sürükleyebilirsin",
  "canvas.imageDragTitle": "Resmi taşımak için sürükle; köşeden orantılı, kenardan yatay/dikey esnet",
  "canvas.resizeFrameTitle": "Siyah canvas alanını kenardan veya köşeden büyüt/küçült",
  "canvas.sizeBadge": "{width} x {height}",
  "canvas.resizeWidthOnly": "Genişliği ayarla",
  "canvas.resizeHeightOnly": "Yüksekliği ayarla",
  "canvas.resizeBoth": "Genişlik ve yüksekliği ayarla",
  "canvas.panelResizeTitle": "Panel boyutunu ayarla",

  "confirm.deleteScene": "Sahne {n} silinsin mi? Bu işlem sadece bu sahneyi kaldırır.",
  "confirm.deleteSelected": "Seçili {count} sahne silinsin mi?",
  "confirm.clearAll": "Tüm sahneler silinsin mi?",
  "confirm.overwriteRse": "Mevcut sahne projesi RSE dosyası ile değiştirilsin mi?",

  "status.localSaveFailed": "Sahne lokal kaydedilemedi.",
  "status.pngDownloadFailed": "PNG indirilemedi: {error}",
  "status.layersSelected": "{count} katman seçildi.",
  "status.noImageSelected": "Resim dosyası seçilmedi.",
  "status.imagesAdded": "{count} katman eklendi. Hepsi aynı sahne canvasında.",
  "status.blankSceneAdded": "Boş sahne katmanı eklendi. Yazıyı elle ekleyebilirsin.",
  "status.lockedCannotDelete": "Kilitli katman silinemez, önce kilidi aç.",
  "status.sceneDeleted": "Sahne silindi.",
  "status.lockedLayersCannotDelete": "Kilitli katman(lar) silinemez, önce kilidi aç.",
  "status.noSceneToCopy": "Kopyalanacak sahne yok.",
  "status.scenesCopied": "{count} sahne kopyalandı. Ctrl+V ile yapıştır.",
  "status.noSceneToCut": "Kesilecek sahne yok.",
  "status.lockedCannotCut": "Kilitli katman(lar) kesilemez, önce kilidi aç.",
  "status.scenesDeletedWithLocked": "{count} sahne silindi ({lockedCount} kilitli katman atlandı).",
  "status.scenesDeletedPlain": "{count} sahne silindi.",
  "status.scenesCutWithLocked": "{count} sahne kesildi ({lockedCount} kilitli katman atlandı). Ctrl+V ile yapıştır.",
  "status.scenesCutPlain": "{count} sahne kesildi. Ctrl+V ile yapıştır.",
  "status.allScenesDeletedWithLocked": "Sahneler silindi ({lockedCount} kilitli katman atlandı).",
  "status.allScenesDeletedPlain": "Tüm sahneler silindi.",
  "status.scenesPasted": "{count} sahne yapıştırıldı.",
  "status.noLayerToDuplicate": "Çoğaltılacak katman yok.",
  "status.layersDuplicated": "{count} katman çoğaltıldı.",
  "status.rseNeedsScene": "RSE için önce en az bir sahne/katman oluştur.",
  "status.rseExported": "RSE indirildi: {count} katman kaydedildi.",
  "status.rseInvalidFile": "RSE yüklenemedi: dosya bu programa ait değil.",
  "status.rseImported": "RSE yüklendi: {count} katman geri getirildi.",
  "status.rseImportFailed": "RSE yüklenemedi: {error}.",
  "status.scenesSelected": "{count} sahne seçildi.",
  "status.noUndoAction": "Geri alınacak işlem yok.",
  "status.noRedoAction": "İleri alınacak işlem yok.",
  "status.sceneMovedTop": "Sahne en üste taşındı.",
  "status.sceneMovedUp": "Sahne üste taşındı.",
  "status.sceneMovedDown": "Sahne alta taşındı.",
  "status.sceneMovedBottom": "Sahne en alta taşındı.",
  "status.filterReset": "Sahne filtresi sıfırlandı.",
  "status.textLayerAdded": "Yeni yazı katmanı eklendi.",
  "status.canvasResized": "Canvas {width} x {height} olarak ayarlandı.",
  "status.pngDownloaded": "Tek PNG indirildi.",
  "status.imgbbInProgress": "ImgBB yüklemesi zaten devam ediyor...",
  "status.imgbbUploading": "ImgBB'ye yükleniyor...",
  "status.imgbbUploadedCopied": "Yüklendi, BBCode panoya kopyalandı.",
  "status.imgbbUploadedNoCopy": "Yüklendi ama panoya kopyalanamadı: {bbcode}",
  "status.imgbbUploadFailed": "Yükleme başarısız: {error}",
  "status.transitionApplied": "Geçiş ayarları tüm katmanlara uygulandı.",
  "status.localLoadFailed": "Lokal sahneler yüklenemedi.",

  "error.unknown": "Bilinmeyen hata.",
  "error.imgbbUnexpectedHost": "ImgBB beklenmeyen bir alan adında görsel adresi döndürdü.",
  "error.imgbbSizeLimit": "PNG 32 MB ImgBB sınırını aşıyor; canvas boyutunu veya katmanları küçült.",
  "error.imgbbInvalidResponse": "ImgBB geçersiz yanıt verdi.",
  "error.serverError": "Sunucu hatası ({status})",
  "error.clipboardTimeout": "Panoya yazma zaman aşımına uğradı.",
  "error.imgbbTimeout": "ImgBB isteği zaman aşımına uğradı; yeniden deneyebilirsin.",
};

const en = {
  "app.title": "Persona",
  "app.subtitle": "Single-canvas scene, image and roleplay text editor",
  "app.docTitle": "Persona",

  "menu.file": "File",
  "menu.edit": "Edit",
  "menu.scene": "Scene",
  "menu.settings": "Settings",
  "menu.view": "View",
  "menu.help": "Help",

  "file.downloadPng": "Download single PNG",
  "file.uploadImgbb": "Upload and copy BBCode",
  "file.exportRse": "Download RSE",
  "file.importRse": "Upload RSE",

  "edit.undo": "Undo",
  "edit.redo": "Redo",
  "edit.copy": "Copy",
  "edit.cut": "Cut",
  "edit.paste": "Paste",
  "edit.duplicate": "Duplicate",
  "edit.selectAll": "Select all",
  "edit.delete": "Delete",

  "scene.blank": "Blank scene",
  "scene.addImage": "Add image",
  "scene.addImageHint": "Pick an image or paste one from the clipboard with Ctrl+V.",
  "scene.clearAll": "Clear scenes",

  "settings.outputWidth": "Output width",
  "settings.backgroundHeight": "Background height",
  "settings.fontSize": "Scene font size",
  "settings.padding": "Scene padding",
  "settings.transitionSize": "Transition size",
  "settings.transitionStyle": "Transition filter",
  "settings.transitionStyleSoft": "Soft fade",
  "settings.transitionStyleCinematic": "Cinematic fade",
  "settings.transitionStyleBlur": "Blur transition",
  "settings.transitionStyleNone": "Sharp",
  "settings.transitionSides": "Transition side",
  "settings.transitionSidesBoth": "Both sides (Top & Bottom)",
  "settings.transitionSidesTop": "Top only (Start)",
  "settings.transitionSidesBottom": "Bottom only (End)",
  "settings.transitionHint": "Transition settings apply to all layers automatically as they change.",
  "settings.language": "Language",
  "settings.languageTr": "Turkish",
  "settings.languageEn": "English",

  "view.toggleLayers": "Show/hide layer panel",
  "view.zoomFit": "Fit",
  "view.zoomIn": "Zoom in",
  "view.zoomOut": "Zoom out",

  "help.toggleShortcuts": "Show/hide shortcuts",
  "about.version": "Version {version}",
  "about.changelogTitle": "Recent updates",
  "about.pagerPrev": "Newer",
  "about.pagerNext": "Older",
  "about.pagerPage": "{page} / {total}",

  "shortcuts.title": "Shortcuts",
  "shortcuts.close": "Close",
  "shortcuts.groupEdit": "Editing",
  "shortcuts.groupView": "View",
  "shortcuts.scroll": "Pan",
  "shortcuts.dragKey": "Drag",
  "shortcuts.edgeKey": "Edge",
  "shortcuts.canvas": "Canvas",
  "shortcuts.snapOff": "Snap off",
  "shortcuts.altUpDown": "Up/Down",
  "shortcuts.order": "Order",
  "shortcuts.layerPanel": "Layer panel",

  "section.position": "Position",
  "section.filters": "Filters",
  "section.transition": "Transition effect",
  "control.size": "Size",
  "control.width": "Width",
  "control.height": "Height",
  "control.x": "X",
  "control.y": "Y",
  "control.brightness": "Brightness",
  "control.contrast": "Contrast",
  "control.saturation": "Saturation",
  "control.warmth": "Warmth",
  "control.blur": "Blur",
  "control.reset": "Reset",
  "control.style": "Style",
  "control.direction": "Direction",

  "textStyle.box": "★ Black box",
  "textStyle.soft": "★ Soft shadow",
  "textStyle.outline": "Outline",
  "textStyle.plain": "Plain",
  "textStyle.boxSoft": "Translucent box",
  "textStyle.outlineThick": "Thick outline",
  "textStyle.neon": "Neon glow",

  "transitionShort.soft": "Soft fade",
  "transitionShort.cinematic": "Cinematic",
  "transitionShort.blur": "Blur transition",
  "transitionShort.none": "Sharp",
  "sideShort.both": "Top & Bottom",
  "sideShort.top": "Top only",
  "sideShort.bottom": "Bottom only",

  "layer.dragMove": "Drag to move",
  "layer.managerTitle": "Layer Manager",
  "layer.addTextShort": "Add text",
  "layer.addText": "Add new text layer",
  "layer.closeManager": "Close layer manager",
  "layer.emptyCanvas": "Empty canvas ready. Add an image or create a blank scene.",
  "layer.dragReorder": "Drag to reorder scenes",
  "layer.textBadge": "T",
  "layer.textBadgeTitle": "Text layer",
  "layer.imageBadgeTitle": "Image layer",
  "layer.namePlaceholder": "Layer name",
  "layer.nameLockedTitle": "Locked layer can't be renamed",
  "layer.nameTitle": "Layer name",
  "layer.collapse": "Collapse",
  "layer.expand": "Expand",
  "layer.unlock": "Unlock",
  "layer.lock": "Lock",
  "layer.removeLockedTitle": "Locked layer can't be deleted",
  "layer.removeTitle": "Delete layer",
  "layer.emptyTextPreview": "Empty text layer",
  "layer.sizePreview": "Size %{value}",
  "layer.emptyLayerPreview": "Empty layer",
  "layer.orderTop": "Top",
  "layer.orderUp": "Up",
  "layer.orderDown": "Down",
  "layer.orderBottom": "Bottom",
  "layer.blankNote": "Blank layer. You can add text.",
  "layer.fontSizeTitle": "This text's font size",
  "layer.styleTitle": "This text's background/effect style",
  "layer.textPlaceholder": "Add this text to the scene...",
  "layer.defaultName": "Layer {n}",

  "canvas.zoomReadout": "{value}%",
  "canvas.summaryMulti": "{count} layers - single scene / single PNG",
  "canvas.summaryEmpty": "Empty scene - single PNG",
  "canvas.blockLocked": "Layer locked",
  "canvas.blockDrag": "Drag to position",
  "canvas.emptyDragText": "You can drag text here",
  "canvas.imageDragTitle": "Drag to move the image; corners scale proportionally, edges stretch horizontally/vertically",
  "canvas.resizeFrameTitle": "Grow/shrink the black canvas area from an edge or corner",
  "canvas.sizeBadge": "{width} x {height}",
  "canvas.resizeWidthOnly": "Adjust width",
  "canvas.resizeHeightOnly": "Adjust height",
  "canvas.resizeBoth": "Adjust width and height",
  "canvas.panelResizeTitle": "Adjust panel size",

  "confirm.deleteScene": "Delete scene {n}? This only removes this scene.",
  "confirm.deleteSelected": "Delete {count} selected scenes?",
  "confirm.clearAll": "Delete all scenes?",
  "confirm.overwriteRse": "Replace the current scene project with this RSE file?",

  "status.localSaveFailed": "Scene couldn't be saved locally.",
  "status.pngDownloadFailed": "PNG couldn't be downloaded: {error}",
  "status.layersSelected": "{count} layer(s) selected.",
  "status.noImageSelected": "No image file selected.",
  "status.imagesAdded": "{count} layer(s) added. All in the same scene canvas.",
  "status.blankSceneAdded": "Blank scene layer added. You can add text manually.",
  "status.lockedCannotDelete": "Locked layer can't be deleted, unlock it first.",
  "status.sceneDeleted": "Scene deleted.",
  "status.lockedLayersCannotDelete": "Locked layer(s) can't be deleted, unlock them first.",
  "status.noSceneToCopy": "No scene to copy.",
  "status.scenesCopied": "{count} scene(s) copied. Paste with Ctrl+V.",
  "status.noSceneToCut": "No scene to cut.",
  "status.lockedCannotCut": "Locked layer(s) can't be cut, unlock them first.",
  "status.scenesDeletedWithLocked": "{count} scene(s) deleted ({lockedCount} locked layer(s) skipped).",
  "status.scenesDeletedPlain": "{count} scene(s) deleted.",
  "status.scenesCutWithLocked": "{count} scene(s) cut ({lockedCount} locked layer(s) skipped). Paste with Ctrl+V.",
  "status.scenesCutPlain": "{count} scene(s) cut. Paste with Ctrl+V.",
  "status.allScenesDeletedWithLocked": "Scenes deleted ({lockedCount} locked layer(s) skipped).",
  "status.allScenesDeletedPlain": "All scenes deleted.",
  "status.scenesPasted": "{count} scene(s) pasted.",
  "status.noLayerToDuplicate": "No layer to duplicate.",
  "status.layersDuplicated": "{count} layer(s) duplicated.",
  "status.rseNeedsScene": "Create at least one scene/layer before exporting RSE.",
  "status.rseExported": "RSE downloaded: {count} layer(s) saved.",
  "status.rseInvalidFile": "RSE couldn't be loaded: file doesn't belong to this app.",
  "status.rseImported": "RSE loaded: {count} layer(s) restored.",
  "status.rseImportFailed": "RSE couldn't be loaded: {error}.",
  "status.scenesSelected": "{count} scene(s) selected.",
  "status.noUndoAction": "Nothing to undo.",
  "status.noRedoAction": "Nothing to redo.",
  "status.sceneMovedTop": "Scene moved to the top.",
  "status.sceneMovedUp": "Scene moved up.",
  "status.sceneMovedDown": "Scene moved down.",
  "status.sceneMovedBottom": "Scene moved to the bottom.",
  "status.filterReset": "Scene filter reset.",
  "status.textLayerAdded": "New text layer added.",
  "status.canvasResized": "Canvas set to {width} x {height}.",
  "status.pngDownloaded": "Single PNG downloaded.",
  "status.imgbbInProgress": "ImgBB upload already in progress...",
  "status.imgbbUploading": "Uploading to ImgBB...",
  "status.imgbbUploadedCopied": "Uploaded, BBCode copied to clipboard.",
  "status.imgbbUploadedNoCopy": "Uploaded but couldn't copy to clipboard: {bbcode}",
  "status.imgbbUploadFailed": "Upload failed: {error}",
  "status.transitionApplied": "Transition settings applied to all layers.",
  "status.localLoadFailed": "Local scenes couldn't be loaded.",

  "error.unknown": "Unknown error.",
  "error.imgbbUnexpectedHost": "ImgBB returned an image URL on an unexpected host.",
  "error.imgbbSizeLimit": "PNG exceeds the 32 MB ImgBB limit; shrink the canvas size or layers.",
  "error.imgbbInvalidResponse": "ImgBB returned an invalid response.",
  "error.serverError": "Server error ({status})",
  "error.clipboardTimeout": "Writing to the clipboard timed out.",
  "error.imgbbTimeout": "The ImgBB request timed out; you can try again.",
};

const dictionaries = { tr, en };

let currentLanguage = null;
const changeListeners = new Set();

function detectBrowserLanguage() {
  const nav = (navigator.language || navigator.userLanguage || "tr").toLowerCase();
  return nav.startsWith("tr") ? "tr" : "en";
}

export function getLanguage() {
  if (!currentLanguage) {
    currentLanguage = dictionaries[localStorage.getItem(STORAGE_KEY)]
      ? localStorage.getItem(STORAGE_KEY)
      : detectBrowserLanguage();
  }
  return currentLanguage;
}

export function setLanguage(lang) {
  const next = dictionaries[lang] ? lang : "tr";
  if (next === currentLanguage) return;
  currentLanguage = next;
  localStorage.setItem(STORAGE_KEY, next);
  changeListeners.forEach((listener) => listener(next));
}

export function onLanguageChange(listener) {
  changeListeners.add(listener);
}

export function t(key, vars) {
  const dict = dictionaries[getLanguage()] || dictionaries.tr;
  let text = dict[key] ?? dictionaries.tr[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

// Walks data-i18n / data-i18n-title / data-i18n-placeholder attributes on
// static index.html markup and fills them in with the active language.
// JS-generated dynamic UI (layer cards, status messages, etc.) calls t()
// directly at render time instead, since it's rebuilt on every change.
export function translateStaticDom(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.title = t("app.docTitle");
  // CSS text-transform: uppercase respects the document's lang for
  // Turkish-specific casing (dotless i <-> dotted I); leaving lang="tr"
  // while showing English text turns "single" into "SİNGLE".
  document.documentElement.lang = getLanguage();
}
