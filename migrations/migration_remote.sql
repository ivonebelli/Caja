-- ==============================================================================
-- UP MIGRATION: CREACIÓN DEL ESQUEMA Y TABLAS (PARA DB REMOTA - MARIA/MYSQL)
-- ==============================================================================

-- 1. Tabla Categories
CREATE TABLE IF NOT EXISTS Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Tabla Stores (Tiendas)    
CREATE TABLE IF NOT EXISTS Stores (
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
CREATE TABLE IF NOT EXISTS Profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    role ENUM('cajero', 'administrativo', 'subgerencia','gerente') NOT NULL,
    pin VARCHAR(4) NOT NULL DEFAULT '1234',
    photo LONGTEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (store_id) REFERENCES Stores(store_id)
        ON DELETE CASCADE 
);

-- 4. Tabla Inflows (Ingresos / Sesiones de Caja)
CREATE TABLE IF NOT EXISTS Inflows (
    -- CLAVE PRIMARIA ESTÁNDAR REMOTA
    inflow_id INT AUTO_INCREMENT PRIMARY KEY, 
    
    -- Campos de la Aplicación
    store_id INT NOT NULL, 
    profile_id INT, -- Reintegrado aquí
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- CLAVES FORÁNEAS
    FOREIGN KEY (store_id) REFERENCES Stores(store_id)
        ON DELETE RESTRICT,
        
    FOREIGN KEY (profile_id) REFERENCES Profiles(profile_id)
        ON DELETE SET NULL 
);

-- 5. Tabla Sales (Ventas / Órdenes)
CREATE TABLE IF NOT EXISTS Sales (
    -- CLAVE PRIMARIA ESTÁNDAR REMOTA
    sale_id INT AUTO_INCREMENT PRIMARY KEY, 
    
    -- Campos de la Aplicación
    inflow_id INT NOT NULL, 
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CLAVE FORÁNEA: referencia a Inflows.inflow_id (el PK estándar de esta BD)
    FOREIGN KEY (inflow_id) REFERENCES Inflows(inflow_id) 
        ON DELETE CASCADE
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