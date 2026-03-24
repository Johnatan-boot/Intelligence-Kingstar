// backend/simulate.js
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'kingstar_io',
    multipleStatements: true,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'simulate_data.sql'), 'utf8');
  console.log('⏳ Populando banco com dados de simulação...');
  await conn.query(sql);
  console.log('✅ Simulação concluída!');
  await conn.end();
}

run().catch(console.error);
