import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../../context/TransactionsContext.jsx'
import { CATEGORIES } from '../../constants/categories.js'
import './AddTransaction.css'

const emptyForm = {
  type: 'expense',
  amount: '',
  date: '',
  category: '',
  description: '',
}

function AddTransaction() {
  const [form, setForm] = useState(emptyForm)
  const { addTransaction } = useTransactions()
  const navigate = useNavigate()

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    addTransaction({
      type: form.type,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      description: form.description,
    })

    navigate('/dashboard')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Legg til transaksjon</h1>
          <p className="page-subtitle">Registrer en ny inntekt eller utgift</p>
        </div>
      </div>

      <div className="card add-transaction-card">
        <form className="add-transaction-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <span className="label">Type</span>
            <div className="toggle-group">
              <label className="toggle-option is-expense">
                <input
                  type="radio"
                  name="type"
                  checked={form.type === 'expense'}
                  onChange={() => updateField('type', 'expense')}
                />
                Utgift
              </label>
              <label className="toggle-option is-income">
                <input
                  type="radio"
                  name="type"
                  checked={form.type === 'income'}
                  onChange={() => updateField('type', 'income')}
                />
                Inntekt
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="amount">
                Beløp
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                className="input"
                placeholder="0,00"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="date">
                Dato
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                className="input"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="category">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              className="select"
              required
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              <option value="" disabled>
                Velg kategori
              </option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="description">
              Beskrivelse
            </label>
            <input
              id="description"
              name="description"
              type="text"
              className="input"
              placeholder="F.eks. dagligvarer, husleie, lønn ..."
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Lagre transaksjon
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddTransaction
