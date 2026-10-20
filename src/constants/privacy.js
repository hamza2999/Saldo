// Brukes av både frontend og server.js. Øk POLICY_VERSION når
// personvernerklæringen endres vesentlig, så lagres ny versjon ved samtykke.
export const POLICY_VERSION = 'v1'
export const POLICY_UPDATED = '2026-10-21'

// TODO: Fyll inn ekte opplysninger før lansering.
export const CONTROLLER = {
  name: '[Ditt navn / firmanavn]',
  address: '[Adresse]',
  email: '[kontakt@ditt-domene.no]',
}

export const DPO = {
  name: '[Navn på personvernombud]',
  email: '[personvernombud@ditt-domene.no]',
}

// Sikkerhetskopier: hvor ofte de tas og testes, og hvor lenge de beholdes.
export const BACKUP_INTERVAL = '20. dag'
export const BACKUP_RETENTION = '6 måneder'

// Hvor databasen kjører, f.eks. «Norge» eller «EU/EØS (Frankfurt)».
export const DATA_LOCATION = '[land/region for serveren]'
