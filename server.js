import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

const app = express();

app.get('/', (req, res) => {
  res.send('Saldo API. Try /api/kategorier');
});

app.get('/api/kategorier', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT kategori_id, kategori_navn FROM kategorier ORDER BY kategori_navn'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Saldo API on http://localhost:${port}`));