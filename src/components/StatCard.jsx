import './StatCard.css'

/**
 * Generic stat widget used on the dashboard.
 * variant: 'positive' | 'negative' | 'neutral'
 */
function StatCard({ label, value, variant = 'neutral' }) {
  const amountClass =
    variant === 'positive'
      ? 'amount amount-positive'
      : variant === 'negative'
        ? 'amount amount-negative'
        : 'amount'

  return (
    <div className="card stat-card">
      <span className="stat-card-label">{label}</span>
      <span className={amountClass + ' stat-card-value'}>{value}</span>
    </div>
  )
}

export default StatCard
