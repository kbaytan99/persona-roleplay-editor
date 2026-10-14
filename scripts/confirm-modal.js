"use strict";

// In-app confirm dialog that replaces the browser's confirm(). Resolves to true
// (confirmed) or false (cancelled). With rememberKey, a "don't ask again today"
// checkbox is shown; checking it and confirming skips that dialog for the same
// key until the next calendar day.

import { t } from "./i18n.js?v=3.20.2";

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function skipStorageKey(rememberKey) {
  return `roll-ss-editor.confirmSkip.${rememberKey}`;
}

export function isConfirmSkippedToday(rememberKey) {
  if (!rememberKey) return false;
  try {
    return localStorage.getItem(skipStorageKey(rememberKey)) === todayStamp();
  } catch {
    return false;
  }
}

export function askConfirm({ title = t("modal.sure"), message, confirmLabel = t("modal.delete"), rememberKey = "" }) {
  if (isConfirmSkippedToday(rememberKey)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal-overlay";
    const dialog = document.createElement("div");
    dialog.className = "confirm-modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const heading = document.createElement("h2");
    heading.textContent = title;
    const body = document.createElement("p");
    body.textContent = message;
    dialog.append(heading, body);

    let remember = null;
    if (rememberKey) {
      const label = document.createElement("label");
      label.className = "confirm-modal-remember";
      remember = document.createElement("input");
      remember.type = "checkbox";
      const text = document.createElement("span");
      text.textContent = t("modal.dontAskToday");
      label.append(remember, text);
      dialog.append(label);
    }

    const actions = document.createElement("div");
    actions.className = "confirm-modal-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "layer-mini-btn";
    cancelButton.textContent = t("modal.cancel");
    const okButton = document.createElement("button");
    okButton.type = "button";
    okButton.className = "layer-mini-btn confirm-modal-ok";
    okButton.textContent = confirmLabel;
    actions.append(cancelButton, okButton);
    dialog.append(actions);
    overlay.append(dialog);
    document.body.append(overlay);

    const finish = (confirmed) => {
      if (confirmed && remember?.checked) {
        try {
          localStorage.setItem(skipStorageKey(rememberKey), todayStamp());
        } catch {
          // Storage can be blocked; the dialog just shows again next time.
        }
      }
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve(confirmed);
    };
    // Capture phase, so while the dialog is open the app's own shortcuts
    // (including Delete) don't also fire underneath it.
    const onKey = (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      } else if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      }
    };
    document.addEventListener("keydown", onKey, true);
    cancelButton.addEventListener("click", () => finish(false));
    okButton.addEventListener("click", () => finish(true));
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay) finish(false);
    });
    okButton.focus();
  });
}

// Deleting layers: the question plus the detail line, with the day-long skip.
export function askDeleteConfirm(message) {
  return askConfirm({
    title: t("modal.deleteQuestion"),
    message,
    confirmLabel: t("modal.delete"),
    rememberKey: "delete",
  });
}
