import express from 'express';
import pool from './db.js';

const app = express();

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time');

    res.json({
      ok: true,
      service: 'aione-backend',
      database: 'connected',
      databaseTime: result.rows[0].database_time
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      database: 'disconnected'
    });
  }
});

app.get('/api/product-opportunities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM public.product_opportunities
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Failed to load product opportunities'
    });
  }
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`AIONE Backend API listening on port ${port}`);
});