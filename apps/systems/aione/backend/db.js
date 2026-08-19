import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.INSTANCE_UNIX_SOCKET,
  max: 5,
});

export default pool;