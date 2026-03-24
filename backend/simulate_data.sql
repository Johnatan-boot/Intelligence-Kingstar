-- backend/simulate_data.sql
USE kingstar_io;

-- 2. Produtos Adicionais (Esquema real: id, sku, name, price)
INSERT IGNORE INTO products (id, sku, name, price) VALUES
(1, 'KS-1001', 'Colchão King Star Lux',  3500.00),
(2, 'KS-1002', 'Cama Box Baú Casal',      1800.00),
(3, 'KS-1003', 'Travesseiro NASA Gel',     300.00),
(4, 'KS-1004', 'Protetor Impermeável',     200.00),
(5, 'KS-1005', 'Pillow Top Queen',         600.00),
(6, 'KS-2001', 'Colchão President',        4500.00),
(7, 'KS-2002', 'Base Box Blindada',        1200.00);

-- Ensure warehouses exist
INSERT IGNORE INTO warehouses (id, name, address) VALUES
(1, 'CD Central', 'Rua Industrial, 100'),
(2, 'CD Norte',   'Av. Norte, 500');

-- Ensure locations exist (Esquema real: id, warehouse_id, code, aisle, rack, level)
INSERT IGNORE INTO locations (id, warehouse_id, code, aisle, rack, level) VALUES
(1, 1, 'A-01-01', 'A', '01', '01'),
(2, 1, 'A-01-02', 'A', '01', '02'),
(3, 1, 'B-02-01', 'B', '02', '01'),
(4, 2, 'C-01-01', 'C', '01', '01');

-- Ensure customers exist (Esquema real: id, name, email)
INSERT IGNORE INTO customers (id, name, email) VALUES
(1, 'João Silva',     'joao@email.com'),
(2, 'Maria Santos',   'maria@email.com'),
(3, 'Carlos Oliveira','carlos@email.com');

-- 3. Estoque Crítico e Normal
REPLACE INTO inventory (product_id, location_id, quantity, reserved_quantity) VALUES
(1, 1, 2,  0), -- Crítico
(2, 1, 15, 0), -- Normal
(3, 2, 80, 5), -- Alto
(4, 3, 1,  0), -- Crítico (Ruptura iminente)
(5, 4, 30, 3);

-- 4. Pedidos de Venda (Simulando KPI de Faturamento e Pedidos)
-- Status compatíveis com reports.service: CONFIRMED, DELIVERED, PENDING
INSERT IGNORE INTO orders (id, customer_id, status, total, created_at) VALUES
(101, 1, 'DELIVERED', 7000.00, CURDATE()),
(102, 2, 'CONFIRMED', 1800.00, CURDATE()),
(103, 3, 'PENDING',   4500.00, CURDATE()),
(104, 1, 'CONFIRMED', 1200.00, CURDATE());

INSERT IGNORE INTO order_items (order_id, product_id, quantity, price) VALUES
(101, 1, 2, 3500.00),
(102, 2, 1, 1800.00),
(103, 6, 1, 4500.00),
(104, 7, 1, 1200.00);

-- 5. Shipments (Expedição)
INSERT IGNORE INTO shipments (id, order_id, carrier, tracking_code, status) VALUES
(101, 101, 'Loggi', 'LG123456', 'DELIVERED'),
(102, 102, 'Rápido KS', 'KS987654', 'PREPARING'),
(103, 104, 'Direct', 'DR777888', 'SHIPPED');

-- 6. Fornecedores e Compras (Logística)
INSERT IGNORE INTO providers (id, name, cnpj) VALUES 
(1, 'King Star Factory', '12.345.678/0001-90'),
(2, 'Tecidos Premium S.A', '98.765.432/0001-00');

INSERT IGNORE INTO purchase_orders (id, provider_id, status, total_amount, expected_delivery_date) VALUES
(501, 1, 'RECEIVING',  10500.00, CURDATE()),
(502, 2, 'PURCHASED',  5000.00,  DATE_ADD(CURDATE(), INTERVAL 2 DAY)),
(503, 1, 'DIVERGENT',  3600.00,  DATE_SUB(CURDATE(), INTERVAL 1 DAY));

INSERT IGNORE INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered) VALUES
(501, 1, 3), (502, 4, 10), (503, 3, 12);

-- 7. Lote de Recebimento Ativo
INSERT IGNORE INTO receiving_batches (id, purchase_order_id, invoice_number, license_plate, status) VALUES
(1, 501, 'NF-8899', 'KS-2026', 'IN_CONFERENCE'),
(2, 503, 'NF-7700', 'XP-9988', 'DIVERGENT');
