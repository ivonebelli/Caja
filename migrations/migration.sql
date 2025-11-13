-- ==============================================================================
-- UP MIGRATION: CREACIÓN DEL ESQUEMA Y TABLAS
-- ==============================================================================


CREATE TABLE IF NOT EXISTS dev_db.Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Tabla Stores (Tiendas)    
CREATE TABLE IF NOT EXISTS dev_db.Stores (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
        ON DELETE SET NULL
);

-- 3. Tabla Profiles (Perfiles de Usuarios/Cajeros)
-- Relación: 1 Store tiene muchos Profiles
CREATE TABLE IF NOT EXISTS dev_db.Profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    role ENUM('cajero', 'administrativo', 'subgerencia','gerente') NOT NULL,
    pin VARCHAR(4) NOT NULL DEFAULT '1234',
    photo LONGTEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Clave Foránea: store_id referencia a Stores.store_id
    -- Permite que Store tenga 0 Profiles (NULL es NOT NULL, pero la relación es 1 a M)
    FOREIGN KEY (store_id) REFERENCES Stores(store_id)
        ON DELETE CASCADE -- Si se elimina la Store, se eliminan los Profiles asociados.
);

-- 4. Tabla Inflows (Ingresos / Sesiones de Caja)
-- Relación: 1 Store tiene muchos Inflows
CREATE TABLE IF NOT EXISTS dev_db.Inflows (
    -- 1. CLAVE PRIMARIA LOCAL
    local_id INT AUTO_INCREMENT PRIMARY KEY, -- Renombrado para Claridad Local
    
    -- Campos de la Aplicación
    store_id INT NOT NULL, 
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- 2. CAMPOS DE SINCRONIZACIÓN
    remote_id INT NULL, -- ID asignado por el servidor MariaDB si la sincronización fue exitosa.
    is_synced BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE indica que está pendiente de enviar al servidor remoto.
    
    -- 3. CLAVES FORÁNEAS (usan el ID de la tabla Stores/Profiles, que debe ser el mismo en ambas DBs)
    FOREIGN KEY (store_id) REFERENCES Stores(store_id)
        ON DELETE RESTRICT,

);

-- 5. Tabla Sales (Ventas / Órdenes)
-- Relación: 1 Inflow tiene muchas Sales (pero el Inflow puede tener 0 sales)
CREATE TABLE IF NOT EXISTS dev_db.Sales (
    -- 1. CLAVE PRIMARIA LOCAL
    local_id INT AUTO_INCREMENT PRIMARY KEY, -- Nuevo PK para seguimiento local
    
    -- Campos de la Aplicación
    inflow_id INT NOT NULL, -- Ahora referencia a Inflows.local_id (o inflow_id si no se renombra)
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 2. CAMPOS DE SINCRONIZACIÓN
    remote_id INT NULL, -- ID asignado por el servidor MariaDB para este registro de venta.
    is_synced BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE indica que está pendiente de enviar a MariaDB.
    
    -- 3. CLAVE FORÁNEA
    -- NOTA: En la BD local, esta FK DEBERÍA apuntar a Inflows.local_id
    FOREIGN KEY (inflow_id) REFERENCES Inflows(local_id) 
        ON DELETE CASCADE -- Si la sesión de caja (Inflow) se anula, se anulan sus ventas.
);

-- SEEDING (DATOS INICIALES)

INSERT INTO Categories (category_id, name) VALUES
(1, 'Impresiones'),
(2, 'Kiosko'),
(3, 'Panadería');

INSERT INTO Stores (store_id, name, location, category_id) VALUES
(1, 'Boulevard Marítimo', 'Av. Costanera 123', 1),
(2, 'PhotoStation', 'Calle Imagen 456', 2);

INSERT INTO Profiles (profile_id, store_id, username, role, pin) VALUES
(1, 1, 'Juan Gonzalez', 'cajero', 1234),
(2, 1, 'John Smith', 'cajero', 1234),
(3, 2, 'Ricardo Haliburton', 'cajero', 1234),
(4, 2, 'Pablo Smith', 'cajero', 1234);
