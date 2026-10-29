const { execFile } = require("node:child_process");
const { readFile, stat } = require("node:fs/promises");
const path = require("node:path");
const { promisify } = require("node:util");
const { app, BrowserWindow, clipboard, Menu, shell } = require("electron");

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const APP_NAME = "Relay Chat Demo";
const APP_ID = "dev.dukou.relay-chat-demo";
const execFileAsync = promisify(execFile);
const MAX_CLIPBOARD_FILE_BYTES = 512 * 1024 * 1024;

let mainWindow = null;

app.setName(APP_NAME);
app.setAppUserModelId(APP_ID);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    show: false,
    title: APP_NAME,
    backgroundColor: "#f1efe9",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 15 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith("file:");
    if (!allowed) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  if (DEV_URL) {
    const target = new URL(DEV_URL);
    target.searchParams.set("desktop", "1");
    void mainWindow.loadURL(target.toString());
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      query: { desktop: "1" }
    });
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const usesCommand = process.platform === "darwin" ? input.meta : input.control;
    if (input.type === "keyDown" && usesCommand && input.key.toLowerCase() === "v") {
      event.preventDefault();
      void handlePaste();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function clipboardMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".zip":
      return "application/zip";
    case ".txt":
      return "text/plain";
    case ".htm":
    case ".html":
      return "text/html";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

async function readMacClipboardFilePath() {
  if (process.platform !== "darwin" || !(await clipboard.has("text/uri-list"))) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", [
      "-e",
      "set clipboardFile to the clipboard as «class furl»",
      "-e",
      "return POSIX path of clipboardFile"
    ]);
    const filePath = stdout.trim();
    return filePath || null;
  } catch {
    return null;
  }
}

async function readClipboardFile() {
  const filePath = await readMacClipboardFilePath();
  if (!filePath) return null;

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile() || fileStat.size > MAX_CLIPBOARD_FILE_BYTES) return null;
    const data = await readFile(filePath);
    return {
      name: path.basename(filePath),
      type: clipboardMimeType(filePath),
      data: data.toString("base64")
    };
  } catch {
    return null;
  }
}

async function handlePaste() {
  if (!mainWindow) return;
  const file = await readClipboardFile();
  if (file) {
    mainWindow.webContents.send("dukou:paste-files", [file]);
    return;
  }
  mainWindow.webContents.paste();
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" }
            ]
          }
        ]
      : []),
    {
      label: "编辑",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { label: "粘贴", accelerator: "CmdOrCtrl+V", click: () => void handlePaste() },
        { role: "selectAll" }
      ]
    },
    {
      label: "显示",
      submenu: [
        { role: "reload" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "窗口",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
