const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const REPORTES_DIR = path.join(__dirname, 'reportes');

// Asegurar que existan los directorios
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(REPORTES_DIR, { recursive: true });
    console.log('📁 Directorios verificados');
  } catch (error) {
    console.error('Error creando directorios:', error);
  }
}

// ============================================
// RUTAS DE API
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount 
  });
});

// Sincronización completa (NUEVA RUTA)
app.get('/api/sync', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const allData = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(DATA_DIR, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          allData[file] = JSON.parse(content);
        } catch (err) {
          console.error(`Error leyendo ${file}:`, err);
          // Si el archivo no existe o está corrupto, devolver estructura vacía
          allData[file] = getDefaultStructure(file);
        }
      }
    }
    
    console.log('✅ Sincronización completa enviada');
    res.json(allData);
  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ error: 'Error al sincronizar' });
  }
});

// Función helper para estructuras por defecto
function getDefaultStructure(filename) {
  const defaults = {
    'profiles.json': { locales: [], gerencia: { name: '', pin: '', photo: null, createdAt: null } },
    'products.json': [],
    'categories.json': [],
    'orders.json': [],
    'cash_register.json': {},
    'active_sessions.json': {},
    'authorizations.json': [],
    'change_history.json': [],
    'config.json': {}
  };
  return defaults[filename] || {};
}

// Leer archivo JSON
app.get('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(DATA_DIR, filename);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      console.log(`📖 Leyendo: ${filename}`);
      res.json(JSON.parse(data));
    } catch (err) {
      // Si el archivo no existe, devolver estructura por defecto
      console.log(`⚠️ Archivo no existe, devolviendo estructura por defecto: ${filename}`);
      res.json(getDefaultStructure(filename));
    }
  } catch (error) {
    console.error('Error leyendo archivo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Escribir archivo JSON
app.post('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const data = req.body;
    const filePath = path.join(DATA_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    // Notificar a todos los clientes conectados
    io.emit('data-updated', { filename, data });
    
    console.log(`💾 Guardado: ${filename}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error escribiendo archivo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Guardar reporte Excel
app.post('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { buffer } = req.body;
    const filePath = path.join(REPORTES_DIR, filename);
    
    await fs.writeFile(filePath, Buffer.from(buffer));
    
    console.log(`📊 Reporte guardado: ${filename}`);
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Error guardando reporte:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar archivos
app.get('/api/files/:directory', async (req, res) => {
  try {
    const { directory } = req.params;
    const dirPath = directory === 'reportes' ? REPORTES_DIR : DATA_DIR;
    const files = await fs.readdir(dirPath);
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error listando archivos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar archivo
app.delete('/api/files/:directory/:filename', async (req, res) => {
  try {
    const { directory, filename } = req.params;
    const dirPath = directory === 'reportes' ? REPORTES_DIR : DATA_DIR;
    await fs.unlink(path.join(dirPath, filename));
    console.log(`🗑️ Archivo eliminado: ${filename}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando archivo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SOCKET.IO - EVENTOS EN TIEMPO REAL
// ============================================

io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);

  // Login de cajero
  socket.on('cashier-login', (data) => {
    console.log('👤 Cajero iniciando sesión:', data.cashierName, 'Local:', data.localId);
    socket.broadcast.emit('cashier-status-change', { 
      cashierName: data.cashierName, 
      localId: data.localId,
      status: 'online' 
    });
  });

  // Logout de cajero
  socket.on('cashier-logout', (data) => {
    console.log('👤 Cajero cerrando sesión:', data.cashierName, 'Local:', data.localId);
    socket.broadcast.emit('cashier-status-change', { 
      cashierName: data.cashierName,
      localId: data.localId, 
      status: 'offline' 
    });
  });

  // Nueva orden creada
  socket.on('order-created', (order) => {
    console.log('📦 Nueva orden:', order.orderNumber, 'Local:', order.localId);
    socket.broadcast.emit('order-created', order);
  });

  // Caja cerrada
  socket.on('cash-register-closed', (data) => {
    console.log('💰 Caja cerrada:', data.cashier, 'Local:', data.localId);
    socket.broadcast.emit('cash-register-closed', data);
  });

  // Autorización creada
  socket.on('authorization-created', (auth) => {
    console.log('⚠️ Nueva solicitud de autorización:', auth.type);
    socket.broadcast.emit('authorization-created', auth);
  });

  // Autorización aprobada
  socket.on('authorization-approved', (auth) => {
    console.log('✅ Autorización aprobada:', auth.id);
    socket.broadcast.emit('authorization-approved', auth);
  });

  // Autorización rechazada
  socket.on('authorization-rejected', (auth) => {
    console.log('❌ Autorización rechazada:', auth.id);
    socket.broadcast.emit('authorization-rejected', auth);
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
  await ensureDirectories();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🚀 SERVIDOR CAJA REGISTRADORA       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║   📡 Puerto: ${PORT}                     ║`);
    console.log(`║   🌐 URL: http://0.0.0.0:${PORT}        ║`);
    console.log(`║   📂 Datos: ${DATA_DIR}              ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Servidor listo para recibir conexiones');
  });
}

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promesa rechazada:', error);
});

// Iniciar servidor
startServer();