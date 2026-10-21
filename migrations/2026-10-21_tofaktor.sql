-- Kjør én gang mot en eksisterende database (som root):
--   sudo mysql saldo < migrations/2026-10-21_tofaktor.sql
-- Tofaktor (TOTP). Feltene er tomme (NULL) for brukere som ikke slår det på.

ALTER TABLE kunder
  ADD COLUMN tofa_hemmelighet  VARCHAR(255) NULL,              -- AES-256-GCM-kryptert TOTP-nøkkel
  ADD COLUMN tofa_aktivert_tid TIMESTAMP NULL DEFAULT NULL,    -- NULL = tofaktor er av
  ADD COLUMN tofa_siste_steg   BIGINT NULL;                    -- hindrer gjenbruk av samme kode

CREATE TABLE IF NOT EXISTS tofa_reservekoder (
  kode_id    INT AUTO_INCREMENT PRIMARY KEY,
  kunde_id   INT NOT NULL,
  kode_hash  CHAR(64) NOT NULL,                                -- HMAC-SHA256, aldri klartekst
  brukt_tid  TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_reservekode_kunde (kunde_id, kode_hash),
  CONSTRAINT fk_reservekoder_kunde
    FOREIGN KEY (kunde_id) REFERENCES kunder(kunde_id) ON DELETE CASCADE
) ENGINE=InnoDB;
