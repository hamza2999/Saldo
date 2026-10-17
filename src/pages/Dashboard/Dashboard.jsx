import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard.jsx'
import { useTransactions } from '../../context/TransactionsContext.jsx'
import { CATEGORY_COLORS } from '../../constants/categories.js'
import {
  formatAmount,
  formatCurrency,
  formatDateDisplay,
  toISODate,
} from '../../utils/format.js'
import './Dashboard.css'

const SPENDING_DAYS = 30
const RECENT_COUNT = 5

function signedAmount(tx) {
  return tx.type === 'income' ? tx.amount : -tx.amount
}

// Siste 30 dager, eldste først: [{ date: '2026-09-19', total: 642 }, ...]
function getDailySpending(transactions, today) {
  const days = []
  for (let offset = SPENDING_DAYS - 1; offset >= 0; offset--) {
    const day = new Date(today)
    day.setDate(today.getDate() - offset)
    days.push({ date: toISODate(day), total: 0 })
  }

  const byDate = new Map(days.map((day) => [day.date, day]))
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const day = byDate.get(tx.date)
    if (day) day.total += tx.amount
  }

  return days
}

// Utgifter per kategori, største først, med andel i prosent.
function getCategoryBreakdown(expenses) {
  const totals = new Map()
  for (const tx of expenses) {
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
  }

  const sum = [...totals.values()].reduce((a, b) => a + b, 0)

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, total]) => ({
      label,
      total,
      share: sum > 0 ? (total / sum) * 100 : 0,
      color: CATEGORY_COLORS[label] || 'var(--color-primary)',
    }))
}

function buildDonutGradient(breakdown) {
  let start = 0
  const stops = breakdown.map((item) => {
    const end = start + item.share
    const stop = `${item.color} ${start}% ${end}%`
    start = end
    return stop
  })
  return `conic-gradient(${stops.join(', ')})`
}

function Dashboard() {
  const { transactions } = useTransactions()

  const today = new Date()
  const currentMonth = toISODate(today).slice(0, 7) // '2026-09'
  const monthName = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' }).format(today)

  const balance = transactions.reduce((sum, tx) => sum + signedAmount(tx), 0)

  const thisMonth = transactions.filter((tx) => tx.date.startsWith(currentMonth))
  const monthIncome = thisMonth
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const monthExpenses = thisMonth
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const monthNet = monthIncome - monthExpenses

  const dailySpending = getDailySpending(transactions, today)
  const maxDaily = Math.max(...dailySpending.map((day) => day.total))

  const categoryBreakdown = getCategoryBreakdown(thisMonth.filter((tx) => tx.type === 'expense'))

  const recentTransactions = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, RECENT_COUNT)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Oversikt</h1>
          <p className="page-subtitle">Din økonomi i {monthName}</p>
        </div>
      </div>

      <section className="card balance-hero">
        <div className="balance-hero-content">
          <span className="balance-hero-label">Total saldo</span>
          <span className={'amount amount-lg balance-hero-amount' + (balance < 0 ? ' amount-negative' : '')}>
            {formatCurrency(balance)}
          </span>
          <p className="balance-hero-caption">Basert på alle registrerte inntekter og utgifter</p>
        </div>
        <Link to="/add-transaction" className="btn balance-hero-action">
          <span aria-hidden="true">+</span>
          Legg til transaksjon
        </Link>
      </section>

      <div className="grid grid-3 dashboard-stats">
        <StatCard
          label="Total inntekt denne måneden"
          value={formatCurrency(monthIncome)}
          variant="positive"
        />
        <StatCard
          label="Total utgifter denne måneden"
          value={formatCurrency(monthExpenses)}
          variant="negative"
        />
        <StatCard
          label="Netto"
          value={formatCurrency(monthNet)}
          variant={monthNet < 0 ? 'negative' : 'positive'}
        />
      </div>

      <div className="grid grid-2 dashboard-charts">
        <div className="card">
          <div className="card-header">
            <h2 className="section-title">Utgifter siste 30 dager</h2>
          </div>
          {maxDaily > 0 ? (
            <div className="spark-chart" role="img" aria-label="Søylediagram over utgifter de siste 30 dagene">
              {dailySpending.map((day) => (
                <div
                  key={day.date}
                  className="spark-bar"
                  style={{ height: `${(day.total / maxDaily) * 100}%` }}
                  title={`${formatDateDisplay(day.date)}: ${formatCurrency(day.total)}`}
                />
              ))}
            </div>
          ) : (
            <p className="page-subtitle">Ingen utgifter de siste 30 dagene.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="section-title">Utgifter per kategori</h2>
          </div>
          {categoryBreakdown.length > 0 ? (
            <div className="donut-wrap">
              <div
                className="donut-chart"
                style={{ background: buildDonutGradient(categoryBreakdown) }}
              />
              <ul className="donut-legend">
                {categoryBreakdown.map((item) => (
                  <li
                    key={item.label}
                    className="donut-legend-item"
                    title={formatCurrency(item.total)}
                  >
                    <span className="category-dot" style={{ background: item.color }} />
                    <span className="donut-legend-label">{item.label}</span>
                    <span className="donut-legend-value">{Math.round(item.share)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="page-subtitle">Ingen utgifter registrert denne måneden.</p>
          )}
        </div>
      </div>

      <div className="card dashboard-recent">
        <div className="card-header">
          <h2 className="section-title">Siste transaksjoner</h2>
          <Link to="/transactions" className="btn-ghost">
            Se alle
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="dashboard-table-wrap">
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
                    <td>{tx.description || '—'}</td>
                    <td>
                      <span className="category-pill">
                        <span
                          className="category-dot"
                          style={{ background: CATEGORY_COLORS[tx.category] || 'var(--color-primary)' }}
                        />
                        {tx.category}
                      </span>
                    </td>
                    <td>{formatDateDisplay(tx.date)}</td>
                    <td>
                      <span
                        className={
                          'amount ' +
                          (tx.type === 'income' ? 'amount-positive' : 'amount-negative')
                        }
                      >
                        {formatAmount(tx.amount, tx.type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="page-subtitle">
            Ingen transaksjoner ennå.{' '}
            <Link to="/add-transaction" className="btn-ghost">
              Legg til den første
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
