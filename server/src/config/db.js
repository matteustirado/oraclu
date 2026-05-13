import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'oraclu-db',
  user: process.env.DB_USER || 'oraclu_app_user',
  password: process.env.DB_PASSWORD || 'oraclu_pass_2026',
  database: process.env.DB_DATABASE || 'oraclu_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;