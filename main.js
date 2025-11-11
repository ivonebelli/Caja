const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

// Rutas de datos
const DATA_DIR = path.join(__dirname, 'data');
const REPORTES_DIR = path.join(__dirname, 'reportes');

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicializar aplicación
app.whenReady().then(async () => {
  await ensureDirectories();
  // Se ELIMINA la llamada a initializeDataFiles(); porque la lógica de datos ahora es MariaDB
  createWindow();

  console.log('============================================');
  console.log('📁 UBICACIÓN DE DATOS (Solo config.json):');
  console.log('📂 Data:', DATA_DIR);
  console.log('📊 Reportes:', REPORTES_DIR);
  console.log('🔧 Modo:', process.env.NODE_ENV || 'Desarrollo');
  console.log('📦 Ejecutable:', process.execPath);
  console.log('============================================');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// Asegurar carpetas
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(REPORTES_DIR, { recursive: true });
}

// ----------------------------------------------------
// IPC PARA LECTURA/ESCRITURA - DEBE ESTAR EN server.js
// ----------------------------------------------------

// Los ipcMain.handle para 'read-json', 'write-json', etc. ahora son responsabilidad del server.js
// La aplicación de Electron (el frontend) debe usar las rutas /api/data/:filename del servidor
// En un sistema Electron/Node.js, el IPC del main.js NO debe manejar la lógica de datos
// si existe un servidor express. Mantenemos las funciones de impresión y sistema de archivos.

ipcMain.handle('read-json', async (_, filename) => {
  console.error('❌ ADVERTENCIA: La lectura de JSON debe hacerse a través del servidor Express (MariaDB).');
  // Se mantiene solo por compatibilidad de ruta si es necesario leer config.json
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error leyendo ${filename}:`, err.message);
    return null;
  }
});

ipcMain.handle('write-json', async (_, filename, data) => {
  console.error('❌ ADVERTENCIA: La escritura de JSON debe hacerse a través del servidor Express (MariaDB).');
  return false;
});

ipcMain.handle('save-excel-report', async (_, filename, buffer) => {
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

ipcMain.handle('list-files', async (_, directory) => {
  try {
    const dirPath = directory === 'reportes' ? REPORTES_DIR : DATA_DIR;
    return await fs.readdir(dirPath);
  } catch (err) {
    console.error('Error listando archivos:', err.message);
    return [];
  }
});

ipcMain.handle('delete-file', async (_, filename, directory) => {
  try {
    const dirPath = directory === 'reportes' ? REPORTES_DIR : DATA_DIR;
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
ipcMain.handle('get-printers', async () => {
  try {
    const { webContents } = mainWindow;
    const printers = await webContents.getPrintersAsync();
    return printers;
  } catch (err) {
    console.error('Error obteniendo impresoras:', err.message);
    return [];
  }
});

ipcMain.handle('print-ticket', async (_, ticketData) => {
  try {
    // Aquí puedes implementar la lógica de impresión térmica
    console.log('🖨️ Imprimiendo ticket:', ticketData);
    return { success: true };
  } catch (err) {
    console.error('Error imprimiendo ticket:', err.message);
    return { success: false, error: err.message };
  }
});

// ==============================
// MANEJO DE ERRORES
// ==============================
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesa rechazada:', error);
});