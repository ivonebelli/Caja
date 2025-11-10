// dbService.js
// *************************************************************
// ¡IMPORTANTE! Reemplaza 'mysql2' con la librería de tu base de datos (p.ej., 'pg' para PostgreSQL)
// ¡NO OLVIDES INSTALARLA! npm install mysql2
// *************************************************************

const mysql = require("mysql2/promise");

// ⚠️ Usar variables de entorno o un archivo de configuración separado (ignorando .env)
// es crucial para proteger las credenciales.
const DB_CONFIG = {
  host: "TU_HOST_REMOTO",
  user: "TU_USUARIO",
  password: "TU_PASSWORD",
  database: "TU_BASE_DE_DATOS",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Crear un pool de conexiones para manejar múltiples peticiones eficientemente
let pool;

async function connectToDatabase() {
  try {
    if (!pool) {
      pool = mysql.createPool(DB_CONFIG);
      console.log("🌐 Conexión al pool de base de datos remota establecida.");
    }
    return pool;
  } catch (error) {
    console.error(
      "❌ Error al conectar con la base de datos remota:",
      error.message
    );
    throw new Error("Fallo la conexión a la base de datos remota.");
  }
}

/**
 * Función genérica para obtener productos remotos
 */
async function getRemoteProducts() {
  try {
    const pool = await connectToDatabase();
    // Ejemplo de consulta SQL:
    const [rows] = await pool.execute(
      "SELECT id, name, price, stock FROM products WHERE active = ?",
      [1]
    );
    return rows;
  } catch (error) {
    console.error("❌ Error al obtener productos remotos:", error.message);
    throw error; // Propagar el error para que ipcMain lo maneje
  }
}

// Exporta las funciones que tu proceso principal necesita
module.exports = {
  connectToDatabase,
  getRemoteProducts,
  // Agrega más funciones aquí (guardarOrdenRemota, autenticarRemoto, etc.)
};
