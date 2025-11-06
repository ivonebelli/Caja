const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración
const PORT = process.env.PORT || 3000;

// PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Verificar conexión a la base de datos
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado a PostgreSQL');
    release();
  }
});

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

// Obtener datos de un archivo
async function getData(filename) {
  try {
    const result = await pool.query(
      'SELECT data FROM app_data WHERE filename = $1',
      [filename]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    let data = result.rows[0].data;
    
    // Lista de archivos que DEBEN ser arrays
    const arrayFiles = [
      'products.json',
      'orders.json',
      'categories.json',
      'authorizations.json',
      'change_history.json'
    ];
    
    // Normalizar: si es un archivo que debe ser array pero es {}, convertir a []
    if (arrayFiles.includes(filename)) {
      if (!data || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
        console.log(`⚠️ ${filename} era {} en BD, devolviendo [] en su lugar`);
        data = [];
      } else if (!Array.isArray(data)) {
        console.error(`❌ ${filename} debería ser array pero es:`, typeof data);
        data = [];
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error obteniendo ${filename}:`, error);
    return null;
  }
}

// Guardar datos de un archivo
async function setData(filename, data) {
  try {
    // Lista de archivos que DEBEN ser arrays
    const arrayFiles = [
      'products.json',
      'orders.json',
      'categories.json',
      'authorizations.json',
      'change_history.json'
    ];
    
    // Normalizar: si es un archivo que debe ser array pero es {}, convertir a []
    let normalizedData = data;
    if (arrayFiles.includes(filename)) {
      if (!data || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
        console.log(`⚠️ Convirtiendo ${filename} de {} a [] antes de guardar`);
        normalizedData = [];
      } else if (!Array.isArray(data)) {
        console.error(`❌ ${filename} debería ser array pero es:`, typeof data);
        normalizedData = [];
      }
    }
    
    // CORREGIDO: Pasar el objeto directamente, PostgreSQL maneja JSONB
    await pool.query(
      `INSERT INTO app_data (filename, data, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (filename) 
       DO UPDATE SET data = $2, updated_at = NOW()`,
      [filename, normalizedData]
    );
    
    console.log(`✅ Guardado: ${filename} - Tipo: ${Array.isArray(normalizedData) ? 'array' : 'object'}`);
    return true;
  } catch (error) {
    console.error(`Error guardando ${filename}:`, error);
    return false;
  }
}

// Validar datos antes de guardar
function validateData(filename, data) {
  const arrayFiles = ['products.json', 'orders.json', 'categories.json', 'authorizations.json', 'change_history.json'];
  
  if (arrayFiles.includes(filename)) {
    if (!Array.isArray(data) && !(typeof data === 'object' && Object.keys(data).length === 0)) {
      return { valid: false, error: `${filename} debe ser un array` };
    }
  }
  
  if (filename === 'profiles.json') {
    if (!data || !data.locales || !Array.isArray(data.locales)) {
      return { valid: false, error: 'profiles.json debe tener estructura con locales array' };
    }
  }
  
  if (filename === 'config.json') {
    if (!data || typeof data.lastOrderNumber !== 'number') {
      return { valid: false, error: 'config.json debe tener lastOrderNumber numérico' };
    }
  }
  
  return { valid: true };
}

// ============================================
// RUTAS DE API
// ============================================

// Sincronización inicial - devuelve todos los datos
app.get('/api/sync', async (req, res) => {
  try {
    const dataFiles = [
      'active_sessions.json',
      'authorizations.json',
      'cash_register.json',
      'categories.json',
      'change_history.json',
      'config.json',
      'orders.json',
      'products.json',
      'profiles.json'
    ];

    const syncData = {};
    
    for (const filename of dataFiles) {
      const data = await getData(filename);
      syncData[filename] = data;
    }

    console.log('✅ Sincronización inicial completada');
    res.json({ 
      success: true, 
      data: syncData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en sincronización:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Leer archivo JSON
app.get('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const data = await getData(filename);
    
    if (data === null) {
      return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error leyendo archivo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Escribir archivo JSON
app.post('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { data } = req.body;
    
    // NUEVO: Validar datos antes de guardar
    const validation = validateData(filename, data);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    
    const success = await setData(filename, data);
    
    if (success) {
      // Notificar a todos los clientes conectados
      io.emit('data-updated', { filename, data });
      console.log(`✅ Archivo actualizado: ${filename}`);
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Error guardando datos' });
    }
  } catch (error) {
    console.error('Error escribiendo archivo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta de salud
app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    await pool.query('SELECT NOW()');
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      connections: io.engine.clientsCount,
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Guardar reporte (PDF/Excel) como binario en PostgreSQL
app.post('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { buffer } = req.body;
    
    if (!buffer) {
      return res.status(400).json({ success: false, error: 'No se proporcionó el archivo' });
    }
    
    // Convertir buffer a bytea para PostgreSQL
    const bufferData = Buffer.from(buffer);
    
    await pool.query(
      `INSERT INTO reports (filename, file_data, created_at) 
       VALUES ($1, $2, NOW())`,
      [filename, bufferData]
    );
    
    console.log(`✅ Reporte guardado: ${filename}`);
    res.json({ success: true, path: `/api/reports/${filename}` });
  } catch (error) {
    console.error('Error guardando reporte:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar reportes guardados
app.get('/api/reports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, filename, created_at FROM reports ORDER BY created_at DESC'
    );
    
    const reports = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      createdAt: row.created_at
    }));
    
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error listando reportes:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Descargar un reporte específico
app.get('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    const result = await pool.query(
      'SELECT file_data, filename FROM reports WHERE filename = $1 ORDER BY created_at DESC LIMIT 1',
      [filename]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reporte no encontrado' });
    }
    
    const report = result.rows[0];
    
    // Determinar tipo de contenido
    const ext = filename.split('.').pop().toLowerCase();
    const contentType = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(report.file_data);
  } catch (error) {
    console.error('Error descargando reporte:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicializar base de datos
app.post('/api/init-db', async (req, res) => {
  try {
    // Crear tabla de datos si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Crear tabla de reportes si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_data BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Crear índice para búsquedas rápidas de reportes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_filename ON reports(filename, created_at DESC)
    `);

    // Datos iniciales - CORREGIDO: gerencia como objeto
    const defaultData = {
      'profiles.json': { 
        locales: [
          {
            id: 'boulevard-maritimo',
            nombre: 'Boulevard Marítimo',
            ubicacion: 'Av. Costanera 123',
            subgerente: {
              name: '',
              pin: '',
              photo: null,
              createdAt: null
            },
            perfiles: {
              cajero: [],
              administrativo: []
            }
          },
          {
            id: 'photostation',
            nombre: 'PhotoStation',
            ubicacion: 'Calle Imagen 456',
            subgerente: {
              name: '',
              pin: '',
              photo: null,
              createdAt: null
            },
            perfiles: {
              cajero: [],
              administrativo: []
            }
          }
        ],
        gerencia: {
          name: '',
          pin: '',
          photo: null,
          createdAt: null
        }
      },
      'products.json': [],
      'orders.json': [],
      'categories.json': [],
      'config.json': {
        storeName: 'Mi Negocio',
        currency: 'ARS',
        taxRate: 0,
        serverURL: 'https://caja-production-5ef5.up.railway.app',
        createdAt: new Date().toISOString(),
        lastOrderNumber: 0
      },
      'cash_register.json': { sessions: [] },
      'active_sessions.json': {},
      'authorizations.json': [],
      'change_history.json': []
    };

    // Insertar datos iniciales solo si no existen
    for (const [filename, data] of Object.entries(defaultData)) {
      await pool.query(
        `INSERT INTO app_data (filename, data) 
         VALUES ($1, $2) 
         ON CONFLICT (filename) DO NOTHING`,
        [filename, data]
      );
    }

    console.log('✅ Base de datos inicializada');
    res.json({ success: true, message: 'Base de datos inicializada correctamente' });
  } catch (error) {
    console.error('Error inicializando BD:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NUEVO: Resetear base de datos completamente
app.post('/api/reset-db', async (req, res) => {
  try {
    console.log('⚠️ Reseteando base de datos...');
    
    // Borrar todas las tablas
    await pool.query('DROP TABLE IF EXISTS app_data CASCADE');
    await pool.query('DROP TABLE IF EXISTS reports CASCADE');
    
    console.log('✅ Tablas eliminadas');
    
    // Recrear tablas
    await pool.query(`
      CREATE TABLE app_data (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_data BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX idx_reports_filename ON reports(filename, created_at DESC)
    `);
    
    console.log('✅ Tablas recreadas');

    // Insertar datos iniciales correctos
    const defaultData = {
      'profiles.json': { 
        locales: [
          {
            id: 'boulevard-maritimo',
            nombre: 'Boulevard Marítimo',
            ubicacion: 'Av. Costanera 123',
            subgerente: {
              name: '',
              pin: '',
              photo: null,
              createdAt: null
            },
            perfiles: {
              cajero: [],
              administrativo: []
            }
          },
          {
            id: 'photostation',
            nombre: 'PhotoStation',
            ubicacion: 'Calle Imagen 456',
            subgerente: {
              name: '',
              pin: '',
              photo: null,
              createdAt: null
            },
            perfiles: {
              cajero: [],
              administrativo: []
            }
          }
        ],
        gerencia: {
          name: '',
          pin: '',
          photo: null,
          createdAt: null
        }
      },
      'products.json': [],
      'orders.json': [],
      'categories.json': [],
      'config.json': {
        storeName: 'Mi Negocio',
        currency: 'ARS',
        taxRate: 0,
        serverURL: 'https://caja-production-5ef5.up.railway.app',
        createdAt: new Date().toISOString(),
        lastOrderNumber: 0
      },
      'cash_register.json': { sessions: [] },
      'active_sessions.json': {},
      'authorizations.json': [],
      'change_history.json': []
    };

    for (const [filename, data] of Object.entries(defaultData)) {
      await pool.query(
        'INSERT INTO app_data (filename, data) VALUES ($1, $2)',
        [filename, data]
      );
      console.log(`✅ Insertado: ${filename}`);
    }

    console.log('✅ Base de datos reseteada completamente');
    res.json({ 
      success: true, 
      message: 'Base de datos reseteada correctamente con datos limpios' 
    });
  } catch (error) {
    console.error('Error reseteando BD:', error);
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
  server.listen(PORT, '0.0.0.0', () => {
    console.log('============================================');
    console.log('🚀 SERVIDOR INICIADO');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`💾 Base de datos: PostgreSQL`);
    console.log('============================================');
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
