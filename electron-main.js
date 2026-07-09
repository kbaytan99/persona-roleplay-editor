"use strict";

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const appRoot = __dirname;

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#090a0d",
    title: "Roll SS Editor",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadFile(path.join(appRoot, "index.html"));
}

function createMenu() {
  const template = [
    {
      label: "Dosya",
      submenu: [
        { role: "quit", label: "Cikis" },
      ],
    },
    {
      label: "Duzen",
      submenu: [
        { role: "undo", label: "Geri al" },
        { role: "redo", label: "Ileri al" },
        { type: "separator" },
        { role: "cut", label: "Kes" },
        { role: "copy", label: "Kopyala" },
        { role: "paste", label: "Yapistir" },
        { role: "selectAll", label: "Tumunu sec" },
      ],
    },
    {
      label: "Gorunum",
      submenu: [
        { role: "reload", label: "Yenile" },
        { role: "resetZoom", label: "Zoom sifirla" },
        { role: "zoomIn", label: "Yaklas" },
        { role: "zoomOut", label: "Uzaklas" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Tam ekran" },
        { role: "toggleDevTools", label: "Gelistirici araclari" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
