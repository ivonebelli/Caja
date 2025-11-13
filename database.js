const { Sequelize, DataTypes, Op } = require("sequelize");
/**
 * Define todos los modelos y sus asociaciones (relaciones).
 * Esta función se llama después de que se establece la conexión.
 */
function initModels(sequelize) {
  // Obtenemos el dialecto de la instancia de conexión actual (lectura instantánea)
  const dialect = sequelize.options.dialect;

  sequelize.define(
    "Store",
    {
      store_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_id: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    { timestamps: false, tableName: "Stores" }
  );

  // --- 2. Definición del Modelo: Profile (Perfiles de Usuarios) ---
  sequelize.define(
    "Profile",
    {
      profile_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      role: {
        type: DataTypes.ENUM(
          "cajero",
          "administrativo",
          "subgerencia",
          "gerente"
        ),
        allowNull: false,
      },
      pin: {
        type: DataTypes.STRING(4),
        allowNull: false,
        defaultValue: "1234",
      },
      photo: { type: DataTypes.TEXT("long"), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    { timestamps: false, tableName: "Profiles" }
  );

  // ====================================================================
  // B. MODELOS DE TRANSACCIÓN (CONDICIONALES)
  // ====================================================================

  // --- LÓGICA CONDICIONAL DE INFLOW y SALE ---

  // 1. Lógica para SQLite (DB Local): Necesita campos de sincronización
  if (dialect === "sqlite") {
    sequelize.define(
      "Inflow",
      {
        // PK LOCAL: local_id
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "inflow_id",
        }, // Mapeo de nombre
        store_id: { type: DataTypes.INTEGER, allowNull: false },
        profile_id: { type: DataTypes.INTEGER, allowNull: true }, // Se asume profile_id es un campo
        start_time: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        end_time: { type: DataTypes.DATE, allowNull: true },
        starting_cash: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },

        // CAMPOS DE SINCRONIZACIÓN
        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: false, tableName: "Inflows" }
    );

    sequelize.define(
      "Sale",
      {
        // PK LOCAL: local_id
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "sale_id",
        }, // Mapeo de nombre
        inflow_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Inflows.local_id
        total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        sale_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },

        // CAMPOS DE SINCRONIZACIÓN
        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: false, tableName: "Sales" }
    );

    // 2. Lógica para MariaDB/MySQL (DB Remota): Usa PK/FK estándar y sin seguimiento
  } else {
    sequelize.define(
      "Inflow",
      {
        // PK REMOTA: inflow_id
        inflow_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        store_id: { type: DataTypes.INTEGER, allowNull: false },
        profile_id: { type: DataTypes.INTEGER, allowNull: true },
        start_time: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        end_time: { type: DataTypes.DATE, allowNull: true },
        starting_cash: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
      },
      { timestamps: false, tableName: "Inflows" }
    );

    sequelize.define(
      "Sale",
      {
        // PK REMOTA: sale_id
        sale_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        inflow_id: { type: DataTypes.INTEGER, allowNull: false },
        total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        sale_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      },
      { timestamps: false, tableName: "Sales" }
    );
  }

  // ====================================================================
  // C. ASOCIACIONES (DEBEN DEFINIRSE DESPUÉS DE AMBOS BLOQUES IF/ELSE)
  //    Las asociaciones usan los modelos recién definidos (Inflow y Sale)
  // ====================================================================

  // Store <-> Profile
  Store.hasMany(Profile, {
    foreignKey: "store_id",
    as: "profiles",
    onDelete: "CASCADE",
  });
  Profile.belongsTo(Store, { foreignKey: "store_id", as: "store" });

  // Store <-> Inflow
  Store.hasMany(Inflow, {
    foreignKey: "store_id",
    as: "inflows",
    onDelete: "RESTRICT",
  });
  Inflow.belongsTo(Store, { foreignKey: "store_id", as: "store" });

  // Profile <-> Inflow
  Profile.hasMany(Inflow, { foreignKey: "profile_id", as: "sessions" });
  Inflow.belongsTo(Profile, {
    foreignKey: "profile_id",
    as: "profile",
    onDelete: "SET NULL",
  });

  // Inflow <-> Sale
  // La clave foránea apunta al campo inflow_id/local_id (depende del contexto)
  Inflow.hasMany(Sale, {
    foreignKey: "inflow_id",
    as: "sales",
    onDelete: "CASCADE",
  });
  Sale.belongsTo(Inflow, { foreignKey: "inflow_id", as: "inflow" });
}

async function connectWithCredentials(credentials) {
  const { dialect, host, user, password, database, storage } = credentials;
  try {
    let sequelize = null;
    if (dialect === "mysql" || dialect === "mariadb") {
      sequelize = new Sequelize(database, user, password, {
        host: host,
        port: 3306, // Puerto estándar
        dialect: "mysql", // El driver de 'mysql' funciona para MariaDB
        logging: false, // Desactiva los logs de SQL en la consola
      });
    } else if (dialect === "sqlite") {
      sequelize = new Sequelize({
        dialect: "sqlite",
        storage: storage, // Ruta al archivo .sqlite (ej: './database.sqlite')
        logging: false,
      });
    } else {
      throw new Error("Dialecto de base de datos no soportado.");
    }

    // Prueba la conexión
    await sequelize.authenticate();
    console.log(`✅ Conexión a la base de datos (${dialect}) establecida.`);

    // Inicializa los modelos
    initModels(sequelize);

    return sequelize;
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos:", error.message);
    throw error; // Lanza el error para que main.js lo capture
  }
}

//Solo remota
async function getStores(sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Store = sequelize.models.Store;
  try {
    const rows = await Store.findAll({
      where: { is_active: true },
    });

    console.log(
      `Consulta 'getStores' ejecutada, ${rows.length} tiendas encontradas.`
    );
    console.log(rows);
    return rows;
  } catch (error) {
    console.error("Error al obtener las tiendas (getStores):", error.message);
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function deleteStore(storeId, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Store = sequelize.models.Store;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Store.update(
      { is_active: false },
      {
        where: { store_id: storeId },
      }
    );

    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Tienda ${storeId} desactivada (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de desactivar tienda ${storeId}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al desactivar la tienda ${storeId}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function getProfiles(store_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    const rows = await Profile.findAll({
      where: {
        is_active: true,
        store_id: store_id,
      },
    });

    console.log(
      `Consulta 'getProfiles' ejecutada, ${rows.length} perfiles encontrados.`
    );
    return rows;
  } catch (error) {
    console.error(
      "Error al obtener los perfiles (getProfiles):",
      error.message
    );
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function createProfile(newProfile, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // newProfile debe ser un objeto que coincida con los campos del modelo
    // (store_id, username, role, pin, photo)
    const createdProfile = await Profile.create(newProfile);

    if (createdProfile.profile_id) {
      console.log(
        `✅ Nuevo perfil creado con ID: ${createdProfile.profile_id}`
      );
      return createdProfile.profile_id;
    } else {
      throw new Error("Error desconocido al insertar el perfil.");
    }
  } catch (error) {
    console.error("Error al crear perfil (createProfile):", error.message);
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function getProfile(profile_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // findByPk (Find By Primary Key)
    // 'include' realiza el JOIN automáticamente gracias a las asociaciones definidas.
    const profile = await Profile.findByPk(profile_id, {
      include: {
        model: Store,
        as: "store", // Este 'as' debe coincidir con el definido en la asociación
        attributes: ["name"], // Solo trae el campo 'name' de Store
      },
    });

    console.log(`Consulta 'getProfile' ejecutada.`);
    // Sequelize devuelve un solo objeto (o null) con findByPk
    return profile ? [profile] : []; // Mantenemos el formato de array de tu código original
  } catch (error) {
    console.error("Error al obtener perfil (GetProfile):", error.message);
    throw new Error("Error al consultar la base de datos.");
  }
}

//Remota y local
async function getProfileAndDailyInflowData(profile_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  const Store = sequelize.models.Store;
  try {
    // --- QUERY 1: Obtener Perfil y Tienda (JOIN) ---
    const profileData = await Profile.findByPk(profile_id, {
      include: { model: Store, as: "store" },
    });

    if (!profileData) {
      return null; // Perfil no encontrado
    }

    const storeId = profileData.store_id;

    // --- QUERY 2: Encontrar el último Inflow DE HOY ---

    // Lógica de fecha agnóstica al dialecto (MySQL/SQLite)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Inicio del día

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // Fin del día

    const inflow = await Inflow.findOne({
      where: {
        store_id: storeId,
        start_time: {
          [Op.between]: [todayStart, todayEnd], // [Op.gte]: todayStart
        },
      },
      order: [["start_time", "DESC"]],
      limit: 1,
    });

    let lastInflowId = null;
    let salesData = [];
    let totalSalesAmount = 0;
    let salesCount = 0;
    let averageSale = 0;

    if (inflow) {
      lastInflowId = inflow.id;

      // --- QUERY 3: Obtener todas las ventas de ese Inflow ---
      salesData = await Sale.findAll({
        where: { inflow_id: lastInflowId },
      });

      // Reutilizamos la lógica de agregación de tu código original
      salesCount = salesData.length;

      if (salesCount > 0) {
        totalSalesAmount = salesData.reduce(
          (sum, sale) => sum + parseFloat(sale.total_amount),
          0
        );
        averageSale = totalSalesAmount / salesCount;
        salesData = salesData.map((sale) => sale.toJSON());
      }
    }

    const profileJSON = profileData.toJSON();
    console.log("-----------------");
    console.log("get inflows");
    let data = {
      profile: profileJSON, // Objeto Sequelize (puedes usar profileData.toJSON() si es necesario)
      last_inflow_id: lastInflowId,
      sales_summary: {
        total_amount: parseFloat(totalSalesAmount.toFixed(2)),
        count: salesCount,
        average_sale: parseFloat(averageSale.toFixed(2)),
      },
      sales_list: salesData,
    };
    console.log(data);

    // Devolvemos la misma estructura de objeto que tu código original
    return data;
  } catch (error) {
    console.error(
      "Error al obtener datos (getProfileAndDailyInflowData):",
      error.message
    );
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function deleteProfile(profile_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Profile.update(
      { is_active: false },
      {
        where: { profile_id: profile_id },
      }
    );

    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Perfil ${profile_id} desactivado (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de desactivar perfil ${profile_id}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al desactivar el perfil ${profile_id}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function restoreProfile(profile_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Profile.update(
      { is_active: true },
      {
        where: { profile_id: profile_id },
      }
    );

    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Perfil ${profile_id} restaurado (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de restaurar perfil ${profile_id}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al restaurar el perfil ${profile_id}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function restoreStore(store_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Store = sequelize.models.Store;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Store.update(
      { is_active: true },
      {
        where: { store_id: store_id },
      }
    );

    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Tienda ${store_id} restaurado (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de restaurar tienda ${store_id}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al restaurar el tienda ${store_id}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

//Solo remota
async function updateProfile(newProfile, sequelize) {
  const Profile = sequelize.models.Profile;
  try {
    // 1. Prepare the data to update (excluding the primary key from the data object)
    const updateData = {
      username: newProfile.username,
      pin: newProfile.pin,
      photo: newProfile.photo,
    };

    // 2. Execute the update query
    // The result is an array: [affectedCount, affectedRows]
    // affectedCount is the number of rows updated (0 or 1 in this case).
    const [affectedCount] = await Profile.update(updateData, {
      where: {
        profile_id: newProfile.profile_id, // CRITICAL: Use the primary key for the WHERE clause
      },
    });

    if (affectedCount > 0) {
      console.log(
        `✅ Profile ID ${newProfile.profile_id} updated successfully.`
      );
      return true; // Or return the updated row count
    } else {
      console.warn(
        `⚠️ Profile ID ${newProfile.profile_id} not found or no changes were made.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error updating profile ID ${newProfile.profile_id}:`,
      error.message
    );
    throw new Error("Error updating the profile in the database.");
  }
}

//Solo remota
async function updateStore(newStore, sequelize) {
  const Store = sequelize.models.Store;
  try {
    const updateData = {
      name: newStore.name,
      location: newStore.location,
      category_id: newStore.category_id,
      is_active: newStore.is_active, // Include if activation/deactivation is handled here
    };

    // 2. Execute the update query
    // The result is an array: [affectedCount, affectedRows]
    // affectedCount is the number of rows updated (0 or 1).
    const [affectedCount] = await Store.update(updateData, {
      where: {
        store_id: newStore.store_id,
      },
    });

    if (affectedCount > 0) {
      console.log(`✅ Store ID ${newStore.store_id} updated successfully.`);
      return true;
    } else {
      console.warn(
        `⚠️ Store ID ${newStore.store_id} not found or no changes were submitted.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error updating store ID ${newStore.store_id}:`,
      error.message
    );
    // Note: You might want to handle unique constraint errors (e.g., duplicate 'name') here.
    throw new Error("Error updating the store in the database.");
  }
}

//Tiene que ser para remota y local
async function createInflow(newInflow, sequelize) {
  const Inflow = sequelize.models.Inflow;

  // Datos de la sesión de caja principal
  const inflowData = {
    store_id: newInflow.store_id,
    starting_cash: newInflow.starting_cash,
  };

  let localInflowRecord;
  let remoteInflowId = null; // PK de MariaDB

  // --- 1. ESCRITURA LOCAL (Mandatoria) ---
  try {
    // is_synced se establece en FALSE
    inflowData.is_synced = false;

    // Creamos el registro de Inflow localmente (no hay ventas asociadas en este paso)
    localInflowRecord = await Inflow.create(inflowData);
    const localInflowId = localInflowRecord.inflow_id;

    console.log(`✅ Sesión de caja local (Inflow ID ${localInflowId}) creada.`);
  } catch (error) {
    console.error(
      "❌ FATAL: Error al crear el Inflow localmente.",
      error.message
    );
    throw new Error("Fallo al guardar la sesión de caja localmente.");
  }

  // --- 3. RETORNO FINAL ---
  return {
    success: true,
    localId: localInflowRecord.inflow_id,
    remoteId: remoteInflowId, // Null si falla/offline
  };
}

//Tiene que ser para remota y local
async function closeInflow(local_id, sequelize) {
  if (!sequelize) {
    throw new Error("Local database connection is not initialized.");
  }

  // 1. Retrieve the specific model from the Sequelize instance
  // NOTE: 'Inflow' must match the name used in sequelize.define()
  const InflowModel = sequelize.models.Inflow;

  if (!InflowModel) {
    throw new Error(
      "Inflow model is not defined on the local Sequelize instance."
    );
  }

  const now = new Date();

  try {
    // 2. Execute the update using the retrieved model
    const [affectedCount] = await InflowModel.update(
      {
        end_time: now,
        is_synced: false,
      },
      {
        where: {
          local_id: local_id,
          end_time: null,
        },
      }
    );

    if (affectedCount > 0) {
      console.log(`✅ Inflow Local ID ${local_id} closed.`);
      return true;
    } else {
      console.warn(
        `⚠️ Inflow Local ID ${local_id} not found or already closed.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error closing Inflow Local ID ${local_id}:`,
      error.message
    );
    throw new Error("Error updating the local cash session.");
  }
}

//Tiene que ser para remota y local
async function openInflow(local_id, sequelize) {
  // El parámetro ahora se llama 'sequelize'
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Obtener el modelo Inflow de la instancia Sequelize
  // Nota: Asumimos que el modelo fue definido como 'Inflow'
  const InflowModel = sequelize.models.Inflow;

  if (!InflowModel) {
    throw new Error(
      "Inflow model is not defined on the local Sequelize instance."
    );
  }

  try {
    // 2. Ejecutar la actualización (Reabrir Inflow)
    const [affectedCount] = await InflowModel.update(
      {
        end_time: null, // Establece el tiempo de cierre como nulo (reabierto)
        is_synced: false, // CRÍTICO: Indica que el registro fue modificado y debe sincronizarse.
      },
      {
        where: {
          local_id: local_id,
          // Usamos el Op.not de la instancia de Sequelize para buscar registros no nulos
          end_time: { [sequelize.Sequelize.Op.not]: null },
        },
      }
    );

    if (affectedCount > 0) {
      console.log(
        `✅ Inflow Local ID ${local_id} reabierto (end_time = NULL) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Inflow Local ID ${local_id} no encontrado o ya estaba abierto.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error al reabrir Inflow Local ID ${local_id}:`,
      error.message
    );
    throw new Error("Error al revertir el cierre de la sesión de caja local.");
  }
}
// Tiene que ser para remota y local, primero local
async function createSale(local_inflow_id, newSale, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // Retrieve the local Sale model from the sequelize instance
  const SaleModel = sequelize.models.Sale;

  if (!SaleModel) {
    throw new Error(
      "Sale model is not defined on the local Sequelize instance."
    );
  }

  // Assume newSale looks like { total_amount: 500.00, ...other_fields }
  const saleData = {
    inflow_id: local_inflow_id,
    total_amount: newSale.total_amount,
    // Add other necessary fields (like payment method, items, etc.)

    // --- Sync Fields ---
    remote_id: null,
    is_synced: false, // Must be false initially, waiting for remote push
  };

  let localSaleRecord;

  // --- 1. LOCAL WRITE (Mandatory) ---
  try {
    // Create the Sale record locally
    localSaleRecord = await SaleModel.create(saleData);
    const localSaleId = localSaleRecord.local_id;

    console.log(
      `✅ Sale ID ${localSaleId} created locally for Inflow ${local_inflow_id}.`
    );

    // --- IMPORTANT: Mark the parent Inflow as unsynced ---
    // Since the Inflow record was modified (it now has new associated sales),
    // it may need to be flagged for resynchronization if your sync process
    // tracks changes to related records.
    // We assume the sync process will check for any related unsynced Sale records.

    // This is a common point to also trigger the background sync job.

    return {
      success: true,
      localSaleId: localSaleId,
      // remoteId remains null until the sync process runs
      remoteId: null,
    };
  } catch (error) {
    console.error("❌ FATAL: Error creating local Sale record.", error.message);
    throw new Error("Failed to save sale data locally.");
  }

  // --- 2. REMOTE WRITE/DUAL-WRITE (Synchronization Attempt) ---
  // NOTE: In a robust Dual-Write system, the actual remote push for SALES
  // is often handled by the central SYNC JOB, not instantly in this function,
  // to keep the user interface fast and handle network failures better.
  // This function focuses solely on local persistence.
}

async function readSales(local_inflow_id, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Retrieve the local Sale model from the sequelize instance
  // NOTE: 'Sale' must match the name used in sequelize.define()
  const SaleModel = sequelize.models.Sale;

  if (!SaleModel) {
    throw new Error(
      "Sale model is not defined on the local Sequelize instance."
    );
  }

  try {
    // 2. Execute the findAll query
    const sales = await SaleModel.findAll({
      where: {
        // We query the sales table using the local foreign key
        inflow_id: local_inflow_id,
      },
      // Order by sale date or local ID to see them sequentially
      order: [["sale_date", "ASC"]],
    });

    // 3. Convert results to plain JavaScript objects for safe return (JSONify)
    const plainSales = sales.map((sale) => sale.toJSON());

    console.log(
      `✅ Read ${plainSales.length} sales for Inflow ID ${local_inflow_id}.`
    );

    return plainSales;
  } catch (error) {
    console.error(
      `❌ Error reading sales for Inflow ID ${local_inflow_id}:`,
      error.message
    );
    throw new Error("Error retrieving sale data from the local database.");
  }
}
module.exports = {
  connectWithCredentials,
  getStores,
  deleteStore,
  getProfiles,
  createProfile,
  getProfile,
  getProfileAndDailyInflowData,
  deleteProfile,
  restoreProfile,
  restoreStore,
  updateProfile,
  updateStore,
  createInflow,
  closeInflow,
  openInflow,
  createSale,
  readSales,
};
