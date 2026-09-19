import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard.jsx'
import './Dashboard.css'

// Placeholder data — bytt ut med ekte data / state når logikken er på plass.
const spendingByDay = [30, 45, 28, 60, 52, 40, 65, 48, 70, 55, 38, 62, 58, 44]

const categoryBreakdown = [
  { label: 'Bolig', share: 34, color: 'var(--color-primary)' },
  { label: 'Mat', share: 22, color: '#4C6FA5' },
  { label: 'Transport', share: 18, color: '#7FA9A0' },
  { label: 'Underholdning', share: 14, color: '#C9A24B' },
  { label: 'Annet', share: 12, color: '#B8BEC7' },
]

const donutGradient = `conic-gradient(
  var(--color-primary) 0% 34%,
  #4C6FA5 34% 56%,
  #7FA9A0 56% 74%,
  #C9A24B 74% 88%,
  #B8BEC7 88% 100%
)`

const recentTransactions = [
  { id: 1, description: 'Husleie', category: 'Bolig', date: '12.09.2026', amount: -12500, type: 'expense' },
  { id: 2, description: 'Lønn', category: 'Inntekt', date: '10.09.2026', amount: 28500, type: 'income' },
  { id: 3, description: 'Rema 1000', category: 'Mat', date: '09.09.2026', amount: -642, type: 'expense' },
  { id: 4, description: 'Kollektivtransport', category: 'Transport', date: '07.09.2026', amount: -430, type: 'expense' },
  { id: 5, description: 'Netflix', category: 'Underholdning', date: '05.09.2026', amount: -149, type: 'expense' },
]

function formatAmount(amount) {
  const formatted = new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
  return amount < 0 ? `− ${formatted}` : `+ ${formatted}`
}

function Dashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Oversikt</h1>
          <p className="page-subtitle">Din økonomi denne måneden</p>
        </div>
      </div>

      <section className="card balance-hero">
        <span className="stat-card-label">Total saldo</span>
        {/* TODO: erstatt med faktisk beregnet saldo */}
        <span className="amount amount-lg">kr 42 350</span>
      </section>

      <div className="grid grid-3 dashboard-stats">
        <StatCard label="Total inntekt denne måneden" value="kr 28 500" variant="positive" />
        <StatCard label="Total utgifter denne måneden" value="kr 14 200" variant="negative" />
        <StatCard label="Netto" value="kr 14 300" variant="positive" />
      </div>

      <div className="grid grid-2 dashboard-charts">
        <div className="card">
          <div className="card-header">
            <h2 className="section-title">Utgifter siste 30 dager</h2>
          </div>
          <div className="spark-chart">
            {spendingByDay.map((value, index) => (
              <div
                key={index}
                className="spark-bar"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="section-title">Utgifter per kategori</h2>
          </div>
          <div className="donut-wrap">
            <div className="donut-chart" style={{ background: donutGradient }} />
            <ul className="donut-legend">
              {categoryBreakdown.map((item) => (
                <li key={item.label} className="donut-legend-item">
                  <span
                    className="category-dot"
                    style={{ background: item.color }}
                  />
                  <span className="donut-legend-label">{item.label}</span>
                  <span className="donut-legend-value">{item.share}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="card dashboard-recent">
        <div className="card-header">
          <h2 className="section-title">Siste transaksjoner</h2>
          <Link to="/transactions" className="btn-ghost">
            Se alle
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Beskrivelse</th>
              <th>Kategori</th>
              <th>Dato</th>
              <th>Beløp</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((tx) => (
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





export default Dashboard
