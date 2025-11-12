const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const db = require("./database");

let mainWindow;

// Rutas de datos
const DATA_DIR = path.join(__dirname, "data");
const REPORTES_DIR = path.join(__dirname, "reportes");

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
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
  await ensureDirectories(); //FUERZA CREACION DIRECTORIOS ***

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// Asegurar carpetas
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(REPORTES_DIR, { recursive: true });
}

// ==============================
// IPC PARA LECTURA/ESCRITURA
// ==============================
ipcMain.handle("db:connect", async (event, credentials) => {
  try {
    console.log(credentials);
    await db.connectWithCredentials(credentials);

    // Si la conexión es exitosa, devuelve éxito
    return { success: true, message: "Conexión exitosa." };
  } catch (error) {
    // Si dbService lanza un error (ej. contraseña incorrecta), lo capturamos
    console.error(error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:get-stores", async (event) => {
  try {
    const stores = await db.getStores();
    return { success: true, data: stores };
  } catch (error) {
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:delete-store", async (event, id) => {
  try {
    const stores = await db.deleteStore(id);
    return { success: true, data: stores };
  } catch (error) {
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:get-profiles", async (event, store_id) => {
  try {
    const profiles = await db.getProfiles(store_id);
    return { success: true, data: profiles };
  } catch (error) {
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:get-profile", async (event, profile_id) => {
  try {
    const profile = await db.getProfile(profile_id);
    return { success: true, data: profile };
  } catch (error) {
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});
ipcMain.handle("db:create-profile", async (event, newProfile) => {
  try {
    const insert_id = await db.createProfile(newProfile);
    return { success: true, insert_id: insert_id };
  } catch (error) {
    console.error(error.message);
    // Este error ahora puede ser "No hay conexión a la base de datos..."
    return { success: false, error: error.message };
  }
});

// FALTA UPDATE/DELETE PROFILE, CAJA Y VENTAS

// ipcMain.handle("read-json", async (_, filename) => {
//   try {
//     const filePath = path.join(DATA_DIR, filename);
//     const data = await fs.readFile(filePath, "utf8");
//     return JSON.parse(data);
//   } catch (err) {
//     console.error(`Error leyendo ${filename}:`, err.message);
//     return null;
//   }
// });

// ipcMain.handle("write-json", async (_, filename, data) => {
//   try {
//     const filePath = path.join(DATA_DIR, filename);
//     await fs.writeFile(filePath, JSON.stringify(data, null, 2));
//     console.log(`✅ Archivo guardado: ${filename}`);
//     return true;
//   } catch (err) {
//     console.error(`Error escribiendo ${filename}:`, err.message);
//     return false;
//   }
// });

// ipcMain.handle("save-excel-report", async (_, filename, buffer) => {
//   try {
//     const filePath = path.join(REPORTES_DIR, filename);
//     await fs.writeFile(filePath, Buffer.from(buffer));
//     console.log(`✅ Reporte guardado: ${filename}`);
//     return { success: true, path: filePath };
//   } catch (err) {
//     console.error(`Error guardando reporte ${filename}:`, err.message);
//     return { success: false, error: err.message };
//   }
// });

// ipcMain.handle("list-files", async (_, directory) => {
//   try {
//     const dirPath = directory === "reportes" ? REPORTES_DIR : DATA_DIR;
//     return await fs.readdir(dirPath);
//   } catch (err) {
//     console.error("Error listando archivos:", err.message);
//     return [];
//   }
// });

// ipcMain.handle("delete-file", async (_, filename, directory) => {
//   try {
//     const dirPath = directory === "reportes" ? REPORTES_DIR : DATA_DIR;
//     await fs.unlink(path.join(dirPath, filename));
//     console.log(`✅ Archivo eliminado: ${filename}`);
//     return true;
//   } catch (err) {
//     console.error(`Error eliminando ${filename}:`, err.message);
//     return false;
//   }
// });

// ==============================
// MANEJO DE ERRORES
// ==============================
process.on("uncaughtException", (error) => {
  console.error("Error no capturado:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Promesa rechazada:", error);
});
