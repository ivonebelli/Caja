const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sync_daemon = require("./sync-daemon");
const db = require("./database");
const url = require("url");
const storage = require("./storage");
const purge_daemon = require("./purge-daemon");
const userDataPath = app.getPath("userData");
const SQLITE_FILE_PATH = path.join(userDataPath, "local_sales_data.sqlite");
let mainWindow;

let mariadb_credentials = null;
let mariadb_instance = null;
let sqlite_instance = null;

let previous_path = path.join(__dirname, "src", "index.html");
let current_path = path.join(__dirname, "src", "index.html");
const PAGES_ROOT = path.join(__dirname, "src");

let activeProfile = {
  role: "cajero",
};

function setLoggedInUser(profile) {
  activeProfile = profile;
}

// Crear ventana principal
function createWindow() {
  console.log(path.join(__dirname, "preload.js"));
  mainWindow = new BrowserWindow({
    width: 700,
    height: 800,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadFile(path.join(PAGES_ROOT, "index.html"));

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Inicializar aplicación
app.whenReady().then(async () => {
  sqlite_instance = await db.connectWithCredentials({
    dialect: "sqlite",
    storage: SQLITE_FILE_PATH,
  });
  createWindow();
  purge_daemon.startPurgeDaemon();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// ==============================
// IPC PARA LECTURA/ESCRITURA
// ==============================
ipcMain.handle("db:connect", async (event, credentials) => {
  try {
    credentials.dialect = "mariadb";
    mariadb_credentials = credentials;
    mariadb_instance = await db.connectWithCredentials(credentials); //conexion a mariadb

    return { success: true, message: "Conexión exitosa." };
  } catch (error) {
    // Modo offline

    return { success: true, error: error.message };
  } finally {
    startsync_daemon(sqlite_instance, mariadb_instance, mariadb_credentials);
  }
});

function startsync_daemon(
  local_instance,
  remote_instance,
  mariadb_credentials
) {
  sync_daemon.setConnections(local_instance, remote_instance);
  sync_daemon.startDaemon(mariadb_credentials);
}

//STORES ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:get-stores", async (event) => {
  try {
    const stores = await db.getStores(sqlite_instance);
    return { success: true, data: stores.map((store) => store.toJSON()) };
  } catch (error) {
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//DELETE ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:delete-store", async (event, id) => {
  try {
    const stores = await db.deleteStore(id, sqlite_instance);
    return { success: true, data: stores };
  } catch (error) {
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//PROFILES ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:get-profiles", async (event, store_id) => {
  try {
    const profiles = await db.getProfiles(store_id, sqlite_instance);
    return { success: true, data: profiles };
  } catch (error) {
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//PROFILES ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:get-profile", async (event, profile_id) => {
  try {
    const profile = await db.getProfile(profile_id, sqlite_instance);
    return { success: true, data: profile.map((profile) => profile.toJSON()) };
  } catch (error) {
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//PROFILES ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:create-profile", async (event, newProfile) => {
  try {
    const insert_id = await db.createProfile(newProfile, sqlite_instance);
    return { success: true, insert_id: insert_id };
  } catch (error) {
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//PROFILES ES SOLO REMOTO NO LOCAL
ipcMain.handle(
  "db:get-profile-and-daily-netflow-data",
  async (event, profile_id) => {
    try {
      const res = await db.getProfileAndDailyNetflowData(
        profile_id,
        sqlite_instance
      );
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("db:create-netflow", async (event, newNetflow) => {
  try {
    const res = await db.createNetflow(newNetflow, sqlite_instance);
    return {
      success: true,
      local_id: res.local_id,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:get-sales", async (event, netflow_id) => {
  try {
    const res = await db.getSales(netflow_id, sqlite_instance);
    return {
      success: true,
      data: res,
    };
  } catch (error) {}
});

ipcMain.on("storage-set-item", (event, { key, value }) => {
  storage.setStoredValue({ key, value });
});

ipcMain.handle("storage-get-item", (event, key) => {
  return storage.getStoredValue(key);
});

ipcMain.handle("navigate-to", async (event, pageName) => {
  const role = activeProfile.role;
  const absolutePath = path.join(PAGES_ROOT, pageName);
  console.log(absolutePath);
  mainWindow.loadURL(absolutePath).catch((error) => {
    console.error(`Failed to load file: ${absolutePath}`, error);
  });

  return true;
  // 1. The Casbin Check: This is the actual enforcement step!
  // const hasPermission = await enforcer.enforce(role, pageName, "load");

  // if (hasPermission) {
  //   // 2. If permitted, the Main Process loads the file securely.
  //   const window = BrowserWindow.fromWebContents(event.sender);
  //   window.loadFile(`path/to/pages/${pageName}`);
  //   return true;
  // } else {
  //   // 3. If denied, access is blocked and redirected.
  //   // ... load 'access_denied.html' instead ...
  //   return false;
  // }
});

// FALTA UPDATE/DELETE PROFILE, CAJA Y VENTAS

// ==============================
// MANEJO DE ERRORES
// ==============================
process.on("uncaughtException", (error) => {
  console.error("Error no capturado:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Promesa rechazada:", error);
});
