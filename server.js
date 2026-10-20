import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

const MySQLStore = MySQLStoreFactory(session);

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
app.set('trust proxy', 1);

const sessionStore = new MySQLStore({
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
}, pool);

app.use(session({
  name: 'saldo.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));


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

const DUMMY_HASH = await bcrypt.hash('dummy-passord', 12);

app.post('/api/login', async (req, res) => {
  const { epost, passord } = req.body;

  if (!epost || !passord) {
    return res.status(400).json({ error: 'epost og passord er påkrevd' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT kunde_id, epost, passord_hash FROM kunder WHERE epost = ?',
      [epost]
    );

    const kunde = rows[0];
    const ok = await bcrypt.compare(passord, kunde ? kunde.passord_hash : DUMMY_HASH);

    if (!kunde || !ok) {
      return res.status(401).json({ error: 'feil epost eller passord' });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'sesjonsfeil' });
      req.session.kundeId = kunde.kunde_id;
      res.json({ kunde_id: kunde.kunde_id, epost: kunde.epost });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('saldo.sid');
    res.status(204).end();
  });
});

// Lag denne også, så frontend kan sjekke hvem som er logget inn
app.get('/api/meg', (req, res) => {
  if (!req.session.kundeId) return res.status(401).json({ error: 'ikke innlogget' });
  res.json({ kunde_id: req.session.kundeId });
});

// Hjelpefunksjon som sjekker om brukeren er innlogget
function requireLogin(req, res, next) {
  if (!req.session.kundeId) {
    return res.status(401).json({ error: 'ikke innlogget' });
  }
  next();
}

app.get('/api/transaksjoner', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM transaksjoner WHERE kunde_id = ?
       ORDER BY dato DESC, transaksjon_id DESC`,
      [req.session.kundeId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.post('/api/transaksjoner', requireLogin, async (req, res) => {
  const { type, beloep, kategori_id, dato, beskrivelse } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO transaksjoner (kunde_id, type, beloep, kategori_id, dato, beskrivelse)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.session.kundeId, type, beloep, kategori_id, dato, beskrivelse]
    );
    const transaksjon_id = result.insertId;
    res.status(201).json({ transaksjon_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.put('/api/transaksjoner/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { type, beloep, kategori_id, dato, beskrivelse } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE transaksjoner
       SET type = ?, beloep = ?, kategori_id = ?, dato = ?, beskrivelse = ?
       WHERE transaksjon_id = ? AND kunde_id = ?`,
      [type, beloep, kategori_id, dato, beskrivelse, id, req.session.kundeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'transaksjonen finnes ikke' });
    }

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.delete('/api/transaksjoner/:id', requireLogin, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM transaksjoner
       WHERE transaksjon_id = ? AND kunde_id = ?`,
      [id, req.session.kundeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'transaksjonen finnes ikke' });
    }

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Saldo API on http://localhost:${port}`));
