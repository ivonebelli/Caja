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
    role ENUM('cajero', 'admin', 'manager') NOT NULL,
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
    inflow_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    profile_id INT, -- Opcional: El perfil que abrió la caja/sesión (puede ser nulo si es un ingreso automático)
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL, -- Puede ser NULL hasta que la sesión de caja se cierre
    starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Clave Foránea 1: store_id
    FOREIGN KEY (store_id) REFERENCES Stores(store_id)
        ON DELETE RESTRICT, -- No permite eliminar la Store si tiene Inflows activos.
        
    -- Clave Foránea 2: profile_id
    FOREIGN KEY (profile_id) REFERENCES Profiles(profile_id)
        ON DELETE SET NULL -- Si se elimina el Profile, el Inflow mantiene el registro con Profile_id=NULL.
);

-- 5. Tabla Sales (Ventas / Órdenes)
-- Relación: 1 Inflow tiene muchas Sales (pero el Inflow puede tener 0 sales)
CREATE TABLE IF NOT EXISTS dev_db.Sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    inflow_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Clave Foránea: inflow_id referencia a Inflows.inflow_id
    FOREIGN KEY (inflow_id) REFERENCES Inflows(inflow_id)
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

INSERT INTO Profiles (profile_id, store_id, username, role) VALUES
(1, 1, 'Juan Gonzalez', 'cajero'),
(2, 1, 'John Smith', 'cajero'),
(3, 2, 'Ricardo Haliburton', 'cajero'),
(4, 2, 'Pablo Smith', 'cajero');
