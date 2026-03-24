// migrate.js — rode com: node migrate.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'kingstar_io',
  multipleStatements: true,
});

console.log('\n🔌 Conectado ao banco:', process.env.DB_NAME || 'kingstar_io');
console.log('⏳ Executando migration...\n');

const steps = [
  {
    name: 'tabela shipments',
    sql: `
      CREATE TABLE IF NOT EXISTS shipments (
        id                 INT AUTO_INCREMENT PRIMARY KEY,
        order_id           INT NOT NULL,
        carrier            VARCHAR(100),
        tracking_code      VARCHAR(100),
        status             ENUM('PREPARING','SHIPPED','IN_TRANSIT','DELIVERED','FAILED') DEFAULT 'PREPARING',
        estimated_delivery DATE,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );
    `,
  },
  {
    name: 'tabela deliveries',
    sql: `
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
    `,
  },
  {
    name: 'tabela returns',
    sql: `
      CREATE TABLE IF NOT EXISTS returns (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        order_id   INT NOT NULL,
        status     ENUM('REQUESTED','APPROVED','REJECTED','COMPLETED') DEFAULT 'REQUESTED',
        reason     TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );
    `,
  },
  {
    name: 'tabela return_items',
    sql: `
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
    `,
  },
  {
    name: 'tabela inventory_movements',
    sql: `
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        product_id   INT NOT NULL,
        location_id  INT NOT NULL,
        type         ENUM('IN','OUT','ADJUST') NOT NULL,
        quantity     INT NOT NULL,
        reason       VARCHAR(255),
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory(id),
        FOREIGN KEY (product_id)   REFERENCES products(id),
        FOREIGN KEY (location_id)  REFERENCES locations(id)
      );
    `,
  },
  {
    name: 'tabela picking_orders',
    sql: `
      CREATE TABLE IF NOT EXISTS picking_orders (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        order_id   INT NOT NULL,
        status     ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );
    `,
  },
  {
    name: 'tabela picking_items',
    sql: `
      CREATE TABLE IF NOT EXISTS picking_items (
        id                 INT AUTO_INCREMENT PRIMARY KEY,
        picking_order_id   INT NOT NULL,
        product_id         INT NOT NULL,
        location_id        INT NOT NULL,
        quantity_requested INT NOT NULL,
        quantity_picked    INT DEFAULT 0,
        status             ENUM('PENDING','PARTIAL','PICKED') DEFAULT 'PENDING',
        FOREIGN KEY (picking_order_id) REFERENCES picking_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id)       REFERENCES products(id),
        FOREIGN KEY (location_id)      REFERENCES locations(id)
      );
    `,
  },
  {
    name: 'tabela providers',
    sql: `
      CREATE TABLE IF NOT EXISTS providers (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        cnpj         VARCHAR(20) UNIQUE,
        contact_name VARCHAR(100),
        email        VARCHAR(100),
        phone        VARCHAR(20),
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    name: 'tabela purchase_orders',
    sql: `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id                     INT AUTO_INCREMENT PRIMARY KEY,
        provider_id            INT NOT NULL,
        status                 ENUM('PLANNED', 'PURCHASED', 'IN_TRANSIT', 'RECEIVING', 'COMPLETED', 'DIVERGENT', 'CANCELLED') DEFAULT 'PLANNED',
        total_amount           DECIMAL(12, 2) DEFAULT 0.00,
        expected_delivery_date DATE,
        created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES providers(id)
      );
    `,
  },
  {
    name: 'tabela purchase_order_items',
    sql: `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        purchase_order_id INT NOT NULL,
        product_id        INT NOT NULL,
        quantity_ordered  INT NOT NULL,
        quantity_received INT DEFAULT 0,
        unit_price        DECIMAL(10, 2),
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id)        REFERENCES products(id)
      );
    `,
  },
  {
    name: 'tabela receiving_batches',
    sql: `
      CREATE TABLE IF NOT EXISTS receiving_batches (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        purchase_order_id INT NOT NULL,
        invoice_number    VARCHAR(50),
        license_plate     VARCHAR(20),
        status            ENUM('ARRIVED', 'IN_CONFERENCE', 'RELEASED', 'DIVERGENT') DEFAULT 'ARRIVED',
        started_at        TIMESTAMP NULL,
        finished_at       TIMESTAMP NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
      );
    `,
  },
  {
    name: 'tabela receiving_conferences',
    sql: `
      CREATE TABLE IF NOT EXISTS receiving_conferences (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        batch_id         INT NOT NULL,
        product_id       INT NOT NULL,
        round_number     INT NOT NULL,
        quantity_counted INT NOT NULL,
        user_id          INT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id)   REFERENCES receiving_batches(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `,
  },
];

let ok = 0;
let skip = 0;

for (const step of steps) {
  try {
    await conn.execute(step.sql);
    console.log(`  ✅  ${step.name} — criada`);
    ok++;
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log(`  ⏭️   ${step.name} — já existe, pulando`);
      skip++;
    } else {
      console.error(`  ❌  ${step.name} — ERRO: ${err.message}`);
      await conn.end();
      process.exit(1);
    }
  }
}

// Mostrar todas as tabelas do banco
const [tables] = await conn.execute(
  `SELECT table_name AS tabela
   FROM information_schema.tables
   WHERE table_schema = ?
   ORDER BY table_name`,
  [process.env.DB_NAME || 'kingstar_io']
);

console.log('\n📋 Tabelas no banco agora:');
tables.forEach(t => console.log('   •', t.tabela));

console.log(`\n✅ Migration concluída — ${ok} criadas, ${skip} já existiam\n`);
await conn.end();
