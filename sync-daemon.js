// Global variables to be injected by main.js
let sequelizeLocal; // SQLite instance
let dbRemote; // Remote connection pool/instance (MariaDB)
let isSyncing = false; // Flag to prevent multiple simultaneous sync runs

const SYNC_INTERVAL_MS = 30000; // Try every 30 seconds

// --- Exported functions ---

// 1. Injected by main.js after connections are established
function setConnections(localSequelize, remoteDB) {
  sequelizeLocal = localSequelize;
  dbRemote = remoteDB;
  console.log("Sync Daemon initialized.");
}

// 2. Starts the background process
function startDaemon() {
  if (!sequelizeLocal) {
    console.error("Daemon cannot start: Local DB not initialized.");
    return;
  }
  // Run immediately, then repeat every X seconds
  syncLocalToRemote();
  setInterval(syncLocalToRemote, SYNC_INTERVAL_MS);
}

async function syncLocalToRemote() {
  if (isSyncing || !dbRemote) {
    // Stop if a sync is already running or if remote connection is down
    return;
  }

  isSyncing = true;
  console.log("--- Starting Sync Cycle ---");

  try {
    // 1. Find UN-SYNCHRONIZED Inflows
    // We order by local_id to guarantee chronological insertion order on the server.
    const pendingInflows = await InflowLocal.findAll({
      where: {
        is_synced: false,
        // Optional: ensure end_time is NOT null (only sync closed sessions)
        // end_time: { [Op.not]: null }
      },
      order: [["local_id", "ASC"]],
      limit: 50, // Limit the batch size
    });

    if (pendingInflows.length === 0) {
      console.log("No pending records found.");
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
    console.log("--- Sync Cycle Finished ---");
  }
}

async function processInflowSync(localInflow) {
  const localId = localInflow.local_id;

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

      // IMPORTANT: If you track sales sync status, update Sales here as well!
      // E.g., SaleLocal.update({ is_synced: true, remote_id: ... }, where: {inflow_id: localId})

      console.log(
        `\t✅ Inflow ${localId} synced. Remote ID: ${mariaDBResult.remoteInflowId}`
      );
    } else {
      console.warn(`\t⚠️ Remote rejected Inflow ${localId}. Will re-attempt.`);
    }
  } catch (error) {
    // Connection error or timeout - simply ignore and let the daemon re-try later.
    console.error(
      `\t❌ Failed to sync Inflow ${localId}. Reason: ${error.message}`
    );
  }
}

// Final Exports
module.exports = {
  setConnections,
  startDaemon,
};
