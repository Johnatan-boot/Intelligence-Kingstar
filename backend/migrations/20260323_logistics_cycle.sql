-- migrations/20260323_logistics_cycle.sql
USE kingstar_io;

-- 1. Fornecedores
CREATE TABLE IF NOT EXISTS providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Pedidos de Compra (Purchase Orders)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    status ENUM('PLANNED', 'PURCHASED', 'IN_TRANSIT', 'RECEIVING', 'COMPLETED', 'DIVERGENT', 'CANCELLED') DEFAULT 'PLANNED',
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    expected_delivery_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id)
) ENGINE=InnoDB;

-- 3. Itens do Pedido de Compra
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_price DECIMAL(10, 2),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- 4. Sessões de Recebimento (Caminhões/Lotes)
CREATE TABLE IF NOT EXISTS receiving_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    invoice_number VARCHAR(50),
    license_plate VARCHAR(20),
    status ENUM('ARRIVED', 'IN_CONFERENCE', 'RELEASED', 'DIVERGENT') DEFAULT 'ARRIVED',
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
) ENGINE=InnoDB;

-- 5. Logs de Conferência (As 3 rodadas)
CREATE TABLE IF NOT EXISTS receiving_conferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    product_id INT NOT NULL,
    round_number INT NOT NULL, -- 1, 2 ou 3
    quantity_counted INT NOT NULL,
    user_id INT, -- Quem contou
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES receiving_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Seed inicial de fornecedor
INSERT IGNORE INTO providers (id, name, cnpj) VALUES (1, 'Colchões King Star Factory', '12.345.678/0001-90');
