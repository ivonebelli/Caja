const mysql = require("mysql2/promise");

let poll = null;

/**
 * Inicializa el pool de conexiones de la base de datos.
 * Esta función debe ser llamada en main.js ANTES de cualquier operación de BD.
 */
async function connectWithCredentials(credentials) {
  try {
    pool = mysql.createPool({
      host: credentials.host,
      port: 3306,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Prueba la conexión
    await pool.query("SELECT 1");
    console.log("✅ Conexión a la base de datos (pool) establecida.");

    // Devuelve la instancia del pool si main.js la necesita
    return pool;
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos:", error.message);
    throw error; // Lanza el error para que main.js lo capture
  }
}

/**
 * Obtiene todas las tiendas (Stores) de la base de datos.
 * @returns {Promise<Array>} Un array de objetos de tienda.
 */
async function getAllStores() {
  if (!pool) {
    throw new Error(
      "El pool de la base de datos no está inicializado. Llama a connectToDatabase() primero."
    );
  }

  try {
    const query = "SELECT * FROM Stores WHERE is_active = TRUE";
    const [rows] = await pool.query(query);

    console.log(
      `Consulta 'getAllStores' ejecutada, ${rows.length} tiendas encontradas.`
    );
    return rows;
  } catch (error) {
    console.error(
      "Error al obtener las tiendas (getAllStores):",
      error.message
    );
    // Lanza el error para que ipcMain.handle pueda capturarlo
    throw new Error("Error al consultar la base de datos.");
  }
}

// Exporta las funciones para que main.js pueda usarlas
module.exports = {
  connectWithCredentials,
  getAllStores,
};
