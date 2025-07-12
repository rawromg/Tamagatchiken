const { Pool } = require('pg');
require('dotenv').config();

// SSL configuration - use SSL in production or when FORCESSL is true
const sslConfig = (process.env.NODE_ENV === 'production' || process.env.FORCESSL === 'true') ? {
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
  max: process.env.VERCEL ? 1 : 20, // Single connection for serverless
  idleTimeoutMillis: process.env.VERCEL ? 10000 : 30000, // Shorter timeout for serverless
  connectionTimeoutMillis: process.env.VERCEL ? 5000 : 2000, // Longer connection timeout for serverless
  statement_timeout: process.env.VERCEL ? 10000 : 30000, // Query timeout
  query_timeout: process.env.VERCEL ? 10000 : 30000, // Query timeout
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Add a test query function
pool.testConnection = async function() {
  try {
    await this.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

module.exports = pool; 