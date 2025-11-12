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
    VALUES (?, ?, ?, ?, ?)`;

    const values = [
      newProfile.store_id,
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

async function getProfile(profile_id) {
  if (!pool) {
    throw new Error(
      "El pool de la base de datos no está inicializado. Llama a connectToDatabase() primero."
    );
  }
  try {
    const query =
      "SELECT P.*, S.name FROM Profiles P INNER JOIN Stores S ON P.store_id = S.store_id WHERE P.profile_id = ?;";
    const values = [profile_id];
    const [rows] = await pool.query(query, values);

    console.log(
      `Consulta 'getProfile' ejecutada, ${rows.length} perfiles encontrados.`
    );
    return rows;
  } catch (error) {
    console.error("Error al obtener perfil (GetProfile):", error.message);
    // Lanza el error para que ipcMain.handle pueda capturarlo
    throw new Error("Error al consultar la base de datos.");
  }
}

async function getProfileAndDailyInflowData(profile_id) {
  if (!pool) {
    throw new Error(
      "El pool de la base de datos no está inicializado. Llama a connectToDatabase() primero."
    );
  }
  try {
    const query1 =
      "SELECT P.*, S.name AS store_name, S.store_id FROM Profiles P INNER JOIN Stores S ON P.store_id = S.store_id WHERE P.profile_id = ?;";
    const values1 = [profile_id];
    const [rows1] = await pool.query(query1, values1);

    if (rows1.length === 0) {
      // Handle case where profile is not found
      return null;
    }

    const profileData = rows1[0];
    const storeId = profileData.store_id;

    const query2 =
      "SELECT id FROM Inflows WHERE store_id = ? AND DATE(inflow_timestamp) = CURDATE() ORDER BY inflow_timestamp DESC LIMIT 1;";
    const values2 = [storeId];
    const [inflowRows] = await pool.query(query2, values2);

    let lastInflowId = null;
    if (inflowRows.length > 0) {
      lastInflowId = inflowRows[0].id;
    }

    let salesData = [];

    if (lastInflowId) {
      // Only execute if an inflow was found today

      // Query 3: Get all sales associated with today's inflow
      const query3 = "SELECT * FROM Sales WHERE inflow_id = ?;";
      const values3 = [lastInflowId];
      const [salesRows] = await pool.query(query3, values3);

      salesData = salesRows;
      salesCount = salesData.length;

      // Calculate total sum of sales amounts
      totalSalesAmount = salesData.reduce(
        (sum, sale) => sum + parseFloat(sale.total_amount),
        0
      );

      // Calculate average sale amount
      if (salesCount > 0) {
        averageSale = totalSalesAmount / salesCount;
      }
    }

    return {
      profile: profileData,
      last_inflow_id: lastInflowId,
      sales_summary: {
        total_amount: parseFloat(totalSalesAmount.toFixed(2)),
        count: salesCount,
        average_sale: parseFloat(averageSale.toFixed(2)),
      },
      sales_list: salesData, // List of individual sales records
    };
  } catch (error) {
    console.error("Error al obtener perfil (GetProfile):", error.message);
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
  getProfile,
  getProfileAndDailyInflowData,
};
