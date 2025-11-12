const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;

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
  await initializeDataFiles(); //INICIALIZA DATOS PARA TEST ****

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

// Inicializar archivos de datos con la nueva estructura
async function initializeDataFiles() {
  const defaultFiles = {
    "profiles.json": {
      locales: [
        {
          id: "boulevard-maritimo",
          nombre: "Boulevard Marítimo",
          ubicacion: "Av. Costanera 123",
          perfiles: {
            cajero: [],
            administrativo: [],
          },
        },
        {
          id: "photostation",
          nombre: "PhotoStation",
          ubicacion: "Calle Imagen 456",
          perfiles: {
            cajero: [],
            administrativo: [],
          },
        },
      ],
      gerencia: [],
    },
    "products.json": [],
    "orders.json": [],
    "categories.json": [],
    "config.json": {
      storeName: "Mi Negocio",
      currency: "ARS",
      taxRate: 0,
      createdAt: new Date().toISOString(),
      lastOrderNumber: 0,
    },
    "cash_register.json": { sessions: [] },
    "active_sessions.json": {},
    "authorizations.json": [],
  };

  for (const [filename, data] of Object.entries(defaultFiles)) {
    const file = path.join(DATA_DIR, filename);
    try {
      await fs.access(file);
      console.log(`✅ Archivo existente: ${filename}`);
    } catch {
      await fs.writeFile(file, JSON.stringify(data, null, 2));
      console.log(`✅ Archivo creado: ${filename}`);
    }
  }
}

// ==============================
// IPC PARA LECTURA/ESCRITURA
// ==============================
ipcMain.handle("read-json", async (_, filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error leyendo ${filename}:`, err.message);
    return null;
  }
});

ipcMain.handle("write-json", async (_, filename, data) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Archivo guardado: ${filename}`);
    return true;
  } catch (err) {
    console.error(`Error escribiendo ${filename}:`, err.message);
    return false;
  }
});

ipcMain.handle("save-excel-report", async (_, filename, buffer) => {
  try {
    const filePath = path.join(REPORTES_DIR, filename);
    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`✅ Reporte guardado: ${filename}`);
    return { success: true, path: filePath };
  } catch (err) {
    console.error(`Error guardando reporte ${filename}:`, err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("list-files", async (_, directory) => {
  try {
    const dirPath = directory === "reportes" ? REPORTES_DIR : DATA_DIR;
    return await fs.readdir(dirPath);
  } catch (err) {
    console.error("Error listando archivos:", err.message);
    return [];
  }
});

ipcMain.handle("delete-file", async (_, filename, directory) => {
  try {
    const dirPath = directory === "reportes" ? REPORTES_DIR : DATA_DIR;
    await fs.unlink(path.join(dirPath, filename));
    console.log(`✅ Archivo eliminado: ${filename}`);
    return true;
  } catch (err) {
    console.error(`Error eliminando ${filename}:`, err.message);
    return false;
  }
});

// ==============================
// IPC PARA IMPRESORAS
// ==============================
// ipcMain.handle("get-printers", async () => {
//   try {
//     const { webContents } = mainWindow;
//     const printers = await webContents.getPrintersAsync();
//     return printers;
//   } catch (err) {
//     console.error("Error obteniendo impresoras:", err.message);
//     return [];
//   }
// });

// ipcMain.handle("print-ticket", async (_, ticketData) => {
//   try {
//     // Aquí puedes implementar la lógica de impresión térmica
//     // Por ahora solo simularemos la impresión
//     console.log("🖨️ Imprimiendo ticket:", ticketData);
//     return { success: true };
//   } catch (err) {
//     console.error("Error imprimiendo ticket:", err.message);
//     return { success: false, error: err.message };
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
