import { useState } from 'react'
import { useTransactions } from '../../context/TransactionsContext.jsx'
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories.js'
import { formatAmount, formatDateDisplay } from '../../utils/format.js'
import './TransactionHistory.css'

const ALL_CATEGORIES = 'Alle kategorier'
const FILTER_CATEGORIES = [ALL_CATEGORIES, ...CATEGORIES]

const emptyFilters = {
  category: ALL_CATEGORIES,
  from: '',
  to: '',
}

function TransactionHistory() {
  const { transactions } = useTransactions()
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' })

  function updateFilter(field, value) {
    setFilters((previous) => ({ ...previous, [field]: value }))
  }

  function toggleSort(field) {
    setSort((previous) => {
      if (previous.field !== field) return { field, direction: 'desc' }
      return { field, direction: previous.direction === 'desc' ? 'asc' : 'desc' }
    })
  }

  function sortIndicator(field) {
    if (sort.field !== field) return ''
    return sort.direction === 'desc' ? ' ↓' : ' ↑'
  }

  const filtered = transactions.filter((tx) => {
    if (filters.category !== ALL_CATEGORIES && tx.category !== filters.category) return false
    if (filters.from && tx.date < filters.from) return false
    if (filters.to && tx.date > filters.to) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let result = 0
    if (sort.field === 'date') {
      result = a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    } else if (sort.field === 'amount') {
      result = a.amount - b.amount
    } else if (sort.field === 'description') {
      result = a.description.localeCompare(b.description)
    }
    return sort.direction === 'asc' ? result : -result
  })

  const hasActiveFilters =
    filters.category !== ALL_CATEGORIES || filters.from !== '' || filters.to !== ''

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaksjoner</h1>
          <p className="page-subtitle">Full oversikt over alle registrerte transaksjoner</p>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="select"
          value={filters.category}
          onChange={(event) => updateFilter('category', event.target.value)}
        >
          {FILTER_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          aria-label="Fra dato"
          value={filters.from}
          onChange={(event) => updateFilter('from', event.target.value)}
        />
        <input
          type="date"
          className="input"
          aria-label="Til dato"
          value={filters.to}
          onChange={(event) => updateFilter('to', event.target.value)}
        />
        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary" onClick={() => setFilters(emptyFilters)}>
            Nullstill filter
          </button>
        )}
      </div>

      <div className="card">
        {sorted.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('description')}>
                    Beskrivelse{sortIndicator('description')}
                  </button>
                </th>
                <th>Kategori</th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('date')}>
                    Dato{sortIndicator('date')}
                  </button>
                </th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('amount')}>
                    Beløp{sortIndicator('amount')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => (
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
                        'amount ' + (tx.type === 'income' ? 'amount-positive' : 'amount-negative')
                      }
                    >
                      {formatAmount(tx.amount, tx.type)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="page-subtitle">
            {transactions.length === 0
              ? 'Ingen transaksjoner registrert ennå.'
              : 'Ingen transaksjoner matcher filteret.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default TransactionHistory
