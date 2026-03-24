// backend/check_schema.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'kingstar_io',
  });

  const [colsP] = await conn.query('SHOW COLUMNS FROM products');
  console.log('Columns in products:', colsP.map(c => c.Field));
  
  const [colsI] = await conn.query('SHOW COLUMNS FROM inventory');
  console.log('Columns in inventory:', colsI.map(c => c.Field));
  
  const [colsC] = await conn.query('SHOW COLUMNS FROM customers');
  console.log('Columns in customers:', colsC.map(c => c.Field));
  
  const [colsL] = await conn.query('SHOW COLUMNS FROM locations');
  console.log('Columns in locations:', colsL.map(c => c.Field));
  
  await conn.end();
}

run().catch(console.error);
