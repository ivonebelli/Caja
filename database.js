const { Sequelize, DataTypes, Op } = require("sequelize");
/**
 * Define todos los modelos y sus asociaciones (relaciones).
 * Esta función se llama después de que se establece la conexión.
 */
function initModels(sequelize) {
  // Obtenemos el dialecto de la instancia de conexión actual
  const dialect = sequelize.options.dialect;

  // Es vital requerir Sequelize y DataTypes si no están en el scope
  let Store,
    Profile,
    Netflow,
    Sale,
    Category,
    Product,
    SaleDetail,
    Inflow,
    Expense;

  const isLocal = dialect === "sqlite";

  // ====================================================================
  // 1. Lógica para SQLite (DB Local): Con campos de sincronización
  // ====================================================================
  if (isLocal) {
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
        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Categories" }
    );

    // --- PRODUCT (NUEVO) ---
    Product = sequelize.define(
      "Product",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        category_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Category
        name: { type: DataTypes.STRING(100), allowNull: false },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Products" }
    );

    // --- STORE (Sin category_id) ---
    Store = sequelize.define(
      "Store",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        location: { type: DataTypes.STRING(255), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Stores" }
    );

    // --- PROFILE ---
    Profile = sequelize.define(
      "Profile",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
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

        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Profiles" }
    );

    // --- INFLOW (profile_id ELIMINADO) ---
    Netflow = sequelize.define(
      "Netflow",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        store_id: { type: DataTypes.INTEGER, allowNull: false },
        opening_description: { type: DataTypes.STRING(255), allowNull: true },
        closing_description: { type: DataTypes.STRING(255), allowNull: true },
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

        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Netflows" }
    );

    // --- SALE DETAIL (Tabla de Unión) ---
    SaleDetail = sequelize.define(
      "SaleDetail",
      {
        detail_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        sale_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Sale
        product_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Product
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      },
      { timestamps: true, tableName: "SaleDetails" }
    );

    // --- SALE ---
    Sale = sequelize.define(
      "Sale",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        netflow_id: { type: DataTypes.INTEGER, allowNull: false },
        total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        sale_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },

        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Sales" }
    );
    Inflow = sequelize.define(
      "Inflow",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        description: { type: DataTypes.STRING(255), allowNull: true },
        netflow_id: { type: DataTypes.INTEGER, allowNull: false },
        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Inflows" }
    );
    Expense = sequelize.define(
      "Expense",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "local_id",
        },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        description: { type: DataTypes.STRING(255), allowNull: true },
        netflow_id: { type: DataTypes.INTEGER, allowNull: false },
        remote_id: { type: DataTypes.INTEGER, allowNull: true },
        is_synced: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      { timestamps: true, tableName: "Expenses" }
    );
    // FIXME modelos remotos no estan actualizados al nuevo schema
  } else {
    // --- CATEGORY (Estándar) ---
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
      { timestamps: true, tableName: "Categories" }
    );

    // --- PRODUCT (NUEVO - Estándar) ---
    Product = sequelize.define(
      "Product",
      {
        product_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        category_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Category
        name: { type: DataTypes.STRING(100), allowNull: false },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      },
      { timestamps: true, tableName: "Products" }
    );

    // --- STORE (Estándar - Sin category_id) ---
    Store = sequelize.define(
      "Store",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        location: { type: DataTypes.STRING(255), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      { timestamps: true, tableName: "Stores" }
    );

    // --- PROFILE ---
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
      },
      { timestamps: true, tableName: "Profiles" }
    );

    // --- INFLOW (profile_id ELIMINADO) ---
    Netflow = sequelize.define(
      "Netflow",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        store_id: { type: DataTypes.INTEGER, allowNull: false },

        opening_description: { type: DataTypes.STRING(255), allowNull: true },
        closing_description: { type: DataTypes.STRING(255), allowNull: true },
        // profile_id ELIMINADO
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
      { timestamps: true, tableName: "Netflows" }
    );

    // --- SALE DETAIL (NUEVO - Estándar) ---
    SaleDetail = sequelize.define(
      "SaleDetail",
      {
        detail_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        sale_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Sale
        product_id: { type: DataTypes.INTEGER, allowNull: false }, // FK a Product
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      },
      { timestamps: true, tableName: "SaleDetails" }
    );

    // --- SALE ---
    Sale = sequelize.define(
      "Sale",
      {
        local_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        netflow_id: { type: DataTypes.INTEGER, allowNull: false },
        total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        sale_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      },
      { timestamps: true, tableName: "Sales" }
    );
  }

  // ====================================================================
  // C. ASOCIACIONES (profile <-> netflow ELIMINADA)
  // ====================================================================

  // Category <-> Product
  Category.hasMany(Product, { foreignKey: "category_id", as: "products" });
  Product.belongsTo(Category, { foreignKey: "category_id", as: "category" });

  // Sale <-> Product (Via SaleDetail - Mucho a Muchos)
  Sale.hasMany(SaleDetail, {
    foreignKey: "sale_id",
    as: "details",
    onDelete: "CASCADE",
  });
  SaleDetail.belongsTo(Sale, { foreignKey: "sale_id", as: "sale" });

  Product.belongsTo(SaleDetail, {
    foreignKey: "product_id",
    as: "sale_details",
  });
  SaleDetail.hasMany(Product, { foreignKey: "product_id", as: "product" });

  // Store <-> Profile
  Store.hasMany(Profile, {
    foreignKey: "store_id",
    as: "profiles",
    onDelete: "CASCADE",
  });
  Profile.belongsTo(Store, { foreignKey: "store_id", as: "store" });

  // Store <-> Netflow
  Store.hasMany(Netflow, {
    foreignKey: "store_id",
    as: "netflows",
    onDelete: "RESTRICT",
  });
  Netflow.belongsTo(Store, { foreignKey: "store_id", as: "store" });

  // Netflow <-> Sale
  Netflow.hasMany(Sale, {
    foreignKey: "netflow_id",
    as: "sales",
    onDelete: "CASCADE",
  });
  Sale.belongsTo(Netflow, { foreignKey: "netflow_id", as: "netflow" });

  Netflow.hasMany(Expense, {
    foreignKey: "netflow_id",
    as: "expenses",
    onDelete: "CASCADE",
  });
  Expense.belongsTo(Netflow, { foreignKey: "netflow_id", as: "netflow" });

  Netflow.hasMany(Inflow, {
    foreignKey: "netflow_id",
    as: "inflows",
    onDelete: "CASCADE",
  });
  Inflow.belongsTo(Netflow, { foreignKey: "netflow_id", as: "netflow" });

  return {
    Store,
    Profile,
    Netflow,
    Sale,
    Category,
    Product,
    SaleDetail,
    Inflow,
    Expense,
  };
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

    // Inicializa los modelos
    initModels(sequelize);

    if (dialect === "sqlite") {
      await sequelize.sync({ force: true });

      await seedInitialData(sequelize);
    }
    return sequelize;
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos:", error.message);
    throw error; // Lanza el error para que main.js lo capture
  }
}

async function seedInitialData(sequelize) {
  // Usamos esta constante para referenciar la hora actual en las inserciones RAW SQL
  const NOW_SQL = "DATETIME('now')";

  // Asumimos que los modelos ya están inicializados en sequelize.models
  const StoreModel = sequelize.models.Store;

  // Verificamos si las tiendas existen. Si no, significa que la BD está vacía.
  const storeCount = await StoreModel.count();

  if (storeCount === 0) {
    // --- 1. CATEGORIES ---
    // Insertamos createdAt y marcamos como ya sincronizado
    await sequelize.query(
      `
            INSERT INTO Categories (local_id, name, remote_id, is_synced, createdAt, updatedAt) VALUES
    (1, 'Impresiones', 1, TRUE, DATETIME('now'), DATETIME('now'));
            `,
      { type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 1 WHERE name = 'Categories';"
    );

    // --- 2. PRODUCTS (NUEVO) ---
    await sequelize.query(
      `
            INSERT INTO Products (local_id, category_id, name, price, remote_id, is_synced, createdAt, updatedAt) VALUES
            (1, 1, 'Cuaderno', 10.50, 1, TRUE, DATETIME('now'), DATETIME('now'));

            `,
      { type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 1 WHERE name = 'Products';"
    );

    // --- 3. STORES (Tiendas - Sin category_id) ---
    await sequelize.query(
      `
            INSERT INTO Stores (local_id, name, location,remote_id, is_synced, createdAt, updatedAt) VALUES
            (1, 'Boulevard Marítimo', 'Av. Costanera 123', 1, TRUE, DATETIME('now'), DATETIME('now')),
            (2, 'PhotoStation', 'Calle Imagen 456',  2, TRUE, DATETIME('now'), DATETIME('now'));
            `,
      { type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 2 WHERE name = 'Stores';"
    );

    // --- 4. PROFILES (Perfiles) ---
    // Corregido: Se añade createdAt explícitamente.
    // Asumimos que todos pertenecen al store_id: 1, 2, 3 que existe localmente.
    await sequelize.query(
      `
            INSERT INTO Profiles (local_id, store_id, username, role, pin,remote_id, is_synced, createdAt, updatedAt) VALUES
            (1, 1, 'Juan Gonzalez', 'cajero', '1234', 1, TRUE, DATETIME('now'), DATETIME('now')),
            (2, 1, 'John Smith', 'cajero', '1234', 2, TRUE, DATETIME('now'), DATETIME('now')),
            (3, 2, 'Ricardo Haliburton', 'cajero', '1234',  3, TRUE, DATETIME('now'), DATETIME('now')),
            (4, 2, 'Pablo Smith', 'cajero', '1234', 4, TRUE, DATETIME('now'), DATETIME('now'));
            `,
      { type: sequelize.QueryTypes.INSERT }
    );
    await sequelize.query(
      "UPDATE sqlite_sequence SET seq = 4 WHERE name = 'Profiles';"
    );

    // No hay seeding para Netflows o Sales, ya que se crean en tiempo de ejecución.
  }
}

async function getStores(sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Store = sequelize.models.Store;
  try {
    const rows = await Store.findAll({
      where: { is_active: true },
    });

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
      return true;
    } else {
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

async function getProfiles(store_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  try {
    const rows = await Profile.findAll(
      { raw: true, logging: console.log },
      {
        where: { store_id: store_id },
      }
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
  const Store = sequelize.models.Store;
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

    // Sequelize devuelve un solo objeto (o null) con findByPk
    return profile ? [profile] : []; // Mantenemos el formato de array de tu código original
  } catch (error) {
    console.error("Error al obtener perfil (GetProfile):", error.message);
    throw new Error("Error al consultar la base de datos.");
  }
}

async function getProfileAndDailyNetflowData(local_id, sequelize) {
  if (!sequelize) throw new Error("La base de datos no está inicializada.");
  const Profile = sequelize.models.Profile;
  const Store = sequelize.models.Store;
  const Netflow = sequelize.models.Netflow;
  const Sale = sequelize.models.Sale;
  const Expense = sequelize.models.Expense;
  const Inflow = sequelize.models.Inflow;
  const SaleDetail = sequelize.models.SaleDetail;
  const Product = sequelize.models.Product;

  try {
    // --- QUERY 1: Obtener Perfil y Tienda (JOIN) ---
    const profileData = await Profile.findByPk(local_id, {
      include: { model: Store, as: "store" },
    });

    if (!profileData) {
      return null; // Perfil no encontrado
    }

    const storeId = profileData.store_id;

    // --- QUERY 2: Encontrar el último Netflow DE HOY ---

    // Lógica de fecha agnóstica al dialecto (MySQL/SQLite)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Inicio del día

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // Fin del día

    let netflow = await Netflow.findOne({
      where: {
        store_id: storeId,
        start_time: {
          [Op.gte]: todayStart, // Start of today
          [Op.lt]: todayEnd, // Start of tomorrow
        },
      },
      order: [["start_time", "DESC"]],
      limit: 1,
      include: [
        {
          model: Sale,
          as: "sales",
          include: [
            {
              model: SaleDetail,
              as: "details",
              include: [
                {
                  model: Product,
                  as: "product",
                },
              ],
            },
          ],
        },

        {
          model: Expense,
          as: "expenses",
        },

        {
          model: Inflow,
          as: "inflows",
        },
      ],
    });
    let netflow_id = null;
    let salesData = [];
    let totalSalesAmount = 0;
    let salesCount = 0;
    let averageSale = 0;

    if (netflow) {
      netflow_id = netflow.local_id;
      // Convert to plain object for easier manipulation
      const netflowData = netflow.toJSON();

      // --- 1. Sales Aggregation ---
      const salesList = netflowData.sales || [];
      const salesCount = salesList.length;

      const totalSalesAmount = salesList.reduce(
        (sum, sale) => sum + parseFloat(sale.total_amount),
        0
      );

      const salesAverage = salesCount > 0 ? totalSalesAmount / salesCount : 0;

      // --- 2. Inflow Aggregation ---
      const totalInflowAmount = (netflowData.inflows || []).reduce(
        (sum, inflow) => sum + parseFloat(inflow.amount),
        0
      );

      // --- 3. Expense Aggregation ---
      const totalExpenseAmount = (netflowData.expenses || []).reduce(
        (sum, expense) => sum + parseFloat(expense.amount),
        0
      );

      // --- 4. Attach Summary Data ---
      netflowData.sales_summary = {
        count: salesCount,
        total: parseFloat(totalSalesAmount.toFixed(2)),
        average: parseFloat(salesAverage.toFixed(2)),
      };

      netflowData.inflow_total = parseFloat(totalInflowAmount.toFixed(2));
      netflowData.expense_total = parseFloat(totalExpenseAmount.toFixed(2));

      return netflowData;
    }

    const profileJSON = profileData.toJSON();

    let data = {
      profile: profileJSON, // Objeto Sequelize (puedes usar profileData.toJSON() si es necesario)
      netflow_id: netflow_id,
      netflow_data: netflow,
      sales_summary: {
        total_amount: parseFloat(totalSalesAmount.toFixed(2)),
        count: salesCount,
        average_sale: parseFloat(averageSale.toFixed(2)),
      },
      sales_list: salesData,
    };

    // Devolvemos la misma estructura de objeto que tu código original
    return data;
  } catch (error) {
    console.error(
      "Error al obtener datos (getProfileAndDailyNetflowData):",
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

async function createNetflow(newNetflow, sequelize) {
  const Netflow = sequelize.models.Netflow;
  // Datos de la sesión de caja principal
  const netflowData = {
    store_id: newNetflow.store_id,
    starting_cash: newNetflow.starting_cash,
    opening_description: newNetflow.opening_description,
  };

  let localNetflowRecord;
  let remotelocal_id = null; // PK de MariaDB

  try {
    localNetflowRecord = await Netflow.create(netflowData);
    const local_id = localNetflowRecord.local_id;
    if (sequelize.dialect === "sqlite") {
      unsync_cascade_up_from_netflow(local_id, sequelize);
    }

    return {
      local_id: local_id,
      initial_amount: newNetflow.starting_cash,
      createdAt: localNetflowRecord.start_time,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Fallo al guardar la sesión de caja localmente.");
  }
}

async function closeNetflow(local_id, sequelize) {
  if (!sequelize) {
    throw new Error("Local database connection is not initialized.");
  }

  // 1. Retrieve the specific model from the Sequelize instance
  // NOTE: 'Netflow' must match the name used in sequelize.define()
  const NetflowModel = sequelize.models.Netflow;

  if (!NetflowModel) {
    throw new Error(
      "Netflow model is not defined on the local Sequelize instance."
    );
  }

  const now = new Date();

  try {
    // 2. Execute the update using the retrieved model
    const [affectedCount] = await NetflowModel.update(
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
      unsync_cascade_up_from_netflow(local_id, sequelize);
    }

    if (affectedCount > 0) {
      return true;
    } else {
      console.warn(
        `⚠️ Netflow Local ID ${local_id} not found or already closed.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error closing Netflow Local ID ${local_id}:`,
      error.message
    );
    throw new Error("Error updating the local cash session.");
  }
}

async function reopenNetflow(local_id, sequelize) {
  // El parámetro ahora se llama 'sequelize'
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Obtener el modelo Netflow de la instancia Sequelize
  // Nota: Asumimos que el modelo fue definido como 'Netflow'
  const NetflowModel = sequelize.models.Netflow;

  if (!NetflowModel) {
    throw new Error(
      "Netflow model is not defined on the local Sequelize instance."
    );
  }

  try {
    // 2. Ejecutar la actualización (Reabrir Netflow)
    const [affectedCount] = await NetflowModel.update(
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
      unsync_cascade_up_from_netflow(local_id, sequelize);
    }

    if (affectedCount > 0) {
      return true;
    } else {
      console.warn(
        `⚠️ Netflow Local ID ${local_id} no encontrado o ya estaba abierto.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error al reabrir Netflow Local ID ${local_id}:`,
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

    return plainSales;
  } catch (error) {
    console.error(
      `❌ Error reading sales for Netflow ID ${local_local_id}:`,
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
  const NetflowModel = sequelize.models.Netflow;
  const StoreModel = sequelize.models.Store;

  if (!SaleModel || !NetflowModel || !StoreModel) {
    throw new Error("Required models (Sale, Netflow, Store) are not defined.");
  }

  // --- A. Fetch Sale and its Netflow Parent ---

  const saleRecord = await SaleModel.findByPk(sale_local_id, {
    include: [
      {
        model: NetflowModel,
        as: "netflow",
        attributes: ["local_id", "store_id"],
      },
    ],
  });

  if (!saleRecord) {
    return false;
  }

  const netflowRecord = saleRecord.netflow;

  if (!netflowRecord) {
    throw new Error(
      `Netflow record not found for Sale ID ${sale_local_id}. Data integrity issue.`
    );
  }

  const localNetflowId = netflowRecord.local_id;
  const storeId = netflowRecord.store_id;

  // --- B. CASCADE 1: Netflow Parent (Netflow) ---
  try {
    await NetflowModel.update(
      { is_synced: false },
      { where: { local_id: localNetflowId } }
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
async function unsync_cascade_up_from_netflow(local_netflow_id, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }

  // 1. Recuperar Modelos
  const NetflowModel = sequelize.models.Netflow;
  const StoreModel = sequelize.models.Store;

  if (!NetflowModel || !StoreModel) {
    throw new Error("Required models (Netflow, Store) are not defined.");
  }

  // --- A. Fetch Netflow and its Store Parent ---

  // Fetch the Netflow record to get the store_id (the parent FK)
  const netflowRecord = await NetflowModel.findByPk(local_netflow_id, {
    attributes: ["local_id", "store_id"], // Solo necesitamos los IDs
  });

  if (!netflowRecord) {
    // Si el Netflow no existe, no hay nada que desincronizar.
    return false;
  }

  const storeId = netflowRecord.store_id;

  // --- B. CASCADE 1: Unsync the Netflow Record Itself ---

  // La operación que disparó esta función ya debe haber establecido is_synced=false
  // (ej. openNetflow, closeNetflow). Aquí aseguramos que el estado quede registrado.
  try {
    await NetflowModel.update(
      { is_synced: false },
      { where: { local_id: local_netflow_id } }
    );
  } catch (error) {
    // Este error es crítico, pero el proceso debe continuar la cascada.
    throw new Error(
      `Error updating Netflow ${local_netflow_id} status: ${error.message}`
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

async function getSales(netflow_id, sequelize) {
  if (!sequelize) {
    throw new Error(
      "Local database connection (sequelize) is not initialized."
    );
  }
  const Sale = sequelize.models.Sale;

  salesData = await Sale.findAll({
    where: { netflow_id: netflow_id },
    include: [
      {
        model: SaleDetail, // 1. Include the SaleDetail model
        as: "SaleDetails", // Use the alias defined in Sale.hasMany(SaleDetail, { as: 'SaleDetails' })
        include: [
          {
            model: Product, // 2. Include the Product model inside SaleDetail
            as: "Product", // Use the alias defined in SaleDetail.belongsTo(Product, { as: 'Product' })
          },
        ],
      },
    ],
  });

  return salesData;
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

async function getLastNetflow(store_id, sequelize) {
  const Netflow = sequelize.models.Store;

  try {
    const lastNetflow = await Netflow.findOne({
      // Filter by the specific store ID
      where: {
        store_id: store_id,
      },
      order: [["createdAt", "DESC"]],
      limit: 1,
    });

    return lastNetflow;
  } catch (error) {
    console.error("Error fetching last netflow for store:", error);
    throw error;
  }
}
module.exports = {
  connectWithCredentials,
  getStores,
  deleteStore,
  getProfiles,
  createProfile,
  getProfile,
  getProfileAndDailyNetflowData,
  deleteProfile,
  restoreProfile,
  restoreStore,
  updateProfile,
  updateStore,
  createNetflow,
  closeNetflow,
  reopenNetflow,
  createSale,
  readSales,
  getLastNetflow,
  getSales,
};
