// Små, gjenbrukbare formateringsfunksjoner. Samlet ett sted i stedet for
// å bli kopiert inn i hver side som trenger å vise beløp/datoer.

// For enkeltbeløp i lister/tabeller, der "type" bestemmer fortegn/farge-logikk
// (inntekt = "+", utgift = "−").
export function formatAmount(amount, type) {
  const formatted = new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  return type === 'expense' ? `− ${formatted}` : `+ ${formatted}`
}

// For en allerede utregnet sum (f.eks. total saldo), der tallet selv kan
// være negativt eller positivt — ingen antakelse om "type".
export function formatCurrency(amount) {
  const formatted = new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  return amount < 0 ? `− ${formatted}` : formatted
}

// Datoene lagres som ISO-strenger ('2026-09-19', slik <input type="date">
// leverer dem). Denne gjør dem lesbare i tabeller: '19.09.2026'.
export function formatDateDisplay(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}
