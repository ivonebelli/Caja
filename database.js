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

async function deleteStore(id) {
  if (!pool) {
    throw new Error(
      "El pool de la base de datos no está inicializado. Llama a connectToDatabase() primero."
    );
  }

  try {
    const query = `DELETE FROM Stores WHERE store_id = ?`;
    const values = [storeId];
    const [result] = await pool.query(query, values);

    // result.affectedRows te dirá cuántas filas fueron borradas.
    if (result.affectedRows > 0) {
      console.log(`✅ Tienda ${storeId} eliminada correctamente.`);
      return true;
    } else {
      console.warn(
        `⚠️ Intento de eliminar tienda ${storeId}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error al eliminar la tienda ${storeId}:`, error.message);

    // --- MANEJO DE ERROR CRÍTICO ---
    // 'ER_ROW_IS_REFERENCED_2' es el código de error de MySQL/MariaDB
    // cuando una clave foránea (FOREIGN KEY) previene la eliminación.
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error(
        "No se puede eliminar la tienda porque tiene cajas o perfiles asociados."
      );
    }

    // Lanza un error genérico si es otro problema
    throw new Error("Error al consultar la base de datos.");
  }
}

/**
 * Obtiene todas las tiendas (Stores) de la base de datos.
 * @returns {Promise<Array>} Un array de objetos de tienda.
 */
async function getStores() {
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
    console.log(rows);
    return rows;
  } catch (error) {
    console.error("Error al obtener las tiendas (getStores):", error.message);
    // Lanza el error para que ipcMain.handle pueda capturarlo
    throw new Error("Error al consultar la base de datos.");
  }
}

async function getProfiles(store_id) {
  if (!pool) {
    throw new Error(
      "El pool de la base de datos no está inicializado. Llama a connectToDatabase() primero."
    );
  }

  try {
    const query = `SELECT * FROM Profiles WHERE is_active = TRUE AND store_id = ?`;
    const values = [store_id];
    const [rows] = await pool.query(query, values);

    console.log(
      `Consulta 'getProfiles' ejecutada, ${rows.length} tiendas encontradas.`
    );
    console.log(rows);
    return rows;
  } catch (error) {
    console.error(
      "Error al obtener los perfiles (getProfiles):",
      error.message
    );
    // Lanza el error para que ipcMain.handle pueda capturarlo
    throw new Error("Error al consultar la base de datos.");
  }
}

async function createProfile(newProfile) {
  if (!pool) {
    throw new Error(
      "El pool de la base de datos no está inicializado. Llama a connectToDatabase() primero."
    );
  }
  try {
    const query = `INSERT INTO Profiles (store_id, username, role, pin, photo) 
    VALUES (?, ?, ?)`;

    const values = [
      newProfile.storeId,
      newProfile.username,
      newProfile.role,
      newProfile.pin,
      newProfile.photo,
    ];

    const [result] = await pool.query(query, values);
    if (result.insertId) {
      console.log(`✅ Nuevo perfil creado con ID: ${result.insertId}`);
      return result.insertId;
    } else {
      throw new Error("Error desconocido al insertar el perfil.");
    }
  } catch (error) {
    console.error("Error al crear perfil (createProfile):", error.message);
    // Lanza el error para que ipcMain.handle pueda capturarlo
    throw new Error("Error al consultar la base de datos.");
  }
}

// Exporta las funciones para que main.js pueda usarlas
module.exports = {
  connectWithCredentials,
  getStores,
  deleteStore,
  getProfiles,
  createProfile,
};
