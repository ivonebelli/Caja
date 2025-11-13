// purge-daemon.js
const { Op } = require("sequelize");

const PURGE_INTERVAL_MS = 86400000; // 24 hours

// This job runs once per day
async function purgeOldSyncedData(sequelizeLocal) {
  if (!sequelizeLocal) {
    console.error("Purge Daemon failed: Local DB not initialized.");
    return;
  }

  const InflowModel = sequelizeLocal.models.Inflow;
  const SaleModel = sequelizeLocal.models.Sale;

  // Define the cutoff time (2 days ago)
  const cutoffDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // --- Delete Sales ---
  const deletedSalesCount = await SaleModel.destroy({
    where: {
      is_synced: true,
      sale_date: {
        [Op.lt]: cutoffDate, // Less than the cutoff date (older)
      },
    },
  });

  // --- Delete Inflows ---
  const deletedInflowsCount = await InflowModel.destroy({
    where: {
      is_synced: true,
      end_time: { [Op.not]: null }, // Must be closed
      start_time: { [Op.lt]: cutoffDate },
    },
  });
}

// Function to be called from main.js to start the timer
function startPurgeDaemon(sequelizeLocalInstance) {
  if (!sequelizeLocalInstance) return;

  // Run the job immediately, then once a day
  purgeOldSyncedData(sequelizeLocalInstance);
  setInterval(
    () => purgeOldSyncedData(sequelizeLocalInstance),
    PURGE_INTERVAL_MS
  );
}

module.exports = { startPurgeDaemon };
