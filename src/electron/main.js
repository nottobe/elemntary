const path = require("path");

const {
  app,
  Menu,
  MenuItem,
  BrowserWindow,
  ipcMain,
  dialog,
} = require("electron");

const contextMenu = require("electron-context-menu");

const AdbWrapper = require("../domain/adb-wrapper.js");
const DeviceService = require("../domain/device-service.js");

// Stop the app launching multiple times during install on Windows
if (require("electron-squirrel-startup")) return app.quit();

contextMenu({ showSaveImageAs: true });

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const menu = Menu.getApplicationMenu();
  const viewMenu = menu.items.filter((m) => m.role === "viewmenu")[0];
  viewMenu.submenu.insert(
    3,
    new MenuItem({
      label: "Take screenshot",
      click: (e) => {
        win.webContents.send("capture-body");
      },
    })
  );

  if (process.env.LOCAL_SERVER) {
    win.loadURL(process.env.LOCAL_SERVER);
  } else {
    win.loadFile("./dist/index.html");
  }

  return win;
};

let win;

app.whenReady().then(() => {
  let deviceService = new DeviceService(new AdbWrapper());

  ipcMain.on("body-captured", (_event, image) => {
    const fs = require("fs");
    fs.writeFile("screenshots/screenshot.png", Buffer.from(image, "base64"), (e) => {});
  });

  ipcMain.handle("getPath", (_event, name) => {
    let localDir;

    if (name === "elemntaryData") {
      localDir = path.resolve(app.getPath("appData"), "elemntary");
    } else {
      localDir = app.getPath(name);
    }

    win.webContents.send("path", localDir);
  });

  ipcMain.handle("dialog:openFile", async (_event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options);

    win.webContents.send("file-selected", canceled ? null : filePaths[0]);

    if (canceled) {
      return;
    } else {
      return filePaths[0];
    }
  });

  ipcMain.handle("selectDirectory", () => {
    dialog
      .showOpenDialog({
        properties: ["openDirectory"],
      })
      .then((data) => {
        if (!data.canceled && data.filePaths.length > 0) {
          win.webContents.send("directory-selected", data.filePaths[0]);
        } else {
          win.webContents.send("directory-selected", null);
        }
      });
  });

  ipcMain.handle("uploadMap", (_event, deviceId, path) => {
    console.log(`ipc: uploadMap: ${deviceId} ${path}`);
    deviceService
      .copyMap(deviceId, path)
      .then(() => {
        win.webContents.send("map-uploaded");
      })
      .catch((err) => {
        win.webContents.send("map-uploaded", err);
      });
  });

  ipcMain.handle("listDevices", () => {
    deviceService.listDevices().then((devices) => {
      win.webContents.send("device-list", devices);
    });
  });

  ipcMain.handle("getFeatures", (_event, deviceId) => {
    deviceService.getFeatures(deviceId).then((features) => {
      win.webContents.send("feature-list", features);
    });
  });

  ipcMain.handle("saveFeatures", (_event, deviceId, features) => {
    let promises = [];

    Object.keys(features).forEach((v, i) => {
      if (features[v]) {
        promises.push(deviceService.enableFeature(deviceId, v));
      } else {
        promises.push(deviceService.disableFeature(deviceId, v));
      }
    });

    if (promises.length) {
      Promise.all(promises).then(() => {
        win.webContents.send("features-saved");
      });
    }
  });

  ipcMain.handle("takeScreenshot", (_event, deviceId) => {
    deviceService.takeScreenshot(deviceId).then((image) => {
      win.webContents.send("screenshot", image);
    });
  });

  ipcMain.handle("getApkInfo", (_event, deviceId) => {
    deviceService.getApkInfo(deviceId).then((info) => {
      win.webContents.send("apk-info", info);
    });
  });

  ipcMain.handle("clearCache", (_event, deviceId) => {
    deviceService.clearCache(deviceId).then(() => {
      win.webContents.send("cache-cleared");
    });
  });

  ipcMain.handle("restartApplication", (_event, deviceId) => {
    deviceService.restartApplication(deviceId).then(() => {
      win.webContents.send("application-restarted");
    });
  });

  ipcMain.handle("reboot", (_event, deviceId) => {
    deviceService.reboot(deviceId).then(() => {
      win.webContents.send("rebooted");
    });
  });

  ipcMain.handle("getWebServerInfo", (_event, deviceId) => {
    deviceService.getWebServerInfo(deviceId).then((info) => {
      win.webContents.send("web-server-info", info);
    });
  });

  ipcMain.handle("startWebServer", (_event, deviceId) => {
    deviceService.startWebServer(deviceId).then((info) => {
      win.webContents.send("web-server-started", info);
    });
  });

  ipcMain.handle("stopWebServer", (_event, deviceId) => {
    deviceService.stopWebServer(deviceId).then((info) => {
      win.webContents.send("web-server-stopped", info);
    });
  });

  ipcMain.handle("getBackupInfo", (_event, deviceId) => {
    deviceService.getBackupInfo(deviceId).then((info) => {
      win.webContents.send("backup-info", info);
    });
  });

  ipcMain.handle("backup", (_event, deviceId) => {
    deviceService.backup(deviceId).then((info) => {
      win.webContents.send("backup", info);
    });
  });

  ipcMain.handle("deleteBackup", (_event, deviceId) => {
    deviceService.deleteBackup(deviceId).then(() => {
      win.webContents.send("backup-deleted");
    });
  });

  ipcMain.handle("downloadBackup", (_event, deviceId, outputDirectory) => {
    deviceService
      .downloadBackup(deviceId, outputDirectory)
      .then((localPath) => {
        win.webContents.send("backup-downloaded", localPath);
      });
  });

  ipcMain.handle("uploadBackup", (_event, deviceId, localPath) => {
    deviceService.uploadBackup(deviceId, localPath).then(() => {
      win.webContents.send("backup-uploaded");
    });
  });

  win = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
