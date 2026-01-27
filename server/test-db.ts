import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error('Connection Error:', err);
  } else {
    console.log('Connection Successful:', res.rows);
  }
  pool.end();
});
