const { Pool } = require('pg');
require('dotenv').config();

// SSL configuration - only use SSL in production
const sslConfig = process.env.NODE_ENV === 'production' ? {
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  }
} : {};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tamagotchi_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ...sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool; 