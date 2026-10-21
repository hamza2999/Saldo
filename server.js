import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { POLICY_VERSION } from './src/constants/privacy.js';
import {
  initTofa,
  lagHemmelighet,
  finnTotpSteg,
  otpauthUri,
  krypter,
  dekrypter,
  lagReservekoder,
  formaterReservekode,
  normaliserReservekode,
  hashReservekode,
} from './tofa.js';

// Stopper oppstarten med en tydelig feilmelding hvis TOFA_NOKKEL mangler i .env.
initTofa(process.env.TOFA_NOKKEL);

const MIN_PASSORD = 8;
// bcrypt bruker kun de første 72 bytene — lengre passord ville blitt stille avkortet.
const MAX_PASSORD = 72;

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

// Må settes før rate limiting, slik at req.ip blir riktig bak proxy.
app.set('trust proxy', 1);
app.use(helmet()); // sikkerhetsheadere
app.use(express.json({ limit: '100kb' }));

/* ---------- Validering ---------- */

// mysql2 utvider objekter i ?-plassholdere, så alt fra body må typesjekkes.
function erTekst(verdi) {
  return typeof verdi === 'string';
}

function gyldigEpost(epost) {
  return erTekst(epost) && epost.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost.trim());
}

function normaliserEpost(epost) {
  return epost.trim().toLowerCase();
}

function passordFeil(passord) {
  if (!erTekst(passord)) return 'passord er påkrevd';
  if (passord.length < MIN_PASSORD) return `passordet må ha minst ${MIN_PASSORD} tegn`;
  if (passord.length > MAX_PASSORD) return `passordet kan ha maks ${MAX_PASSORD} tegn`;
  return null;
}

const TYPER = new Set(['inntekt', 'utgift']);

// Returnerer feilmelding, eller null hvis transaksjonen er gyldig.
function transaksjonFeil({ type, belop, kategori_navn, dato, beskrivelse }) {
  if (!erTekst(type) || !TYPER.has(type)) return 'ugyldig type';
  if (typeof belop !== 'number' || !Number.isFinite(belop) || belop <= 0) {
    return 'belop må være et positivt tall';
  }
  if (belop > 9999999999.99) return 'belop er for stort';
  if (!erTekst(kategori_navn) || kategori_navn.length > 100) return 'ugyldig kategori';
  if (!erTekst(dato) || !/^\d{4}-\d{2}-\d{2}$/.test(dato)) return 'dato må være på formen ÅÅÅÅ-MM-DD';
  if (beskrivelse != null && (!erTekst(beskrivelse) || beskrivelse.length > 500)) {
    return 'ugyldig beskrivelse';
  }
  return null;
}
/* ---------- Rate limiting ---------- */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: 10, // 10 forsøk per IP per vindu
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'For mange innloggingsforsøk, prøv igjen senere.' },
});

// Endepunkter som sjekker passord er også gjettemål, ikke bare innlogging.
const sensitivLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'For mange forsøk, prøv igjen senere.' },
});

const registrerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 time
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'For mange registreringer, prøv igjen senere.' },
});

/* ---------- Sesjon ---------- */

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

// Samme innstillinger som cookien ble satt med, ellers blir den ikke fjernet.
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

/* ---------- Hjelpefunksjoner ---------- */

function requireLogin(req, res, next) {
  if (!req.session.kundeId) {
    return res.status(401).json({ error: 'ikke innlogget' });
  }
  next();
}

// Sjekker passordet til innlogget bruker før sensitive endringer.
async function passordStemmer(kundeId, passord) {
  if (!erTekst(passord)) return false;
  const [rows] = await pool.execute(
    'SELECT passord_hash FROM kunder WHERE kunde_id = ?',
    [kundeId]
  );
  return rows[0] ? bcrypt.compare(passord, rows[0].passord_hash) : false;
}

// Logger ut brukerens andre enheter (sesjonsdata lagres som JSON).
async function slettAndreSesjoner(kundeId, behold = '') {
  await pool.execute(
    `DELETE FROM sessions
     WHERE JSON_EXTRACT(data, '$.kundeId') = ? AND session_id <> ?`,
    [kundeId, behold]
  );
}

/* ---------- Tofaktor ---------- */

const TOFA_INNLOGGING_GYLDIG_MS = 5 * 60 * 1000; // tid fra riktig passord til koden må være inne
const TOFA_MAKS_FORSOK = 5; // feil koder før brukeren må starte innloggingen på nytt
const TOFA_OPPSETT_GYLDIG_MS = 10 * 60 * 1000;
const ANTALL_RESERVEKODER = 10;

// Sjekker en kode fra autentiseringsappen (6 sifre) eller en reservekode.
// Begge kan bare brukes én gang: TOTP-steget lagres, og reservekoden merkes som brukt.
// Oppdateringene har vilkåret i WHERE, så to samtidige forsøk med samme kode
// ikke begge kan lykkes.
async function sjekkAndreFaktor(kundeId, kode) {
  if (!erTekst(kode) || kode.length > 32) return { ok: false };

  const [rows] = await pool.execute(
    `SELECT tofa_hemmelighet FROM kunder
     WHERE kunde_id = ? AND tofa_aktivert_tid IS NOT NULL`,
    [kundeId]
  );
  if (!rows[0]) return { ok: false };

  const totpKode = kode.replace(/\s/g, '');
  if (/^\d{6}$/.test(totpKode)) {
    const steg = finnTotpSteg(dekrypter(rows[0].tofa_hemmelighet), totpKode);
    if (steg === null) return { ok: false };
    const [result] = await pool.execute(
      `UPDATE kunder SET tofa_siste_steg = ?
       WHERE kunde_id = ? AND (tofa_siste_steg IS NULL OR tofa_siste_steg < ?)`,
      [steg, kundeId, steg]
    );
    return { ok: result.affectedRows === 1, reservekode: false };
  }

  const reservekode = normaliserReservekode(kode);
  if (!reservekode) return { ok: false };
  const [result] = await pool.execute(
    `UPDATE tofa_reservekoder SET brukt_tid = NOW()
     WHERE kunde_id = ? AND kode_hash = ? AND brukt_tid IS NULL`,
    [kundeId, hashReservekode(reservekode)]
  );
  return { ok: result.affectedRows === 1, reservekode: true };
}

// Erstatter alle reservekodene til brukeren og returnerer de nye i klartekst (vises én gang).
async function lagreNyeReservekoder(conn, kundeId) {
  const koder = lagReservekoder(ANTALL_RESERVEKODER);
  await conn.execute('DELETE FROM tofa_reservekoder WHERE kunde_id = ?', [kundeId]);
  await conn.execute(
    `INSERT INTO tofa_reservekoder (kunde_id, kode_hash)
     VALUES ${koder.map(() => '(?, ?)').join(', ')}`,
    koder.flatMap((kode) => [kundeId, hashReservekode(kode)])
  );
  return koder.map(formaterReservekode);
}

function avsluttSesjon(req, res) {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.clearCookie('saldo.sid', COOKIE_OPTS);
    res.status(204).end();
  });
}

/* ---------- Ruter ---------- */

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

app.post('/api/registrer', registrerLimiter, async (req, res) => {
  const { epost, passord, samtykke } = req.body ?? {};

  if (!gyldigEpost(epost)) {
    return res.status(400).json({ error: 'ugyldig epost' });
  }
  const feil = passordFeil(passord);
  if (feil) {
    return res.status(400).json({ error: feil });
  }
  // GDPR: samtykket må være aktivt avkrysset, og vi lagrer tid + versjon (art. 7 nr. 1)
  if (samtykke !== true) {
    return res.status(400).json({ error: 'du må godta personvernerklæringen' });
  }

  const epostNorm = normaliserEpost(epost);

  try {
    const hash = await bcrypt.hash(passord, 12);

    // Unik-indeksen avgjør om eposten er ledig — en SELECT først ville hatt en race.
    const [result] = await pool.execute(
      `INSERT INTO kunder (epost, passord_hash, vilkaar_akseptert_tid, vilkaar_versjon)
       VALUES (?, ?, NOW(), ?)`,
      [epostNorm, hash, POLICY_VERSION]
    );

    // Logg brukeren inn direkte etter registrering.
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'sesjonsfeil' });
      }
      req.session.kundeId = result.insertId;
      res.status(201).json({ kunde_id: result.insertId, epost: epostNorm });
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'epost allerede i bruk' });
    }
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

// Sammenligner alltid mot en hash, slik at svartiden ikke røper om eposten finnes.
const DUMMY_HASH = await bcrypt.hash('dummy-passord', 12);

app.post('/api/login', loginLimiter, async (req, res) => {
  const { epost, passord } = req.body ?? {};

  if (!erTekst(epost) || !erTekst(passord)) {
    return res.status(400).json({ error: 'epost og passord er påkrevd' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT kunde_id, epost, passord_hash, tofa_aktivert_tid
       FROM kunder WHERE epost = ?`,
      [normaliserEpost(epost)]
    );

    const kunde = rows[0];
    const ok = await bcrypt.compare(passord, kunde ? kunde.passord_hash : DUMMY_HASH);

    if (!kunde || !ok) {
      return res.status(401).json({ error: 'feil epost eller passord' });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'sesjonsfeil' });
      }

      // Med tofaktor er brukeren IKKE innlogget ennå: kundeId settes først når koden stemmer.
      if (kunde.tofa_aktivert_tid) {
        req.session.ventendeTofa = {
          kundeId: kunde.kunde_id,
          epost: kunde.epost,
          utloper: Date.now() + TOFA_INNLOGGING_GYLDIG_MS,
          forsok: 0,
        };
        return res.json({ trenger2fa: true });
      }

      req.session.kundeId = kunde.kunde_id;
      res.json({ kunde_id: kunde.kunde_id, epost: kunde.epost });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

// Steg 2 av innloggingen for brukere med tofaktor.
app.post('/api/login/2fa', loginLimiter, async (req, res) => {
  const ventende = req.session.ventendeTofa;

  if (!ventende || Date.now() > ventende.utloper) {
    delete req.session.ventendeTofa;
    return res.status(401).json({
      error: 'innloggingen har utløpt, logg inn på nytt',
      startPaaNytt: true,
    });
  }

  ventende.forsok += 1;
  if (ventende.forsok > TOFA_MAKS_FORSOK) {
    delete req.session.ventendeTofa;
    return res.status(401).json({
      error: 'for mange feil koder, logg inn på nytt',
      startPaaNytt: true,
    });
  }

  try {
    const resultat = await sjekkAndreFaktor(ventende.kundeId, req.body?.kode);
    if (!resultat.ok) {
      return res.status(401).json({ error: 'feil eller allerede brukt kode' });
    }

    const { kundeId, epost } = ventende;
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'sesjonsfeil' });
      }
      req.session.kundeId = kundeId;
      res.json({ kunde_id: kundeId, epost, brukteReservekode: resultat.reservekode });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.post('/api/logout', (req, res) => {
  avsluttSesjon(req, res);
});

app.get('/api/meg', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT k.kunde_id, k.epost, k.opprettet, k.vilkaar_akseptert_tid, k.vilkaar_versjon,
              k.tofa_aktivert_tid,
              (SELECT COUNT(*) FROM tofa_reservekoder r
               WHERE r.kunde_id = k.kunde_id AND r.brukt_tid IS NULL) AS reservekoder_igjen
       FROM kunder k WHERE k.kunde_id = ?`,
      [req.session.kundeId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'ikke innlogget' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.put('/api/meg/epost', requireLogin, sensitivLimiter, async (req, res) => {
  const { epost, passord } = req.body ?? {};
  if (!gyldigEpost(epost)) return res.status(400).json({ error: 'ugyldig epost' });

  const epostNorm = normaliserEpost(epost);

  try {
    if (!(await passordStemmer(req.session.kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    await pool.execute(
      'UPDATE kunder SET epost = ? WHERE kunde_id = ?',
      [epostNorm, req.session.kundeId]
    );
    res.json({ epost: epostNorm });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'epost allerede i bruk' });
    }
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.put('/api/meg/passord', requireLogin, sensitivLimiter, async (req, res) => {
  const { passord, nyttPassord } = req.body ?? {};
  const feil = passordFeil(nyttPassord);
  if (feil) {
    return res.status(400).json({ error: feil });
  }

  try {
    if (!(await passordStemmer(req.session.kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    const hash = await bcrypt.hash(nyttPassord, 12);
    await pool.execute(
      'UPDATE kunder SET passord_hash = ? WHERE kunde_id = ?',
      [hash, req.session.kundeId]
    );
    await slettAndreSesjoner(req.session.kundeId, req.sessionID);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

/* ---------- Tofaktor: slå på, slå av, nye reservekoder ---------- */

// Steg 1: lag en ny nøkkel og vis den som QR-kode. Ingenting lagres på kontoen før
// brukeren har bevist at appen virker (steg 2). Nøkkelen ligger kryptert i sesjonen så lenge.
app.post('/api/meg/2fa/oppsett', requireLogin, sensitivLimiter, async (req, res) => {
  try {
    const [[kunde]] = await pool.execute(
      'SELECT epost, tofa_aktivert_tid FROM kunder WHERE kunde_id = ?',
      [req.session.kundeId]
    );
    if (kunde.tofa_aktivert_tid) {
      return res.status(409).json({ error: 'tofaktor er allerede slått på' });
    }

    const hemmelighet = lagHemmelighet();
    req.session.tofaOppsett = {
      hemmelighet: krypter(hemmelighet),
      utloper: Date.now() + TOFA_OPPSETT_GYLDIG_MS,
    };

    const qr = await QRCode.toDataURL(otpauthUri({ hemmelighet, epost: kunde.epost }), {
      margin: 1,
      width: 220,
    });
    res.json({ qr, hemmelighet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'serverfeil' });
  }
});

// Steg 2: brukeren skriver inn passord og en kode fra appen. Da lagres nøkkelen,
// reservekodene lages, og andre enheter logges ut (de har ikke bestått tofaktor).
app.post('/api/meg/2fa/aktiver', requireLogin, sensitivLimiter, async (req, res) => {
  const { passord, kode } = req.body ?? {};
  const oppsett = req.session.tofaOppsett;
  const kundeId = req.session.kundeId;

  if (!oppsett || Date.now() > oppsett.utloper) {
    delete req.session.tofaOppsett;
    return res.status(400).json({ error: 'oppsettet har utløpt, start på nytt' });
  }

  let conn;
  try {
    if (!(await passordStemmer(kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }

    const hemmelighet = dekrypter(oppsett.hemmelighet);
    const steg = finnTotpSteg(hemmelighet, erTekst(kode) ? kode.replace(/\s/g, '') : '');
    if (steg === null) {
      return res.status(400).json({
        error: 'feil kode. Sjekk at klokka på telefonen stiller seg automatisk.',
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `UPDATE kunder
       SET tofa_hemmelighet = ?, tofa_aktivert_tid = NOW(), tofa_siste_steg = ?
       WHERE kunde_id = ? AND tofa_aktivert_tid IS NULL`,
      [krypter(hemmelighet), steg, kundeId]
    );
    if (result.affectedRows !== 1) {
      await conn.rollback();
      return res.status(409).json({ error: 'tofaktor er allerede slått på' });
    }
    const reservekoder = await lagreNyeReservekoder(conn, kundeId);
    await conn.commit();

    delete req.session.tofaOppsett;
    await slettAndreSesjoner(kundeId, req.sessionID);
    res.json({ reservekoder });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  } finally {
    if (conn) conn.release();
  }
});

// Krever både passord og en gyldig kode, så en kapret sesjon alene ikke kan slå det av.
app.post('/api/meg/2fa/deaktiver', requireLogin, sensitivLimiter, async (req, res) => {
  const { passord, kode } = req.body ?? {};
  const kundeId = req.session.kundeId;

  let conn;
  try {
    if (!(await passordStemmer(kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    if (!(await sjekkAndreFaktor(kundeId, kode)).ok) {
      return res.status(401).json({ error: 'feil eller allerede brukt kode' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE kunder
       SET tofa_hemmelighet = NULL, tofa_aktivert_tid = NULL, tofa_siste_steg = NULL
       WHERE kunde_id = ?`,
      [kundeId]
    );
    await conn.execute('DELETE FROM tofa_reservekoder WHERE kunde_id = ?', [kundeId]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  } finally {
    if (conn) conn.release();
  }
});

// Nye reservekoder (f.eks. når de fleste er brukt opp). De gamle slutter å virke.
app.post('/api/meg/2fa/reservekoder', requireLogin, sensitivLimiter, async (req, res) => {
  const { passord, kode } = req.body ?? {};
  const kundeId = req.session.kundeId;

  let conn;
  try {
    if (!(await passordStemmer(kundeId, passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }
    if (!(await sjekkAndreFaktor(kundeId, kode)).ok) {
      return res.status(401).json({ error: 'feil eller allerede brukt kode' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();
    const reservekoder = await lagreNyeReservekoder(conn, kundeId);
    await conn.commit();
    res.json({ reservekoder });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  } finally {
    if (conn) conn.release();
  }
});

// GDPR art. 15 og 20: innsyn og dataportabilitet — alt vi har om brukeren, som JSON.
// Tofaktor-nøkkelen og reservekodene tas ikke med: de er sikkerhetsnøkler, ikke opplysninger
// om brukeren, og en eksportfil skal ikke kunne brukes til å omgå tofaktor.
app.get('/api/meg/eksport', requireLogin, async (req, res) => {
  try {
    const [[konto]] = await pool.execute(
      `SELECT epost, opprettet, vilkaar_akseptert_tid, vilkaar_versjon, tofa_aktivert_tid
       FROM kunder WHERE kunde_id = ?`,
      [req.session.kundeId]
    );
    const [transaksjoner] = await pool.execute(
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
app.delete('/api/meg', requireLogin, sensitivLimiter, async (req, res) => {
  const kundeId = req.session.kundeId;

  let conn;
  try {
    if (!(await passordStemmer(kundeId, req.body?.passord))) {
      return res.status(401).json({ error: 'feil passord' });
    }

    // Sletting av konto og sesjoner må skje samlet, ellers kan sesjoner bli liggende igjen.
    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.execute('DELETE FROM kunder WHERE kunde_id = ?', [kundeId]);
    await conn.execute(
      `DELETE FROM sessions
       WHERE JSON_EXTRACT(data, '$.kundeId') = ? AND session_id <> ?`,
      [kundeId, req.sessionID]
    );
    await conn.commit();

    avsluttSesjon(req, res);
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/transaksjoner', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
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
  const { type, belop, kategori_navn, dato, beskrivelse = null } = req.body ?? {};

  const feil = transaksjonFeil({ type, belop, kategori_navn, dato, beskrivelse });
  if (feil) return res.status(400).json({ error: feil });

  try {
    const [kategorier] = await pool.execute(
      'SELECT kategori_id FROM kategorier WHERE kategori_navn = ?',
      [kategori_navn]
    );
    if (!kategorier[0]) {
      return res.status(400).json({ error: 'ukjent kategori' });
    }

    const [result] = await pool.execute(
      `INSERT INTO transaksjoner (kunde_id, type, belop, kategori_id, dato, beskrivelse)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.session.kundeId, type, belop, kategorier[0].kategori_id, dato, beskrivelse]
    );

    res.status(201).json({ transaksjon_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.put('/api/transaksjoner/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { type, belop, kategori_navn, dato, beskrivelse = null } = req.body ?? {};

  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ugyldig id' });

  const feil = transaksjonFeil({ type, belop, kategori_navn, dato, beskrivelse });
  if (feil) return res.status(400).json({ error: feil });

  try {
    // Egen oppslag på kategori, ellers ville ukjent kategori sett ut som "finnes ikke".
    const [kategorier] = await pool.execute(
      'SELECT kategori_id FROM kategorier WHERE kategori_navn = ?',
      [kategori_navn]
    );
    if (!kategorier[0]) {
      return res.status(400).json({ error: 'ukjent kategori' });
    }

    const [result] = await pool.execute(
      `UPDATE transaksjoner
       SET type = ?, belop = ?, kategori_id = ?, dato = ?, beskrivelse = ?
       WHERE transaksjon_id = ? AND kunde_id = ?`,
      [type, belop, kategorier[0].kategori_id, dato, beskrivelse, id, req.session.kundeId]
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
    await pool.execute('DELETE FROM transaksjoner WHERE kunde_id = ?', [req.session.kundeId]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'databasefeil' });
  }
});

app.delete('/api/transaksjoner/:id', requireLogin, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ugyldig id' });

  try {
    const [result] = await pool.execute(
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