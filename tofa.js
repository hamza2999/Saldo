// Tofaktor (TOTP, RFC 6238) med Nodes innebygde crypto — ingen ekstra avhengigheter.
// Kompatibel med Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden o.l.
import crypto from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIODE = 30; // sekunder per kode
const SIFRE = 6;

let kryptNokkel = null;
let hmacNokkel = null;

// Kalles én gang ved oppstart. Nøkkelen (64 hex-tegn) ligger i .env som TOFA_NOKKEL.
// To ulike undernøkler avledes, så samme nøkkel aldri brukes til to formål.
export function initTofa(hexNokkel) {
  if (typeof hexNokkel !== 'string' || !/^[0-9a-fA-F]{64}$/.test(hexNokkel)) {
    throw new Error(
      'TOFA_NOKKEL mangler eller er ugyldig i .env. Lag en med: openssl rand -hex 32'
    );
  }
  const master = Buffer.from(hexNokkel, 'hex');
  kryptNokkel = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'saldo-tofa-hemmelighet', 32));
  hmacNokkel = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'saldo-tofa-reservekode', 32));
}

/* ---------- Base32 (formatet autentiseringsapper bruker for nøkkelen) ---------- */

export function base32Encode(buffer) {
  let bits = 0;
  let verdi = 0;
  let ut = '';
  for (const byte of buffer) {
    verdi = (verdi << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      ut += BASE32[(verdi >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) ut += BASE32[(verdi << (5 - bits)) & 31];
  return ut;
}

export function base32Decode(tekst) {
  const ren = tekst.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let verdi = 0;
  const ut = [];
  for (const tegn of ren) {
    verdi = (verdi << 5) | BASE32.indexOf(tegn);
    bits += 5;
    if (bits >= 8) {
      ut.push((verdi >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(ut);
}

/* ---------- TOTP ---------- */

// 160 bit tilfeldig nøkkel, anbefalt lengde for HMAC-SHA1 (RFC 4226).
export function lagHemmelighet() {
  return base32Encode(crypto.randomBytes(20));
}

// HOTP (RFC 4226). Eksportert kun for testing mot RFC-testvektorene.
export function hotp(nokkel, teller, sifre = SIFRE, algoritme = 'sha1') {
  const melding = Buffer.alloc(8);
  melding.writeBigUInt64BE(BigInt(teller));
  const hash = crypto.createHmac(algoritme, nokkel).update(melding).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const tall = (hash.readUInt32BE(offset) & 0x7fffffff) % 10 ** sifre;
  return String(tall).padStart(sifre, '0');
}

// Returnerer tidssteget koden tilhører, eller null hvis koden er feil.
// Godtar ±1 steg (±30 s) for å tåle litt feil klokke på telefonen.
// Steget lagres etter bruk, så samme kode ikke kan brukes to ganger.
export function finnTotpSteg(hemmelighetBase32, kode, naaMs = Date.now()) {
  if (typeof kode !== 'string' || !/^\d{6}$/.test(kode)) return null;
  const nokkel = base32Decode(hemmelighetBase32);
  const steg = Math.floor(naaMs / 1000 / PERIODE);
  let funnet = null;
  // Sjekker alle tre stegene uansett, så svartiden ikke røper hvilket som traff.
  for (const avvik of [-1, 0, 1]) {
    const forventet = Buffer.from(hotp(nokkel, steg + avvik));
    if (crypto.timingSafeEqual(forventet, Buffer.from(kode)) && funnet === null) {
      funnet = steg + avvik;
    }
  }
  return funnet;
}

export function otpauthUri({ hemmelighet, epost, utsteder = 'Saldo' }) {
  const etikett = encodeURIComponent(`${utsteder}:${epost}`);
  const parametre = new URLSearchParams({
    secret: hemmelighet,
    issuer: utsteder,
    algorithm: 'SHA1',
    digits: String(SIFRE),
    period: String(PERIODE),
  });
  return `otpauth://totp/${etikett}?${parametre}`;
}

/* ---------- Kryptering av nøkkelen i databasen (AES-256-GCM) ---------- */

// En stjålet databasekopi alene gir dermed ikke tilgang til nøklene.
export function krypter(tekst) {
  if (!kryptNokkel) throw new Error('initTofa() er ikke kalt');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kryptNokkel, iv);
  const innhold = Buffer.concat([cipher.update(tekst, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), innhold.toString('base64')].join(':');
}

export function dekrypter(lagret) {
  if (!kryptNokkel) throw new Error('initTofa() er ikke kalt');
  const [versjon, iv, tag, innhold] = String(lagret).split(':');
  if (versjon !== 'v1') throw new Error('ukjent krypteringsformat');
  const decipher = crypto.createDecipheriv('aes-256-gcm', kryptNokkel, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(innhold, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/* ---------- Reservekoder ---------- */

const RESERVEKODE_LENGDE = 10; // 10 base32-tegn = 50 bit tilfeldighet

// Koder vises til brukeren som «ABCDE-FGH23».
export function lagReservekoder(antall = 10) {
  const koder = new Set();
  while (koder.size < antall) {
    koder.add(base32Encode(crypto.randomBytes(8)).slice(0, RESERVEKODE_LENGDE));
  }
  return [...koder];
}

export function formaterReservekode(kode) {
  return `${kode.slice(0, 5)}-${kode.slice(5)}`;
}

// Tåler små bokstaver, mellomrom og bindestrek fra brukeren.
export function normaliserReservekode(input) {
  if (typeof input !== 'string') return null;
  const ren = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  return ren.length === RESERVEKODE_LENGDE ? ren : null;
}

// Kodene er tilfeldige med høy entropi, så HMAC med hemmelig nøkkel holder (som bcrypt
// for passord). Det gjør også at koden kan slås opp direkte i databasen.
export function hashReservekode(normalisertKode) {
  if (!hmacNokkel) throw new Error('initTofa() er ikke kalt');
  return crypto.createHmac('sha256', hmacNokkel).update(normalisertKode).digest('hex');
}
