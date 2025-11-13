const { Sequelize, DataTypes, Op } = require("sequelize");
/**
 * Define todos los modelos y sus asociaciones (relaciones).
 * Esta función se llama después de que se establece la conexión.
 */
function initModels(sequelize) {
  // Obtenemos el dialecto de la instancia de conexión actual (lectura instantánea)
  const dialect = sequelize.options.dialect;

  let Store, Profile, Inflow, Sale;

  if (dialect === "sqlite") {
    Category = sequelize.define(
      "Category",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

        // CAMPOS DE SINCRONIZACIÓN
        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: false, tableName: "Categories" }
    );
    Store = sequelize.define(
      "Store",
      {
        // CAMBIO CRÍTICO: La PK local es 'local_id'
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id", // Mapea el atributo JS 'local_id' al campo DB 'local_id'
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

        // --- CAMPOS DE SINCRONIZACIÓN ---
        remote_id: { type: DataTypes.INTEGER, allowNull: true }, // ID del servidor remoto
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        }, // Bandera de estado
      },
      { timestamps: false, tableName: "Stores" }
    );

    // --- 2. Definición del Modelo: Profile (Perfiles de Usuarios) ---
    Profile = sequelize.define(
      "Profile",
      {
        // CAMBIO CRÍTICO: La PK local es 'local_id'
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id", // Mapea el atributo JS 'local_id' al campo DB 'local_id'
        },
        // NOTA: local_id ahora referencia a Store.local_id
        store_id: { type: DataTypes.INTEGER, allowNull: false },

        username: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
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

        // --- CAMPOS DE SINCRONIZACIÓN ---
        remote_id: { type: DataTypes.INTEGER, allowNull: true }, // ID del servidor remoto
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        }, // Bandera de estado
      },
      { timestamps: false, tableName: "Profiles" }
    );
    Inflow = sequelize.define(
      "Inflow",
      {
        // PK LOCAL: local_id
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        }, // Mapeo de nombre
        store_id: { type: DataTypes.INTEGER, allowNull: false },
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

    Sale = sequelize.define(
      "Sale",
      {
        // PK LOCAL: local_id
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        }, // Mapeo de nombre
        inflow_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Inflows.local_id
        total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        sale_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
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
    Category = sequelize.define(
      "Category",
      {
        category_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      { timestamps: false, tableName: "Categories" }
    );
    Store = sequelize.define(
      "Store",
      {
        local_id: {
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
    Profile = sequelize.define(
      "Profile",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        store_id: { type: DataTypes.INTEGER, allowNull: false },
        username: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
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
    Inflow = sequelize.define(
      "Inflow",
      {
        // PK REMOTA: local_id
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        store_id: { type: DataTypes.INTEGER, allowNull: false },
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

    Sale = sequelize.define(
      "Sale",
      {
        // PK REMOTA: local_id
        local_id: {
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

  Category.hasMany(Store, {
    foreignKey: "category_id", // Columna FK en la tabla Stores
    as: "stores",
    onDelete: "SET NULL", // Coincide con la migración SQL
  });
  Store.belongsTo(Category, { foreignKey: "category_id", as: "category" });
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

  // Inflow <-> Sale
  // La clave foránea apunta al campo local_id/local_id (depende del contexto)
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

    if (dialect === "sqlite") {
      await sequelize.sync({ force: true });
      const [tables] = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'SequelizeMeta';"
      );

      // 'tables' is an array of objects like: [{ name: 'Stores' }, { name: 'Profiles' }]
      const tableNames = tables.map((t) => t.name);

      console.log("--- SQLITE SCHEMA CHECK ---");
      console.log("Tablas creadas y encontradas:", tableNames);
      console.log("---------------------------");
      await seedInitialData(sequelize);
    }
    return sequelize;
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos:", error.message);
    throw error; // Lanza el error para que main.js lo capture
  }
}

async function seedInitialData(sequelize) {
  const categoryCount = await sequelize.models.Store.count();

  if (categoryCount === 0) {
    console.log("Seeding initial configuration data...");
    await sequelize.query(
      `
            INSERT INTO Categories (local_id, name,remote_id, is_synced) VALUES
            (1, 'Impresiones', 1, TRUE),
            (2, 'Kiosko', 2, TRUE);
        `,
      { type: sequelize.QueryTypes.INSERT }
    );

    // IMPORTANT: Because you are manually setting PKs (1, 2),
    // you MUST reset the SQLite autoincrement counter for safety.
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 2 WHERE name = 'Categories';"
    );
    // Use raw SQL for the initial data insertion
    await sequelize.query(
      `
            INSERT INTO Stores (local_id, name, location, category_id, created_at, remote_id, is_synced) VALUES
            (1, 'Boulevard Marítimo', 'Av. Costanera 123', 1, DATETIME('now'), 1, TRUE);
        `,
      { type: sequelize.QueryTypes.INSERT }
    );

    // IMPORTANT: Because you are manually setting PKs (1, 2),
    // you MUST reset the SQLite autoincrement counter for safety.
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 1 WHERE name = 'Stores';"
    );

    await sequelize.query(
      `
            INSERT INTO Profiles (local_id, store_id, username, role, pin, created_at, remote_id, is_synced) VALUES
            (1, 1, 'Cajero Inicial', 'cajero', '1579', DATETIME('now'), 1, TRUE),
            (2, 1, 'Admin Inicial', 'administrativo', '1452', DATETIME('now'),1, TRUE),
            (3, 1, 'Gerente Inicial', 'gerente', '7587', 1, DATETIME('now'), TRUE);
        `,
      { type: sequelize.QueryTypes.INSERT }
    );

    // IMPORTANT: Because you are manually setting PKs (1, 2),
    // you MUST reset the SQLite autoincrement counter for safety.
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 1 WHERE name = 'Profiles';"
    );

    console.log("Initial seeding complete.");
  }
}

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

async function deleteStore(storeId, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Store = sequelize.models.Store;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Store.update(
      { is_active: false, is_synced: false },
      {
        where: { local_id: storeId },
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

async function getProfiles(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    const rows = await Profile.findAll({
      where: {
        is_active: true,
        local_id: local_id,
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

async function createProfile(newProfile, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // newProfile debe ser un objeto que coincida con los campos del modelo
    // (local_id, username, role, pin, photo)
    const createdProfile = await Profile.create(newProfile);

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_profile(createdProfile.local_id, sequelize);
    }

    if (createdProfile.local_id) {
      console.log(`✅ Nuevo perfil creado con ID: ${createdProfile.local_id}`);
      return createdProfile.local_id;
    } else {
      throw new Error("Error desconocido al insertar el perfil.");
    }
  } catch (error) {
    console.error("Error al crear perfil (createProfile):", error.message);
    throw new Error("Error al consultar la base de datos.");
  }
}

async function getProfile(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // findByPk (Find By Primary Key)
    // 'include' realiza el JOIN automáticamente gracias a las asociaciones definidas.
    const profile = await Profile.findByPk(local_id, {
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

async function getProfileAndDailyInflowData(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  const Store = sequelize.models.Store;
  try {
    // --- QUERY 1: Obtener Perfil y Tienda (JOIN) ---
    const profileData = await Profile.findByPk(local_id, {
      include: { model: Store, as: "store" },
    });

    if (!profileData) {
      return null; // Perfil no encontrado
    }

    const storeId = profileData.local_id;

    // --- QUERY 2: Encontrar el último Inflow DE HOY ---

    // Lógica de fecha agnóstica al dialecto (MySQL/SQLite)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Inicio del día

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // Fin del día

    const inflow = await Inflow.findOne({
      where: {
        local_id: storeId,
        start_time: {
          [Op.between]: [todayStart, todayEnd], // [Op.gte]: todayStart
        },
      },
      order: [["start_time", "DESC"]],
      limit: 1,
    });

    let lastlocal_id = null;
    let salesData = [];
    let totalSalesAmount = 0;
    let salesCount = 0;
    let averageSale = 0;

    if (inflow) {
      lastlocal_id = inflow.id;

      // --- QUERY 3: Obtener todas las ventas de ese Inflow ---
      salesData = await Sale.findAll({
        where: { local_id: lastlocal_id },
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
      last_local_id: lastlocal_id,
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

async function deleteProfile(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Profile.update(
      { is_active: false, is_synced: false },
      {
        where: { local_id: local_id },
      }
    );

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_profile(local_id, sequelize);
    }
    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Perfil ${local_id} desactivado (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de desactivar perfil ${local_id}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al desactivar el perfil ${local_id}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

async function restoreProfile(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Profile.update(
      { is_active: true, is_synced: false },
      {
        where: { local_id: local_id },
      }
    );

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_profile(local_id, sequelize);
    }
    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Perfil ${local_id} restaurado (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de restaurar perfil ${local_id}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al restaurar el perfil ${local_id}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

async function restoreStore(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Store = sequelize.models.Store;
  try {
    // En lugar de Store.destroy, usamos Store.update para cambiar el campo is_active a false.
    const [affectedCount] = await Store.update(
      { is_active: true, is_synced: false },
      {
        where: { local_id: local_id },
      }
    );

    // 'affectedCount' será 1 si se actualizó una fila, o 0 si no se encontró el storeId.
    if (affectedCount > 0) {
      console.log(
        `✅ Tienda ${local_id} restaurado (is_active = FALSE) correctamente.`
      );
      return true;
    } else {
      console.warn(
        `⚠️ Intento de restaurar tienda ${local_id}, pero no se encontró.`
      );
      return false;
    }
  } catch (error) {
    // En la desactivación (UPDATE), el error de clave foránea ya NO es relevante,
    // porque el registro no se está eliminando; solo se está modificando un campo.
    console.error(
      `❌ Error al restaurar el tienda ${local_id}:`,
      error.message
    );

    // Lanzar un error genérico si el problema persiste (ej. conexión)
    throw new Error("Error al consultar la base de datos.");
  }
}

async function updateProfile(newProfile, sequelize) {
  const Profile = sequelize.models.Profile;
  try {
    // 1. Prepare the data to update (excluding the primary key from the data object)
    const updateData = {
      username: newProfile.username,
      pin: newProfile.pin,
      photo: newProfile.photo,
      is_synced: false,
    };

    // 2. Execute the update query
    // The result is an array: [affectedCount, affectedRows]
    // affectedCount is the number of rows updated (0 or 1 in this case).
    const [affectedCount] = await Profile.update(updateData, {
      where: {
        local_id: newProfile.local_id,
      },
    });

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_profile(newProfile.local_id, sequelize);
    }

    if (affectedCount > 0) {
      console.log(`✅ Profile ID ${newProfile.local_id} updated successfully.`);
      return true; // Or return the updated row count
    } else {
      console.warn(
        `⚠️ Profile ID ${newProfile.local_id} not found or no changes were made.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error updating profile ID ${newProfile.local_id}:`,
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
      is_active: newStore.is_active,
      is_synced: false,
    };

    // 2. Execute the update query
    // The result is an array: [affectedCount, affectedRows]
    // affectedCount is the number of rows updated (0 or 1).
    const [affectedCount] = await Store.update(updateData, {
      where: {
        local_id: newStore.local_id,
      },
    });

    if (affectedCount > 0) {
      console.log(`✅ Store ID ${newStore.local_id} updated successfully.`);
      return true;
    } else {
      console.warn(
        `⚠️ Store ID ${newStore.local_id} not found or no changes were submitted.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error updating store ID ${newStore.local_id}:`,
      error.message
    );
    // Note: You might want to handle unique constraint errors (e.g., duplicate 'name') here.
    throw new Error("Error updating the store in the database.");
  }
}

async function createInflow(newInflow, sequelize) {
  const Inflow = sequelize.models.Inflow;

  // Datos de la sesión de caja principal
  const inflowData = {
    local_id: newInflow.local_id,
    starting_cash: newInflow.starting_cash,
  };

  let localInflowRecord;
  let remotelocal_id = null; // PK de MariaDB

  try {
    localInflowRecord = await Inflow.create(inflowData);
    const local_id = localInflowRecord.local_id;

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_inflow(local_id, sequelize);
    }
    console.log(`✅ Sesión de caja local (Inflow ID ${local_id}) creada.`);
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
    localId: local_id,
    remoteId: remotelocal_id, // Null si falla/offline
  };
}

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

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_inflow(local_id, sequelize);
    }

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
        end_time: null,
        is_synced: false,
      },
      {
        where: {
          local_id: local_id,
          end_time: { [sequelize.Sequelize.Op.not]: null },
        },
      }
    );
    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_inflow(local_id, sequelize);
    }

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

async function createSale(local_id, newSale, sequelize) {
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

  const saleData = {
    local_id: local_id,
    total_amount: newSale.total_amount,

    remote_id: null,
  };

  let localSaleRecord;

  try {
    localSaleRecord = await SaleModel.create(saleData);
    const localSaleId = localSaleRecord.local_id;

    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_sale(localSaleId, sequelize);
    }
    console.log(
      `✅ Sale ID ${localSaleId} created locally for Inflow ${local_local_id}.`
    );

    return {
      success: true,
      localSaleId: localSaleId,
      remoteId: null,
    };
  } catch (error) {
    console.error("❌ FATAL: Error creating local Sale record.", error.message);
    throw new Error("Failed to save sale data locally.");
  }
}

async function readSales(local_id, sequelize) {
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
        local_id: local_id,
      },
      // Order by sale date or local ID to see them sequentially
      order: [["sale_date", "ASC"]],
    });

    // 3. Convert results to plain JavaScript objects for safe return (JSONify)
    const plainSales = sales.map((sale) => sale.toJSON());

    console.log(
      `✅ Read ${plainSales.length} sales for Inflow ID ${local_local_id}.`
    );

    return plainSales;
  } catch (error) {
    console.error(
      `❌ Error reading sales for Inflow ID ${local_local_id}:`,
      error.message
    );
    throw new Error("Error retrieving sale data from the local database.");
  }
}

async function unsync_cascade_up_from_sale(sale_local_id, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Retrieve Models
  const SaleModel = sequelize.models.Sale;
  const InflowModel = sequelize.models.Inflow;
  const StoreModel = sequelize.models.Store;

  if (!SaleModel || !InflowModel || !StoreModel) {
    throw new Error("Required models (Sale, Inflow, Store) are not defined.");
  }

  // --- A. Fetch Sale and its Inflow Parent ---

  const saleRecord = await SaleModel.findByPk(sale_local_id, {
    include: [
      {
        model: InflowModel,
        as: "inflow",
        attributes: ["local_id", "store_id"],
      },
    ],
  });

  if (!saleRecord) {
    return false;
  }

  const inflowRecord = saleRecord.inflow;

  if (!inflowRecord) {
    throw new Error(
      `Inflow record not found for Sale ID ${sale_local_id}. Data integrity issue.`
    );
  }

  const localInflowId = inflowRecord.local_id;
  const storeId = inflowRecord.store_id;

  // --- B. CASCADE 1: Inflow Parent (Inflow) ---
  try {
    await InflowModel.update(
      { is_synced: false },
      { where: { local_id: localInflowId } }
    );
  } catch (error) {
    // En un entorno productivo, se podría registrar el error en un sistema centralizado aquí.
  }

  // --- C. CASCADE 2: Store Parent ---
  try {
    await StoreModel.update(
      { is_synced: false },
      { where: { store_id: storeId } }
    );
  } catch (error) {
    // En un entorno productivo, se podría registrar el error en un sistema centralizado aquí.
  }

  return true;
}
async function unsync_cascade_up_from_inflow(local_inflow_id, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Recuperar Modelos
  const InflowModel = sequelize.models.Inflow;
  const StoreModel = sequelize.models.Store;

  if (!InflowModel || !StoreModel) {
    throw new Error("Required models (Inflow, Store) are not defined.");
  }

  // --- A. Fetch Inflow and its Store Parent ---

  // Fetch the Inflow record to get the store_id (the parent FK)
  const inflowRecord = await InflowModel.findByPk(local_inflow_id, {
    attributes: ["local_id", "store_id"], // Solo necesitamos los IDs
  });

  if (!inflowRecord) {
    // Si el Inflow no existe, no hay nada que desincronizar.
    return false;
  }

  const storeId = inflowRecord.store_id;

  // --- B. CASCADE 1: Unsync the Inflow Record Itself ---

  // La operación que disparó esta función ya debe haber establecido is_synced=false
  // (ej. openInflow, closeInflow). Aquí aseguramos que el estado quede registrado.
  try {
    await InflowModel.update(
      { is_synced: false },
      { where: { local_id: local_inflow_id } }
    );
  } catch (error) {
    // Este error es crítico, pero el proceso debe continuar la cascada.
    throw new Error(
      `Error updating Inflow ${local_inflow_id} status: ${error.message}`
    );
  }

  // --- C. CASCADE 2: Unsync the Store Parent ---
  try {
    await StoreModel.update(
      { is_synced: false }, // Establecer la tienda como pendiente de sincronizar
      { where: { store_id: storeId } }
    );
  } catch (error) {
    // En este punto, solo lanzamos el error si no se pudo actualizar el Store.
    throw new Error(`Error updating Store ${storeId} status: ${error.message}`);
  }

  return true;
}

async function unsync_cascade_up_from_profile(profile_local_id, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Recuperar Modelos
  const ProfileModel = sequelize.models.Profile;
  const StoreModel = sequelize.models.Store;

  if (!ProfileModel || !StoreModel) {
    throw new Error("Required models (Profile, Store) are not defined.");
  }

  // --- A. Fetch Profile and its Store Parent ID ---

  // Fetch the Profile record to get the store_id
  const profileRecord = await ProfileModel.findByPk(profile_local_id, {
    attributes: ["local_id", "store_id"], // Solo necesitamos el store_id
  });

  if (!profileRecord) {
    // Si el Perfil no existe, detenemos la cascada.
    return false;
  }

  const storeId = profileRecord.store_id;

  // --- B. CASCADE 1: Unsync the Profile Record Itself ---
  // Marcamos el Profile como pendiente de sincronizar (is_synced = FALSE)
  try {
    await ProfileModel.update(
      { is_synced: false },
      { where: { local_id: profile_local_id } }
    );
  } catch (error) {
    // Si falla la actualización del perfil, lanzamos el error para detener el proceso.
    throw new Error(
      `Error updating Profile ${profile_local_id} status: ${error.message}`
    );
  }

  // --- C. CASCADE 2: Unsync the Store Parent ---
  // Propagamos el cambio al Store padre
  try {
    await StoreModel.update(
      { is_synced: false },
      { where: { local_id: storeId } } // Usamos el local_id de la tienda
    );
  } catch (error) {
    // Si no se pudo actualizar el Store, lanzamos el error.
    throw new Error(`Error updating Store ${storeId} status: ${error.message}`);
  }

  return true;
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
