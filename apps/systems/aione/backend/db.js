import pg from "pg";

const { Pool } = pg;

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX || 10),
      application_name: "aione-backend"
    };
  }

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    max: Number(process.env.DB_POOL_MAX || 10),
    application_name: "aione-backend"
  };

  if (process.env.INSTANCE_UNIX_SOCKET) {
    config.host = process.env.INSTANCE_UNIX_SOCKET;
  } else {
    config.host = process.env.DB_HOST || "127.0.0.1";
    config.port = Number(process.env.DB_PORT || 5432);
  }

  return config;
}

const pool = new Pool(buildPoolConfig());

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
