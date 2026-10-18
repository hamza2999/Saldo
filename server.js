import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

const app = express();
app.use(express.json());
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
app.post('/api/registrer', async (req, res) => {
  const { epost, passord } = req.body;

  // 1. basic validation
  if (!epost || !passord) {
    return res.status(400).json({ error: 'epost og passord er påkrevd' });
  }

  try {
    const [existingUser] = await pool.query(
      `SELECT kunde_id FROM kunder WHERE epost = ?`,
      [epost]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'epost allerede i bruk' });
    }

   const hash = await bcrypt.hash(passord, 12);

    const [result] = await pool.query(
      `INSERT INTO kunder (epost, passord_hash, vilkaar_akseptert_tid, vilkaar_versjon)
       VALUES (?, ?, NOW(), ?)`,
      [epost, hash, 'v1']
    );

    res.status(201).json({ kunde_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});
app.listen(port, () => console.log(`Saldo API on http://localhost:${port}`));