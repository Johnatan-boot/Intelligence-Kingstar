-- ================================================================
-- KINGSTAR IO — SEED DE DADOS PARA TESTE
-- Execute: mysql -u root -p kingstar_io < seed.sql
-- ================================================================
USE kingstar_io;

-- Usuário admin (senha: admin123)
INSERT IGNORE INTO users (name, email, password_hash, role) VALUES
('Admin KINGSTAR', 'admin@kingstar.com',
 '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Warehouses
INSERT IGNORE INTO warehouses (id, name, address) VALUES
(1, 'CD Central', 'Rua Industrial, 100 - São Paulo'),
(2, 'CD Norte',   'Av. Norte, 500 - São Paulo');

-- Locations
INSERT IGNORE INTO locations (id, warehouse_id, code, aisle, rack, level) VALUES
(1, 1, 'A-01-01', 'A', '01', '01'),
(2, 1, 'A-01-02', 'A', '01', '02'),
(3, 1, 'B-02-01', 'B', '02', '01'),
(4, 2, 'C-01-01', 'C', '01', '01');

-- Categories
INSERT IGNORE INTO categories (id, name) VALUES
(1, 'Colchões'), (2, 'Box'), (3, 'Acessórios');

-- Products
INSERT IGNORE INTO products (id, sku, name, price, category_id) VALUES
(1, 'KS-1001', 'Colchão King Star Lux',  3500.00, 1),
(2, 'KS-1002', 'Cama Box Baú Casal',      1800.00, 2),
(3, 'KS-1003', 'Travesseiro NASA Gel',     300.00, 3),
(4, 'KS-1004', 'Protetor Impermeável',     200.00, 3),
(5, 'KS-1005', 'Pillow Top Queen',         600.00, 3);

-- Inventory
INSERT IGNORE INTO inventory (product_id, location_id, quantity, reserved_quantity) VALUES
(1, 1, 20, 2), (2, 1, 15, 0), (3, 2, 50, 5),
(4, 3, 30, 0), (5, 4, 25, 3);

-- Customers
INSERT IGNORE INTO customers (id, name, email, phone) VALUES
(1, 'João Silva',     'joao@email.com',   '11999990001'),
(2, 'Maria Santos',   'maria@email.com',  '11999990002'),
(3, 'Carlos Oliveira','carlos@email.com', '11999990003');

-- Orders com itens
INSERT IGNORE INTO orders (id, customer_id, status, total, created_at) VALUES
(1, 1, 'DELIVERED', 3800.00, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 2, 'CONFIRMED', 1800.00, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 3, 'PENDING',    900.00, DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT IGNORE INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 3500.00), (1, 3, 1, 300.00),
(2, 2, 1, 1800.00),
(3, 3, 2, 300.00), (3, 4, 1, 200.00), (3, 5, 1, 600.00);

UPDATE orders SET total = (SELECT SUM(quantity * price) FROM order_items WHERE order_id = orders.id);

-- Shipment para pedido entregue
INSERT IGNORE INTO shipments (id, order_id, carrier, tracking_code, status) VALUES
(1, 1, 'Correios', 'BR123456789', 'DELIVERED');

SELECT 'Seed executado com sucesso!' AS resultado;
SELECT 'Pedidos:' AS info, COUNT(*) AS total FROM orders;
SELECT 'Produtos:' AS info, COUNT(*) AS total FROM products;
SELECT 'Estoque:' AS info, COUNT(*) AS total FROM inventory;
