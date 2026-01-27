import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected.');
    
    console.log('Querying SELECT 1...');
    await client.query('SELECT 1');
    console.log('SELECT 1 Success.');

    console.log('Creating Table...');
    await client.query('CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY)');
    console.log('Create Table Success.');
    
    await client.query('DROP TABLE test_table');
    console.log('Cleanup Success.');
  } catch (err: any) {
    console.error('FAILED at step:', err.message);
    if (err.code) console.error('Error Code:', err.code);
  } finally {
    await client.end();
  }
}

run();
