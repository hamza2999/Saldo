// Ett sted for kategoriene, brukt av både "Legg til transaksjon",
// "Transaksjoner" (filter) og Dashboard (kakediagram-farger).
// Legg til/fjern kategorier her — alle steder som importerer dette
// oppdateres automatisk.

export const CATEGORIES = [
  'Bolig',
  'Mat',
  'Transport',
  'Underholdning',
  'Helse',
  'Sparing',
  'Inntekt',
  'Annet',
]

// Farger brukt i kategori-fordelingen på Dashboard. "Inntekt" er bevisst
// utelatt — den fordelingen viser kun utgifter.
export const CATEGORY_COLORS = {
  Bolig: '#0B2447',
  Mat: '#4C6FA5',
  Transport: '#7FA9A0',
  Underholdning: '#C9A24B',
  Helse: '#9B6B70',
  Sparing: '#6E8B74',
  Annet: '#B8BEC7',
}
