import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { POLICY_VERSION } from './src/constants/privacy.js';

const MIN_PASSORD = 8;

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
  createDatabaseTable: false,
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
  rolling: true, // fornyer utløpstiden ved hver forespørsel
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dager uten aktivitet
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
  const { epost, passord, samtykke } = req.body;

  // 1. basic validation
  if (!epost || !passord) {
    return res.status(400).json({ error: 'epost og passord er påkrevd' });
  }
  if (passord.length < MIN_PASSORD) {
    return res.status(400).json({ error: `passordet må ha minst ${MIN_PASSORD} tegn` });
  }
  // GDPR: samtykket må være aktivt avkrysset, og vi lagrer tid + versjon (art. 7 nr. 1)
  if (samtykke !== true) {
    return res.status(400).json({ error: 'du må godta personvernerklæringen' });
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
      [epost, hash, POLICY_VERSION]
    );

    // Logg brukeren inn direkte etter registrering.
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'sesjonsfeil' });
      req.session.kundeId = result.insertId;
      res.status(201).json({ kunde_id: result.insertId, epost });
    });
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
app.get('/api/meg', async (req, res) => {
  if (!req.session.kundeId) return res.status(401).json({ error: 'ikke innlogget' });

  try {
    const [rows] = await pool.query(
      `SELECT kunde_id, epost, opprettet, vilkaar_akseptert_tid, vilkaar_versjon
       FROM kunder WHERE kunde_id = ?`,
      [req.session.kundeId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'ikke innlogget' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

// Hjelpefunksjon som sjekker om brukeren er innlogget
function requireLogin(req, res, next) {
  if (!req.session.kundeId) {
    return res.status(401).json({ error: 'ikke innlogget' });
  }
  next();
}

// Sjekker passordet til innlogget bruker før sensitive endringer.
async function passordStemmer(kundeId, passord) {
  if (!passord) return false;
  const [rows] = await pool.query(
    'SELECT passord_hash FROM kunder WHERE kunde_id = ?',
    [kundeId]
  );
  return rows[0] ? bcrypt.compare(passord, rows[0].passord_hash) : false;
}

// Logger ut brukerens andre enheter (sesjonsdata lagres som JSON).
async function slettAndreSesjoner(kundeId, behold = '') {
  await pool.query(
    `DELETE FROM sessions
     WHERE JSON_EXTRACT(data, '$.kundeId') = ? AND session_id <> ?`,
    [kundeId, behold]
  );
}

app.put('/api/meg/epost', requireLogin, async (req, res) => {
  const { epost, passord } = req.body;
  if (!epost) return res.status(400).json({ error: 'epost er påkrevd' });

  try {
    if (!(await passordStemmer(req.session.kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    await pool.query('UPDATE kunder SET epost = ? WHERE kunde_id = ?', [epost, req.session.kundeId]);
    res.json({ epost });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'epost allerede i bruk' });
    }
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.put('/api/meg/passord', requireLogin, async (req, res) => {
  const { passord, nyttPassord } = req.body;
  if (!nyttPassord || nyttPassord.length < MIN_PASSORD) {
    return res.status(400).json({ error: `passordet må ha minst ${MIN_PASSORD} tegn` });
  }

  try {
    if (!(await passordStemmer(req.session.kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    const hash = await bcrypt.hash(nyttPassord, 12);
    await pool.query('UPDATE kunder SET passord_hash = ? WHERE kunde_id = ?', [hash, req.session.kundeId]);
    await slettAndreSesjoner(req.session.kundeId, req.sessionID);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

// GDPR art. 15 og 20: innsyn og dataportabilitet — alt vi har om brukeren, som JSON.
app.get('/api/meg/eksport', requireLogin, async (req, res) => {
  try {
    const [[konto]] = await pool.query(
      `SELECT epost, opprettet, vilkaar_akseptert_tid, vilkaar_versjon
       FROM kunder WHERE kunde_id = ?`,
      [req.session.kundeId]
    );
    const [transaksjoner] = await pool.query(
      `SELECT t.type, t.belop, k.kategori_navn AS kategori,
              DATE_FORMAT(t.dato, '%Y-%m-%d') AS dato, t.beskrivelse, t.opprettet
       FROM transaksjoner t
       JOIN kategorier k ON k.kategori_id = t.kategori_id
       WHERE t.kunde_id = ?
       ORDER BY t.dato`,
      [req.session.kundeId]
    );

    res.attachment('saldo-mine-data.json');
    res.json({ eksportert: new Date().toISOString(), konto, transaksjoner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

// GDPR art. 17: sletting. Transaksjonene slettes via ON DELETE CASCADE.
app.delete('/api/meg', requireLogin, async (req, res) => {
  const kundeId = req.session.kundeId;

  try {
    if (!(await passordStemmer(kundeId, req.body?.passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    await pool.query('DELETE FROM kunder WHERE kunde_id = ?', [kundeId]);
    await slettAndreSesjoner(kundeId, req.sessionID);

    req.session.destroy(() => {
      res.clearCookie('saldo.sid');
      res.status(204).end();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.get('/api/transaksjoner', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.transaksjon_id, t.type, t.belop, k.kategori_navn,
              DATE_FORMAT(t.dato, '%Y-%m-%d') AS dato, t.beskrivelse
       FROM transaksjoner t
       JOIN kategorier k ON k.kategori_id = t.kategori_id
       WHERE t.kunde_id = ?
       ORDER BY t.dato DESC, t.transaksjon_id DESC`,
      [req.session.kundeId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

// Frontend sender kategorinavnet, så vi slår opp kategori_id her.
app.post('/api/transaksjoner', requireLogin, async (req, res) => {
  const { type, belop, kategori_navn, dato, beskrivelse } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO transaksjoner (kunde_id, type, belop, kategori_id, dato, beskrivelse)
       SELECT ?, ?, ?, kategori_id, ?, ? FROM kategorier WHERE kategori_navn = ?`,
      [req.session.kundeId, type, belop, dato, beskrivelse, kategori_navn]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'ukjent kategori' });
    }

    res.status(201).json({ transaksjon_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.put('/api/transaksjoner/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { type, belop, kategori_navn, dato, beskrivelse } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE transaksjoner t
       JOIN kategorier k ON k.kategori_navn = ?
       SET t.type = ?, t.belop = ?, t.kategori_id = k.kategori_id, t.dato = ?, t.beskrivelse = ?
       WHERE t.transaksjon_id = ? AND t.kunde_id = ?`,
      [kategori_navn, type, belop, dato, beskrivelse, id, req.session.kundeId]
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

app.delete('/api/transaksjoner', requireLogin, async (req, res) => {
  try {
    await pool.query('DELETE FROM transaksjoner WHERE kunde_id = ?', [req.session.kundeId]);
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
