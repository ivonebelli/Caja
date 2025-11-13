-- ==============================================================================
-- UP MIGRATION: CREACIÓN DEL ESQUEMA Y TABLAS (PARA DB LOCAL/SQLITE)
-- TODAS LAS TABLAS TIENEN CAMPOS DE SINCRONIZACIÓN
-- ==============================================================================

-- 1. Tabla Categories (ID de configuración con sincronización)
CREATE TABLE IF NOT EXISTS Categories (
    local_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Campos de Sincronización
    remote_id INT NULL, 
    is_synced BOOLEAN NOT NULL DEFAULT FALSE 
);

-- 2. Tabla Stores (Tiendas)    
CREATE TABLE IF NOT EXISTS Stores (
    local_id INT AUTO_INCREMENT PRIMARY KEY,
    -- FK que apunta al ID local de Categories
    category_id INT NULL, 
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Campos de Sincronización
    remote_id INT NULL, 
    is_synced BOOLEAN NOT NULL DEFAULT FALSE, 

    -- FKs ahora apuntan a local_id
    FOREIGN KEY (category_id) REFERENCES Categories(local_id)
        ON DELETE SET NULL
);

-- 3. Tabla Profiles (Perfiles de Usuarios/Cajeros)
CREATE TABLE IF NOT EXISTS Profiles (
    local_id INT AUTO_INCREMENT PRIMARY KEY,
    -- FK que apunta al ID local de Stores
    store_id INT NOT NULL, 
    username VARCHAR(50) NOT NULL UNIQUE,
    role ENUM('cajero', 'administrativo', 'subgerencia','gerente') NOT NULL,
    pin VARCHAR(4) NOT NULL DEFAULT '1234',
    photo LONGTEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Campos de Sincronización
    remote_id INT NULL, 
    is_synced BOOLEAN NOT NULL DEFAULT FALSE, 

    -- Clave Foránea a Stores(local_id)
    FOREIGN KEY (store_id) REFERENCES Stores(local_id)
        ON DELETE CASCADE
);

-- 4. Tabla Inflows (Ingresos / Sesiones de Caja)
CREATE TABLE IF NOT EXISTS Inflows (
    local_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- FKs que apuntan a IDs locales
    store_id INT NOT NULL, 
    
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- CAMPOS DE SINCRONIZACIÓN
    remote_id INT NULL, 
    is_synced BOOLEAN NOT NULL DEFAULT FALSE, 
    
    -- Claves Foráneas
    FOREIGN KEY (store_id) REFERENCES Stores(local_id)
        ON DELETE RESTRICT,

);

-- 5. Tabla Sales (Ventas / Órdenes)
CREATE TABLE IF NOT EXISTS Sales (
    local_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- FK que apunta al ID local de Inflows
    inflow_id INT NOT NULL, 
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CAMPOS DE SINCRONIZACIÓN
    remote_id INT NULL, 
    is_synced BOOLEAN NOT NULL DEFAULT FALSE, 
    
    -- Clave Foránea
    FOREIGN KEY (inflow_id) REFERENCES Inflows(local_id) 
        ON DELETE CASCADE
);

-- ==============================================================================
-- SEEDING (DATOS INICIALES)
-- ==============================================================================

-- IMPORTANTE: Los datos de SEEDING ahora DEBEN incluir valores para los nuevos PK (local_id) 
-- y para los FKs que usan local_id. En este caso, asumimos que los IDs coinciden 1:1.

INSERT INTO Categories (local_id, name, remote_id, is_synced) VALUES
(1, 'Impresiones', 1, TRUE),
(2, 'Kiosko', 2, TRUE),
(3, 'Panadería', 3, TRUE);

INSERT INTO Stores (local_id, name, location, category_id, remote_id, is_synced) VALUES
(1, 'Boulevard Marítimo', 'Av. Costanera 123', 1, 1, TRUE),
(2, 'PhotoStation', 'Calle Imagen 456', 2, 2, TRUE);

INSERT INTO Profiles (local_id, store_id, username, role, pin, remote_id, is_synced) VALUES
(1, 1, 'Juan Gonzalez', 'cajero', '1234', 1, TRUE),
(2, 1, 'John Smith', 'cajero', '1234', 2, TRUE),
(3, 2, 'Ricardo Haliburton', 'cajero', '1234', 3, TRUE),
(4, 2, 'Pablo Smith', 'cajero', '1234', 4, TRUE);