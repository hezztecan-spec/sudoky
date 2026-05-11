const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

// Render и многие облачные Postgres требуют SSL.
// Локально (postgres://...@localhost или @db) SSL не нужен.
const useSsl =
  !!connectionString &&
  !/localhost|127\.0\.0\.1|@db[:/]/.test(connectionString) &&
  process.env.PGSSL !== 'false';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
