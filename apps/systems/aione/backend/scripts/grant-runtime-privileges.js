import pg from 'pg';

const { Client } = pg;

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'aione',
  host: process.env.INSTANCE_UNIX_SOCKET || process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

await client.connect();
try {
  const target = await client.query('select current_database() db, current_user usr');
  console.log('Grant target:', target.rows[0]);
  if (target.rows[0].db !== 'aione') throw new Error('Refusing grants outside database aione');

  await client.query(`
    GRANT USAGE ON SCHEMA public TO aione_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aione_app;
    GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO aione_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aione_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO aione_app;
  `);

  console.log('AIONE V1 RUNTIME GRANTS SUCCESS');
} finally {
  await client.end();
}
