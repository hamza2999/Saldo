CREATE TABLE IF NOT EXISTS kunder (
  kunde_id               INT AUTO_INCREMENT PRIMARY KEY,
  epost                  VARCHAR(255) NOT NULL UNIQUE,
  passord_hash           VARCHAR(255) NOT NULL,
  opprettet              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vilkaar_akseptert_tid  TIMESTAMP NOT NULL,
  vilkaar_versjon        VARCHAR(20) NOT NULL,
  tofa_hemmelighet       VARCHAR(255) NULL,
  tofa_aktivert_tid      TIMESTAMP NULL DEFAULT NULL,
  tofa_siste_steg        BIGINT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tofa_reservekoder (
  kode_id    INT AUTO_INCREMENT PRIMARY KEY,
  kunde_id   INT NOT NULL,
  kode_hash  CHAR(64) NOT NULL,
  brukt_tid  TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_reservekode_kunde (kunde_id, kode_hash),
  CONSTRAINT fk_reservekoder_kunde
    FOREIGN KEY (kunde_id) REFERENCES kunder(kunde_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kategorier (
  kategori_id    INT AUTO_INCREMENT PRIMARY KEY,
  kategori_navn  VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transaksjoner (
  transaksjon_id  INT AUTO_INCREMENT PRIMARY KEY,
  kunde_id        INT NOT NULL,
  kategori_id     INT NOT NULL,
  dato            DATE NOT NULL,
  belop           DECIMAL(12,2) NOT NULL,
  beskrivelse     VARCHAR(255) NULL,
  type            ENUM('inntekt','utgift') NOT NULL,
  opprettet       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_belop_positivt CHECK (belop > 0),
  INDEX idx_kunde_dato (kunde_id, dato),
  CONSTRAINT fk_transaksjoner_kunde
    FOREIGN KEY (kunde_id) REFERENCES kunder(kunde_id) ON DELETE CASCADE,
  CONSTRAINT fk_transaksjoner_kategori
    FOREIGN KEY (kategori_id) REFERENCES kategorier(kategori_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires    INT(11) UNSIGNED NOT NULL,
  data       MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO kategorier (kategori_navn) VALUES
  ('Bolig'),('Mat'),('Transport'),('Underholdning'),('Helse'),('Sparing'),('Inntekt'),('Annet');