// purge-daemon.js
const { Op } = require("sequelize");
// Global variables to be injected by main.js
let sequelizeLocal; // SQLite instance
let dbRemote; // Remote connection pool/instance (MariaDB)
let isSyncing = false; // Flag to prevent multiple simultaneous sync runs

const SYNC_INTERVAL_MS = 30000; // Try every 30 seconds

let remote_credentials = null;

// --- Exported functions ---

async function sendToMariaDB(payload) {
  if (!dbRemote) {
    throw new Error("Conexión remota (MariaDB) no disponible.");
  }

  // Recuperar modelos del catálogo de la instancia remota
  const InflowRemote = dbRemote.models.Inflow;
  const SaleRemote = dbRemote.models.Sale;

  if (!InflowRemote || !SaleRemote) {
    throw new Error(
      "Modelos remotos (Inflow/Sale) no encontrados en la instancia remota."
    );
  }

  let transaction; // Variable para almacenar la transacción

  try {
    // 1. INICIAR TRANSACCIÓN
    transaction = await dbRemote.transaction();

    // 2. INSERTAR EL INFLOW PADRE (capturando el ID remoto)
    const remoteInflowRecord = await InflowRemote.create(payload.inflow, {
      transaction: transaction,
      // Asumimos que payload.inflow NO tiene local_id/is_synced/remote_id
    });
    const remoteInflowId = remoteInflowRecord.inflow_id; // PK generada por MariaDB

    // 3. PREPARAR Y INSERTAR LAS VENTAS HIJAS
    const remoteSalesToInsert = payload.sales.map((sale) => ({
      ...sale,
      inflow_id: remoteInflowId, // Vincular cada venta con el nuevo PK remoto
    }));

    if (remoteSalesToInsert.length > 0) {
      await SaleRemote.bulkCreate(remoteSalesToInsert, {
        transaction: transaction,
        // Ignoramos campos que no existen en la BD remota (ej: local_id, is_synced)
        ignoreDuplicates: true,
      });
    }

    // 4. CONFIRMAR TRANSACCIÓN
    await transaction.commit();

    // 5. DEVOLVER EL ID REMOTO
    return { remoteInflowId: remoteInflowId };
  } catch (error) {
    // 6. REVERTIR TRANSACCIÓN EN CASO DE FALLO
    if (transaction) await transaction.rollback();

    console.error(
      `\t[MariaDB] Error en la transacción remota: ${error.message}`
    );
    // Lanzamos el error para que el daemon lo capture y marque para reintento.
    throw error;
  }
}
// 1. Injected by main.js after connections are established
function setConnections(localSequelize, remoteDB) {
  sequelizeLocal = localSequelize;
  dbRemote = remoteDB;
  // console.log("Sync Daemon initialized.");
}

// 2. Starts the background process
function startDaemon(credentials) {
  if (!sequelizeLocal) {
    console.error("Daemon cannot start: Local DB not initialized.");
    return;
  }
  remote_credentials = credentials;

  syncLocalToRemote();
  setInterval(syncLocalToRemote, SYNC_INTERVAL_MS);
}

async function syncLocalToRemote() {
  if (isSyncing || !dbRemote) {
    // Stop if a sync is already running or if remote connection is down
    return;
  }

  const InflowLocal = sequelizeLocal.models.Inflow;
  isSyncing = true;
  // console.log("--- Starting Sync Cycle ---");

  try {
    const pendingInflows = await InflowLocal.findAll({
      where: {
        is_synced: false,
      },
      order: [["local_id", "ASC"]],
      limit: 2,
    });

    if (pendingInflows.length === 0) {
      // console.log("No pending records found.");
      return;
    }

    // 2. Process each pending Inflow
    for (const inflowRecord of pendingInflows) {
      await processInflowSync(inflowRecord);
    }
  } catch (error) {
    console.error("Sync Cycle Error:", error.message);
  } finally {
    isSyncing = false;
    // console.log("--- Sync Cycle Finished ---");
  }
}

async function processInflowSync(localInflow) {
  const localId = localInflow.local_id;
  const SaleLocal = sequelizeLocal.models.Sales;
  // 1. RETRIEVE RELATED SALES (and other children data)
  // We assume Sales are linked via the foreign key relationship
  const localSales = await SaleLocal.findAll({
    where: { inflow_id: localId },
    // We rely on this query being fast since it's local SQLite
  });

  try {
    // 2. BUILD PAYLOAD for MariaDB
    // This object must perfectly match the MariaDB schema fields (NO local_id, YES remote_id)
    const remoteInflowData = localInflow.toJSON();
    delete remoteInflowData.local_id; // MariaDB will assign its own PK
    delete remoteInflowData.is_synced; // MariaDB doesn't need this tracking field

    const remoteSalesData = localSales.map((sale) => {
      const saleJson = sale.toJSON();
      delete saleJson.local_id;
      delete saleJson.is_synced;
      return saleJson;
    });

    // 3. ATTEMPT REMOTE WRITE (This depends heavily on your MariaDB logic)
    // This function must be defined elsewhere and handle the MariaDB transaction.
    const mariaDBResult = await sendToMariaDB(
      {
        inflow: remoteInflowData,
        sales: remoteSalesData,
      },
      dbRemote
    ); // dbRemote is the remote connection

    if (mariaDBResult && mariaDBResult.remoteInflowId) {
      // 4. ON SUCCESS: UPDATE LOCAL STATUS
      await localInflow.update({
        is_synced: true,
        remote_id: mariaDBResult.remoteInflowId,
      });

      await SaleLocal.update(
        { is_synced: true },
        { where: { inflow_id: localId } } // Update all sales belonging to this inflow
      );
    } else {
      console.warn(`\t⚠️ Remote rejected Inflow ${localId}. Will re-attempt.`);
    }
  } catch (error) {
    // Connection error or timeout - simply ignore and let the daemon re-try later.
  }
}

// Final Exports
module.exports = {
  setConnections,
  startDaemon,
};
