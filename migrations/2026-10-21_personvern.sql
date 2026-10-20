-- Kjør én gang mot en eksisterende database.
-- Dataminimering (GDPR art. 5 nr. 1 c): fjerner ubrukte 2FA-felt,
-- og legger til kategorien appen bruker for inntekter.

INSERT IGNORE INTO kategorier (kategori_navn) VALUES ('Inntekt');

DROP TABLE IF EXISTS tofa_reservekoder;

ALTER TABLE kunder
  DROP COLUMN tofa_aktivert,
  DROP COLUMN tofa_hemmelighet,
  DROP COLUMN tofa_siste_steg;
