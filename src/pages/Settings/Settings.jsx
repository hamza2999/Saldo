import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import { useTransactions } from '../../context/TransactionsContext.jsx'
import { BACKUP_RETENTION } from '../../constants/privacy.js'
import TwoFactorSection from './TwoFactorSection.jsx'
import './Settings.css'

// Tidsstempler fra databasen ('2026-10-21T08:15:00.000Z') -> '21.10.2026'
function formatTimestamp(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' }).format(new Date(value))
}

// Felles tilstand for et skjema: verdier, feilmelding og "lagret"-melding.
function useFormState(initial) {
  const [values, setValues] = useState(initial)
  const [status, setStatus] = useState({ error: null, success: null })

  function update(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setStatus({ error: null, success: null })
  }

  async function submit(action, successMessage) {
    try {
      await action()
      setValues(initial)
      setStatus({ error: null, success: successMessage })
    } catch (err) {
      setStatus({ error: err.message, success: null })
    }
  }

  return { values, status, update, submit }
}

function Settings() {
  const navigate = useNavigate()
  const { user, changeEmail, changePassword, deleteAccount } = useUser()
  const { transactions, clearTransactions } = useTransactions()

  const emailForm = useFormState({ epost: '', passord: '' })
  const passwordForm = useFormState({ passord: '', nyttPassord: '', bekreft: '' })
  const deleteForm = useFormState({ passord: '' })
  const [clearError, setClearError] = useState(null)

  function handleEmailSubmit(event) {
    event.preventDefault()
    const { epost, passord } = emailForm.values
    emailForm.submit(() => changeEmail(epost.trim(), passord), 'E-posten er oppdatert ✓')
  }

  function handlePasswordSubmit(event) {
    event.preventDefault()
    const { passord, nyttPassord, bekreft } = passwordForm.values
    passwordForm.submit(async () => {
      if (nyttPassord !== bekreft) throw new Error('De nye passordene er ikke like')
      await changePassword(passord, nyttPassord)
    }, 'Passordet er endret ✓ Andre enheter er logget ut.')
  }

  async function handleClearTransactions() {
    const confirmed = window.confirm(
      `Slette alle ${transactions.length} transaksjoner? Dette kan ikke angres.`,
    )
    if (!confirmed) return
    try {
      await clearTransactions()
      setClearError(null)
    } catch (err) {
      setClearError(err.message)
    }
  }

  function handleDeleteAccount(event) {
    event.preventDefault()
    const confirmed = window.confirm(
      'Slette kontoen og all data permanent? Dette kan ikke angres.',
    )
    if (!confirmed) return
    deleteForm.submit(async () => {
      await deleteAccount(deleteForm.values.passord)
      navigate('/', { replace: true })
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Innstillinger</h1>
          <p className="page-subtitle">Administrer kontoen og dataene dine</p>
        </div>
      </div>

      <div className="settings-stack">
        <section className="card">
          <div className="card-header">
            <h2 className="section-title">E-post</h2>
          </div>
          <p className="settings-current">
            Nåværende: <span className="settings-value">{user.epost}</span>
          </p>
          {emailForm.status.error && <p className="form-error">{emailForm.status.error}</p>}
          <form onSubmit={handleEmailSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="settings-email">
                  Ny e-post
                </label>
                <input
                  id="settings-email"
                  type="email"
                  className="input"
                  required
                  autoComplete="email"
                  value={emailForm.values.epost}
                  onChange={(event) => emailForm.update('epost', event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="settings-email-password">
                  Bekreft med passord
                </label>
                <input
                  id="settings-email-password"
                  type="password"
                  className="input"
                  required
                  autoComplete="current-password"
                  value={emailForm.values.passord}
                  onChange={(event) => emailForm.update('passord', event.target.value)}
                />
              </div>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn btn-primary">
                Lagre e-post
              </button>
              {emailForm.status.success && (
                <span className="form-success">{emailForm.status.success}</span>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="section-title">Passord</h2>
          </div>
          {passwordForm.status.error && <p className="form-error">{passwordForm.status.error}</p>}
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="label" htmlFor="settings-current-password">
                Nåværende passord
              </label>
              <input
                id="settings-current-password"
                type="password"
                className="input"
                required
                autoComplete="current-password"
                value={passwordForm.values.passord}
                onChange={(event) => passwordForm.update('passord', event.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="settings-new-password">
                  Nytt passord
                </label>
                <input
                  id="settings-new-password"
                  type="password"
                  className="input"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={passwordForm.values.nyttPassord}
                  onChange={(event) => passwordForm.update('nyttPassord', event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="settings-confirm-password">
                  Gjenta nytt passord
                </label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  className="input"
                  required
                  autoComplete="new-password"
                  value={passwordForm.values.bekreft}
                  onChange={(event) => passwordForm.update('bekreft', event.target.value)}
                />
              </div>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn btn-primary">
                Endre passord
              </button>
              {passwordForm.status.success && (
                <span className="form-success">{passwordForm.status.success}</span>
              )}
            </div>
          </form>
        </section>

        <TwoFactorSection />

        <section className="card">
          <div className="card-header">
            <h2 className="section-title">Personvern og dine data</h2>
          </div>
          <dl className="settings-facts">
            <dt>Konto opprettet</dt>
            <dd>{formatTimestamp(user.opprettet)}</dd>
            <dt>Samtykke gitt</dt>
            <dd>
              {formatTimestamp(user.samtykkeTid)} (personvernerklæring {user.samtykkeVersjon})
            </dd>
            <dt>Lagrede transaksjoner</dt>
            <dd>{transactions.length}</dd>
          </dl>
          <p className="page-subtitle">
            Vi lagrer kun e-postadressen din, passordet (kryptert) og transaksjonene dine. Vi
            selger aldri dataene dine. Les mer i{' '}
            <Link to="/personvern" className="settings-link">
              personvernerklæringen
            </Link>
            .
          </p>
          <div className="settings-actions danger-zone-action">
            {/* Vanlig lenke: serveren sender filen som nedlasting */}
            <a href="/api/meg/eksport" className="btn btn-secondary" download>
              Last ned mine data (JSON)
            </a>
          </div>
        </section>

        <section className="danger-zone">
          <h2 className="section-title">Faresone</h2>
          <p className="page-subtitle">
            Sletting fjerner data permanent og kan ikke angres.
          </p>

          {clearError && <p className="form-error">{clearError}</p>}
          <div className="settings-actions danger-zone-action">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleClearTransactions}
              disabled={transactions.length === 0}
            >
              Slett alle transaksjoner
            </button>
          </div>

          <form className="danger-zone-delete" onSubmit={handleDeleteAccount}>
            <h3 className="settings-subtitle">Slett konto</h3>
            <p className="helper-text">
              E-post, passord, samtykke og alle transaksjoner slettes umiddelbart, og du logges
              ut på alle enheter. Eldre sikkerhetskopier slettes automatisk innen{' '}
              {BACKUP_RETENTION}. Last gjerne ned dataene dine først.
            </p>
            {deleteForm.status.error && <p className="form-error">{deleteForm.status.error}</p>}
            <div className="form-group">
              <label className="label" htmlFor="settings-delete-password">
                Bekreft med passord
              </label>
              <input
                id="settings-delete-password"
                type="password"
                className="input"
                required
                autoComplete="current-password"
                value={deleteForm.values.passord}
                onChange={(event) => deleteForm.update('passord', event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-danger">
              Slett kontoen permanent
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Settings
