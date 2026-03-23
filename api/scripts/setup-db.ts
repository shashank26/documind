import 'dotenv/config';
import { Client } from 'pg';

async function setup() {
  const client = new Client({
    user: process.env.DATABASE_USER || 'your_username',
    host: 'localhost',
    database: 'postgres', // connect to default DB
  });

  await client.connect();

  const dbName = 'documind';

  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`,
  );

  if (res.rowCount === 0) {
    console.log('Creating database...');
    await client.query(`CREATE DATABASE ${dbName}`);
  } else {
    console.log('Database already exists');
  }

  await client.end();
}

setup();
