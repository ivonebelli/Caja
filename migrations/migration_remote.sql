-- ==============================================================================
-- UP MIGRATION: CREACIÓN DEL ESQUEMA Y TABLAS (PARA DB REMOTA - MARIA/MYSQL)
-- El ID de la categoría ahora se vincula al Producto (Artículos vendidos).
-- ==============================================================================

-- 1. Tabla Categories (Base de la jerarquía de productos)
CREATE TABLE IF NOT EXISTS Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS PaymentMediums (
    medium_id INT AUTO_INCREMENT PRIMARY KEY,
    medium_name VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Tabla Stores (Tiendas) - La FK de categoría HA SIDO ELIMINADA
CREATE TABLE IF NOT EXISTS Stores (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- 4. Tabla Products (Productos/Artículos)
-- 1 Producto pertenece a 1 Categoría
CREATE TABLE IF NOT EXISTS Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);

-- 5. Tabla Netflows (Ingresos / Sesiones de Caja)
CREATE TABLE IF NOT EXISTS Netflows (
    netflow_id INT AUTO_INCREMENT PRIMARY KEY, 
    store_id INT NOT NULL, 
    opening_description VARCHAR(255) NULL, 
    closing_description VARCHAR(255) NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    FOREIGN KEY (store_id) REFERENCES Stores(store_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (profile_id) REFERENCES Profiles(profile_id) -- Clave foránea previamente faltante
        ON DELETE SET NULL 
);

-- 6. Tabla Sales (Ventas / Órdenes) - Se mantiene el total de la orden
CREATE TABLE IF NOT EXISTS Sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY, 
    netflow_id INT NOT NULL, 
    medium_id INT NOT NULL, -- Reference to the new lookup table
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (netflow_id) REFERENCES Netflows(netflow_id) 
        ON DELETE CASCADE,
    FOREIGN KEY (medium_id) REFERENCES PaymentMediums(medium_id)
);

-- 7. Tabla SaleDetails (Detalles de Venta / Líneas de Producto)
-- 1 Venta tiene muchos SaleDetails (el nexo entre Sale y Product)
CREATE TABLE IF NOT EXISTS SaleDetails (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    
    FOREIGN KEY (sale_id) REFERENCES Sales(sale_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- ==============================================================================
-- SEEDING (DATOS INICIALES)
-- Los datos de categoría se ajustan para ser categorías reales.
-- ==============================================================================

INSERT INTO Categories (category_id, name) VALUES
(1, 'Impresiones'),
(2, 'Kiosko'),
(3, 'Panadería');

INSERT INTO Stores (store_id, name, location) VALUES
(1, 'Boulevard Marítimo', 'Av. Costanera 123'),
(2, 'PhotoStation', 'Calle Imagen 456');

INSERT INTO Products (product_id, category_id, name, price) VALUES
(1, 1, 'Impresión B/N A4', 10.50),
(2, 2, 'Golosina X', 50.00),
(3, 3, 'Medialuna', 80.00);


INSERT INTO Profiles (profile_id, store_id, username, role, pin) VALUES
(1, 1, 'Juan Gonzalez', 'cajero', 1234),
(2, 1, 'John Smith', 'cajero', 1234),
(3, 2, 'Ricardo Haliburton', 'cajero', 1234),
(4, 2, 'Pablo Smith', 'cajero', 1234);