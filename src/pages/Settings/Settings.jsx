import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import { useTransactions } from '../../context/TransactionsContext.jsx'
import './Settings.css'

function Settings() {
  const navigate = useNavigate()
  const { user, updateUser, signOut } = useUser()
  const { transactions, clearTransactions } = useTransactions()
  const [form, setForm] = useState({ name: user.name, email: user.email })
  const [saved, setSaved] = useState(false)

  const hasChanges = form.name.trim() !== user.name || form.email.trim() !== user.email

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setSaved(false)
  }

  function handleSave(event) {
    event.preventDefault()
    updateUser({ name: form.name.trim(), email: form.email.trim() })
    setSaved(true)
  }

  function handleClearTransactions() {
    const confirmed = window.confirm(
      `Slette alle ${transactions.length} transaksjoner? Dette kan ikke angres.`,
    )
    if (confirmed) clearTransactions()
  }

  // Midlertidig: "kontoen" finnes bare lokalt i nettleseren, så sletting
  // betyr å fjerne transaksjonene og brukeren fra localStorage.
  function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Slette kontoen og all data permanent? Dette kan ikke angres.',
    )
    if (!confirmed) return
    clearTransactions()
    signOut()
    navigate('/')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Innstillinger</h1>
          <p className="page-subtitle">Administrer kontoen din</p>
        </div>
      </div>

      <div className="settings-stack">
        <section className="card">
          <div className="card-header">
            <h2 className="section-title">Kontoinformasjon</h2>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="settings-name">
                  Navn
                </label>
                <input
                  id="settings-name"
                  type="text"
                  className="input"
                  required
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="settings-email">
                  E-post
                </label>
                <input
                  id="settings-email"
                  type="email"
                  className="input"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </div>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn btn-primary" disabled={!hasChanges}>
                Lagre endringer
              </button>
              {saved && <span className="helper-text">Lagret ✓</span>}
            </div>
          </form>
        </section>

        <section className="danger-zone">
          <h2 className="section-title">Faresone</h2>
          <p className="page-subtitle">
            Sletting fjerner data permanent og kan ikke angres.
          </p>
          <div className="settings-actions danger-zone-action">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleClearTransactions}
              disabled={transactions.length === 0}
            >
              Slett alle transaksjoner
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>
              Slett konto
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Settings
