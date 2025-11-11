const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise'); // 👈 AÑADIDO: Conector MySQL/MariaDB

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// VARIABLES GLOBALES
let pool; // Pool de conexión global para la base de datos
let config; // Configuración de la aplicación

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración
const PORT = process.env.PORT || 3000;
// Directorio de Datos se mantiene para leer config.json
const DATA_DIR = path.join(__dirname, 'data'); 
const REPORTES_DIR = path.join(__dirname, 'reportes');

// Nombres de los archivos JSON que usaremos como nombres de tabla
const DATA_FILES = [
    'profiles.json',
    'products.json',
    'orders.json',
    'categories.json',
    'config.json',
    'cash_register.json',
    'active_sessions.json',
    'authorizations.json'
];

// Asegurar que existan los directorios
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(REPORTES_DIR, { recursive: true });
}

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

// Mapea el nombre del archivo JSON a un nombre de tabla SQL
function getTableName(filename) {
  return filename.replace('.json', '');
}

async function dbReadData(tableName) {
  if (!pool) throw new Error("Base de datos no conectada");
  const [rows] = await pool.query(`SELECT data_json FROM ${tableName} WHERE id = 1`);

  if (rows.length === 0) {
    // Si no hay datos en la BD, se retorna la estructura base (ej. array vacío o objeto vacío)
    if (tableName === 'orders' || tableName === 'products' || tableName === 'categories' || tableName === 'authorizations') {
        return [];
    }
    return {}; 
  }
  return JSON.parse(rows[0].data_json);
}

async function dbWriteData(tableName, data) {
  if (!pool) throw new Error("Base de datos no conectada");
  const jsonData = JSON.stringify(data);
  
  // Query para insertar o actualizar el registro con ID=1
  const query = `
    INSERT INTO ${tableName} (id, data_json) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE data_json = VALUES(data_json);
  `;
  await pool.query(query, [1, jsonData]);
}

// ============================================
// RUTAS DE API - MODIFICADAS PARA USAR MARIA DB
// ============================================

// Leer datos de la tabla (Base de Datos)
app.get('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const tableName = getTableName(filename);
    const data = await dbReadData(tableName); // 👈 Usa la función de BD
    res.json({ success: true, data: data });
  } catch (error) {
    console.error(`Error leyendo tabla ${getTableName(req.params.filename)}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Escribir datos en la tabla (Base de Datos) con sincronización automática
app.post('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { data } = req.body;
    const tableName = getTableName(filename);

    await dbWriteData(tableName, data); // 👈 Usa la función de BD
    
    // Notificar a TODOS los clientes conectados sobre la actualización
    io.emit('data-updated', { filename, data, timestamp: new Date().toISOString() });
    
    console.log(`✅ Tabla actualizada: ${tableName} - Notificando a ${io.engine.clientsCount} clientes`);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`Error escribiendo tabla ${getTableName(req.params.filename)}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronización forzada - obtener todos los archivos actualizados (MODIFICADA)
app.get('/api/sync/all', async (req, res) => {
  try {
    const allData = {};
    
    for (const file of DATA_FILES) {
        const tableName = getTableName(file);
        const data = await dbReadData(tableName);
        allData[file] = data;
    }
    
    res.json({ 
      success: true, 
      data: allData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en sincronización completa:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --------------------------------------------
// LAS DEMÁS RUTAS NO CAMBIAN SU LÓGICA DE ARCHIVOS
// --------------------------------------------

// Guardar reporte Excel
app.post('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { buffer } = req.body;
    const filePath = path.join(REPORTES_DIR, filename);
    
    await fs.writeFile(filePath, Buffer.from(buffer));
    
    console.log(`✅ Reporte guardado: ${filename}`);
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
    console.log(`✅ Archivo eliminado: ${filename}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando archivo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

// Ruta para obtener estado del servidor
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: 'Caja Registradora Server',
    version: '2.0',
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SOCKET.IO - EVENTOS EN TIEMPO REAL (MODIFICADA LA SINCRONIZACIÓN)
// ============================================

io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id} - Total: ${io.engine.clientsCount}`);

  // Enviar estado inicial al cliente que se acaba de conectar
  socket.emit('connection-established', {
    clientId: socket.id,
    timestamp: new Date().toISOString(),
    totalClients: io.engine.clientsCount
  });

  // Login de cajero
  socket.on('cashier-login', (data) => {
    console.log('👤 Cajero iniciando sesión:', data.cashierName, 'Local:', data.localId);
    // Notificar a TODOS los demás clientes
    socket.broadcast.emit('cashier-status-change', { 
      cashierName: data.cashierName, 
      localId: data.localId,
      status: 'online',
      timestamp: new Date().toISOString()
    });
  });

  // Logout de cajero
  socket.on('cashier-logout', (data) => {
    console.log('👤 Cajero cerrando sesión:', data.cashierName, 'Local:', data.localId);
    socket.broadcast.emit('cashier-status-change', { 
      cashierName: data.cashierName,
      localId: data.localId, 
      status: 'offline',
      timestamp: new Date().toISOString()
    });
  });

  // Nueva orden creada
  socket.on('order-created', (order) => {
    console.log('📦 Nueva orden:', order.orderNumber, 'Local:', order.localId);
    // Emitir a todos los clientes
    socket.broadcast.emit('order-created', order);
  });

  // Orden actualizada
  socket.on('order-updated', (order) => {
    console.log('📝 Orden actualizada:', order.orderNumber);
    socket.broadcast.emit('order-updated', order);
  });

  // Orden cancelada
  socket.on('order-cancelled', (order) => {
    console.log('❌ Orden cancelada:', order.orderNumber);
    socket.broadcast.emit('order-cancelled', order);
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

  // Producto agregado/modificado
  socket.on('product-updated', (product) => {
    console.log('📦 Producto actualizado:', product.name);
    socket.broadcast.emit('product-updated', product);
  });

  // Producto eliminado
  socket.on('product-deleted', (productId) => {
    console.log('🗑️ Producto eliminado:', productId);
    socket.broadcast.emit('product-deleted', productId);
  });

  // Perfil creado
  socket.on('profile-created', (profile) => {
    console.log('👤 Perfil creado:', profile.name);
    socket.broadcast.emit('profile-created', profile);
  });

  // Perfil eliminado
  socket.on('profile-deleted', (data) => {
    console.log('🗑️ Perfil eliminado:', data.profileId);
    socket.broadcast.emit('profile-deleted', data);
  });

  // Local creado
  socket.on('local-created', (local) => {
    console.log('🏢 Local creado:', local.nombre);
    socket.broadcast.emit('local-created', local);
  });

  // Local eliminado
  socket.on('local-deleted', (localId) => {
    console.log('🗑️ Local eliminado:', localId);
    socket.broadcast.emit('local-deleted', localId);
  });

  // Solicitud de sincronización (MODIFICADA PARA USAR BD)
  socket.on('request-sync', async () => {
    console.log('🔄 Solicitud de sincronización de:', socket.id);
    try {
        const allData = {};
        for (const file of DATA_FILES) {
            const tableName = getTableName(file);
            const data = await dbReadData(tableName);
            allData[file] = data;
        }
      
      socket.emit('sync-complete', {
        data: allData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en sincronización:', error);
      socket.emit('sync-error', { error: error.message });
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id} - Restantes: ${io.engine.clientsCount}`);
  });
});

// ============================================
// INICIAR SERVIDOR (MODIFICADA PARA CONEXIÓN BD)
// ============================================

async function setupDatabase() {
    console.log('🔗 Conectando a MariaDB...');
    
    // 1. Leer Configuración (tu archivo modificado)
    const configPath = path.join(DATA_DIR, 'config.json');
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));

    if (!config.database || config.database.dialect !== 'mariadb') {
        throw new Error("La configuración 'database' en config.json es inválida o falta.");
    }

    // 2. Crear Pool de Conexión
    const dbConfig = {
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
        port: config.database.port || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
    
    pool = mysql.createPool(dbConfig);
    
    // 3. Testear la Conexión
    await pool.query('SELECT 1 + 1 AS solution');
    console.log('✅ Conexión a MariaDB exitosa.');

    // 4. Migración: Crear Tablas (Todas las tablas guardarán todo el JSON en un solo registro con ID=1)
    console.log('🔄 Verificando/Creando tablas...');
    for (const file of DATA_FILES) {
        const tableName = getTableName(file);
        const query = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                id INT PRIMARY KEY,
                data_json LONGTEXT NOT NULL
            );
        `;
        await pool.query(query);
        console.log(`   - Tabla creada/verificada: ${tableName}`);
    }
    console.log('✅ Migraciones completadas.');
}


async function startServer() {
  await ensureDirectories();
  try {
    await setupDatabase(); // Conectar y crear tablas antes de iniciar el servidor web
  } catch (error) {
    console.error('❌ ERROR CRÍTICO DE BASE DE DATOS:', error.message);
    console.error('Verifica que MariaDB esté corriendo y que tu archivo config.json esté correcto.');
    console.error('El servidor se detendrá.');
    process.exit(1); // Detener la aplicación si falla la conexión
    return;
  }
    
  server.listen(PORT, '0.0.0.0', () => {
    console.log('============================================');
    console.log('🚀 SERVIDOR DE CAJA REGISTRADORA INICIADO');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 URL Local: http://localhost:${PORT}`);
    console.log(`🌐 URL Red: http://0.0.0.0:${PORT}`);
    console.log(`💾 Persistencia: MariaDB`); // INDICAR EL CAMBIO
    console.log('✅ Sincronización en tiempo real: ACTIVA');
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    if (pool) pool.end(); // Cerrar la conexión de la BD
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    if (pool) pool.end(); // Cerrar la conexión de la BD
    process.exit(0);
  });
});

// Iniciar servidor
startServer();
