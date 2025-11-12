const {
  Sequelize,
  DataTypes,
  Model,
  Op,
  SequelizeForeignKeyConstraintError,
} = require("sequelize");

// Variables globales para la instancia de Sequelize y los modelos
// Se inicializarán en connectWithCredentials
let Store;
let Profile;
let Inflow;
let Sale;

/**
 * Define todos los modelos y sus asociaciones (relaciones).
 * Esta función se llama después de que se establece la conexión.
 */
function initModels(sequelize) {
  // --- 1. Definición del Modelo: Store (Tiendas) ---
  Store = sequelize.define(
    "Store",
    {
      store_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_id: {
        // Agregado para coincidir con SQL
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(100), // STRING(100) para UNIQUE
        allowNull: false,
        unique: true,
      },
      location: {
        // Agregado para coincidir con SQL
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        // Agregado para coincidir con SQL
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
      profile_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(50), // STRING(50) para UNIQUE
        allowNull: false,
        unique: true,
      },
      role: {
        // Mapeo del ENUM de SQL a STRING de Sequelize.
        // Sequelize lo convertirá a ENUM en MySQL/MariaDB.
        type: DataTypes.ENUM(
          "cajero",
          "administrativo",
          "subgerencia",
          "gerente"
        ),
        allowNull: false,
      },
      pin: {
        type: DataTypes.STRING(4), // VARCHAR(4)
        allowNull: false,
        defaultValue: "1234",
      },
      photo: {
        type: DataTypes.TEXT("long"), // Uso de LONGTEXT para fotos (DataURL grande)
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        // Agregado para coincidir con SQL
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    { timestamps: false, tableName: "Profiles" }
  );

  // --- 3. Definición del Modelo: Inflow (Sesiones de Caja) ---
  Inflow = sequelize.define(
    "Inflow",
    {
      inflow_id: {
        // Renombrado a 'inflow_id' para coincidir con el PK de SQL
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      profile_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Puede ser NULL en SQL
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      starting_cash: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    },
    { timestamps: false, tableName: "Inflows" }
  );

  // --- 4. Definición del Modelo: Sale (Ventas) ---
  Sale = sequelize.define(
    "Sale",
    {
      sale_id: {
        // Renombrado a 'sale_id' para coincidir con el PK de SQL
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      inflow_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      sale_date: {
        // Renombrado de 'sale_date' a 'sale_date' y tipo DATE
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      // ... otros campos de venta
    },
    { timestamps: false, tableName: "Sales" }
  );

  // --- Definición de Asociaciones (Relaciones) ---

  // Store <-> Profile
  Store.hasMany(Profile, {
    foreignKey: "store_id",
    as: "profiles",
    onDelete: "CASCADE",
  }); // onDelete: CASCADE
  Profile.belongsTo(Store, { foreignKey: "store_id", as: "store" });

  // Store <-> Inflow
  Store.hasMany(Inflow, {
    foreignKey: "store_id",
    as: "inflows",
    onDelete: "RESTRICT",
  }); // onDelete: RESTRICT
  Inflow.belongsTo(Store, { foreignKey: "store_id", as: "store" });

  // Profile <-> Inflow (Agregada para completar la FK)
  Profile.hasMany(Inflow, { foreignKey: "profile_id", as: "sessions" });
  Inflow.belongsTo(Profile, {
    foreignKey: "profile_id",
    as: "profile",
    onDelete: "SET NULL",
  }); // onDelete: SET NULL

  // Inflow <-> Sale
  Inflow.hasMany(Sale, {
    foreignKey: "inflow_id",
    as: "sales",
    onDelete: "CASCADE",
  }); // onDelete: CASCADE
  Sale.belongsTo(Inflow, { foreignKey: "inflow_id", as: "inflow" });

  // Devolvemos los modelos inicializados para que el 'setter' del módulo los almacene.
  return { Store, Profile, Inflow, Sale };
}
/**
 * Inicializa la conexión de Sequelize (MariaDB o SQLite).
 * Esta función debe ser llamada en main.js ANTES de cualquier operación de BD.
 */
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

/**
 * (Refactorizado) Obtiene todas las tiendas (Stores) activas.
 */
async function getStores(sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");

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

/**
 * (Refactorizado) Elimina una tienda.
 */
async function deleteStore(storeId) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");

  try {
    const result = await Store.destroy({
      where: { store_id: storeId },
    });

    if (result > 0) {
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

    // --- MANEJO DE ERROR CRÍTICO (Agnóstico al dialecto) ---
    // 'SequelizeForeignKeyConstraintError' es el error de Sequelize
    // cuando una clave foránea (FOREIGN KEY) previene la eliminación.
    if (error instanceof SequelizeForeignKeyConstraintError) {
      throw new Error(
        "No se puede eliminar la tienda porque tiene cajas o perfiles asociados."
      );
    }

    throw new Error("Error al consultar la base de datos.");
  }
}

/**
 * (Refactorizado) Obtiene perfiles activos de una tienda específica.
 */
async function getProfiles(store_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");

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

/**
 * (Refactorizado) Crea un nuevo perfil.
 */
async function createProfile(newProfile, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");

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

/**
 * (Refactorizado) Obtiene un perfil y la tienda asociada (JOIN).
 */
async function getProfile(profile_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");

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

/**
 * (Refactorizado) Función compleja de login/dashboard.
 */
async function getProfileAndDailyInflowData(profile_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
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

// Exporta las funciones refactorizadas
module.exports = {
  connectWithCredentials,
  getStores,
  deleteStore,
  getProfiles,
  createProfile,
  getProfile,
  getProfileAndDailyInflowData,
};
