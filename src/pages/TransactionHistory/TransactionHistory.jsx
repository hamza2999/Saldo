import './TransactionHistory.css'

const categories = ['Alle kategorier', 'Bolig', 'Mat', 'Transport', 'Underholdning', 'Helse', 'Inntekt', 'Annet']

// Placeholder data — bytt ut med ekte transaksjoner / state.
const transactions = [
  { id: 1, description: 'Husleie', category: 'Bolig', date: '12.09.2026', amount: -12500, type: 'expense' },
  { id: 2, description: 'Lønn', category: 'Inntekt', date: '10.09.2026', amount: 28500, type: 'income' },
  { id: 3, description: 'Rema 1000', category: 'Mat', date: '09.09.2026', amount: -642, type: 'expense' },
  { id: 4, description: 'Kollektivtransport', category: 'Transport', date: '07.09.2026', amount: -430, type: 'expense' },
  { id: 5, description: 'Netflix', category: 'Underholdning', date: '05.09.2026', amount: -149, type: 'expense' },
  { id: 6, description: 'Apotek', category: 'Helse', date: '04.09.2026', amount: -215, type: 'expense' },
  { id: 7, description: 'Kiwi', category: 'Mat', date: '02.09.2026', amount: -388, type: 'expense' },
  { id: 8, description: 'Strøm', category: 'Bolig', date: '01.09.2026', amount: -980, type: 'expense' },
  { id: 9, description: 'Frilansoppdrag', category: 'Inntekt', date: '28.08.2026', amount: 4200, type: 'income' },
  { id: 10, description: 'Spotify', category: 'Underholdning', date: '27.08.2026', amount: -119, type: 'expense' },
]

function formatAmount(amount) {
  const formatted = new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
  return amount < 0 ? `− ${formatted}` : `+ ${formatted}`
}

function TransactionHistory() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaksjoner</h1>
          <p className="page-subtitle">Full oversikt over alle registrerte transaksjoner</p>
        </div>
      </div>

      {/* TODO: koble filtrene til faktisk filtrering av listen */}
      <div className="filter-bar">
        <select className="select" defaultValue={categories[0]}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input type="date" className="input" aria-label="Fra dato" />
        <input type="date" className="input" aria-label="Til dato" />
        <button type="button" className="btn btn-secondary">
          Filtrer
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>
                {/* TODO: koble til faktisk sortering */}
                <button type="button" className="th-sort">
                  Beskrivelse
                </button>
              </th>
              <th>Kategori</th>
              <th>
                <button type="button" className="th-sort">
                  Dato ↓
                </button>
              </th>
              <th>
                <button type="button" className="th-sort">
                  Beløp
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.description}</td>
                <td>
                  <span className="category-pill">
                    <span className="category-dot" />
                    {tx.category}
                  </span>
                </td>
                <td>{tx.date}</td>
                <td>
                  <span
                    className={
                      'amount ' +
                      (tx.type === 'income' ? 'amount-positive' : 'amount-negative')
                    }
                  >
                    {formatAmount(tx.amount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransactionHistory
