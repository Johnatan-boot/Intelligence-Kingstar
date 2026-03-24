-- ================================================================
-- Migration: adicionar tabelas deliveries e returns
-- Rodar após o kingstar_io_v2.sql base
-- ================================================================
USE kingstar_io;

CREATE TABLE IF NOT EXISTS deliveries (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  shipment_id    INT NOT NULL,
  status         ENUM('PENDING','IN_TRANSIT','DELIVERED','FAILED','RETURNED') DEFAULT 'PENDING',
  scheduled_date DATE,
  delivered_at   DATETIME,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

CREATE TABLE IF NOT EXISTS returns (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  status     ENUM('REQUESTED','APPROVED','REJECTED','COMPLETED') DEFAULT 'REQUESTED',
  reason     TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS return_items (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  return_id           INT NOT NULL,
  product_id          INT NOT NULL,
  quantity            INT NOT NULL,
  reason              TEXT,
  condition_on_return ENUM('GOOD','DAMAGED','EXPIRED') DEFAULT 'GOOD',
  FOREIGN KEY (return_id)  REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
