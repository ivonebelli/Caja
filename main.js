const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sync_daemon = require("./sync-sync_daemon");
const db = require("./database");
const purge_daemon = require("./purge-daemon");
const userDataPath = app.getPath("userData");
const SQLITE_FILE_PATH = path.join(userDataPath, "local_sales_data.sqlite");
let mainWindow;

let mariadb_credentials = null;
let mariadb_instance = null;
let sqlite_instance = null;

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 800,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

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
    mariadb_instance = await db.connectWithCredentials(credentials); //conexion a mariadb

    // Si la conexión es exitosa, devuelve éxito
    mariadb_credentials = credentials;
    startsync_daemon();
    return { success: true, message: "Conexión exitosa." };
  } catch (error) {
    // Si dbService lanza un error (ej. contraseña incorrecta), lo capturamos
    console.error(error.message);
    return { success: false, error: error.message };
  }
});

function startsync_daemon(local_instance, remote_instance) {
  sync_daemon.setConnections(sqlite_instance, mariadb_instance);
  sync_daemon.startsync_daemon();
}

//STORES ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:get-stores", async (event) => {
  try {
    const stores = await db.getStores(sqlite_instance);
    return { success: true, data: stores.map((store) => store.toJSON()) };
  } catch (error) {
    console.error(error.message);
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
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//PROFILES ES SOLO REMOTO NO LOCAL
ipcMain.handle("db:get-profiles", async (event, store_id) => {
  try {
    const profiles = await db.getProfiles(store_id, sqlite_instance);
    return { success: true, data: profiles.map((profile) => profile.toJSON()) };
  } catch (error) {
    console.error(error.message);
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
    console.error(error.message);
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
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

//PROFILES ES SOLO REMOTO NO LOCAL
ipcMain.handle(
  "db:get-profile-and-daily-inflow-data",
  async (event, profile_id) => {
    try {
      const res = await db.getProfileAndDailyInflowData(
        profile_id,
        sqlite_instance
      );
      return { success: true, data: res };
    } catch (error) {
      console.error(error.message);
      // Este error ahora puede ser "No hay conexión a la base de datos..."
      return { success: false, error: error.message };
    }
  }
);

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
