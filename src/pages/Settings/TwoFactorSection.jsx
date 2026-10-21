import { useState } from 'react'
import { useUser } from '../../context/UserContext.jsx'

function formatTimestamp(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' }).format(new Date(value))
}

// 'ABCDEFGH...' -> 'ABCD EFGH ...' så nøkkelen er lettere å skrive inn for hånd.
function groupKey(key) {
  return key.replace(/(.{4})/g, '$1 ').trim()
}

function downloadCodes(codes) {
  const text = [
    'Saldo – reservekoder for tofaktor',
    'Hver kode kan brukes én gang hvis du mister telefonen.',
    '',
    ...codes,
    '',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'saldo-reservekoder.txt'
  link.click()
  URL.revokeObjectURL(url)
}

const EMPTY_FORM = { passord: '', kode: '' }

function TwoFactorSection() {
  const { user, startTwoFactorSetup, enableTwoFactor, disableTwoFactor, newBackupCodes } =
    useUser()

  const [setup, setSetup] = useState(null) // { qr, hemmelighet } under oppsett
  const [codes, setCodes] = useState(null) // nye reservekoder som vises én gang
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState({ error: null, success: null })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setStatus({ error: null, success: null })
  }

  async function run(action) {
    setBusy(true)
    setStatus({ error: null, success: null })
    try {
      await action()
    } catch (err) {
      setStatus({ error: err.message, success: null })
    } finally {
      setBusy(false)
    }
  }

  function handleStart() {
    run(async () => {
      setSetup(await startTwoFactorSetup())
      setForm(EMPTY_FORM)
    })
  }

  function handleEnable(event) {
    event.preventDefault()
    run(async () => {
      const newCodes = await enableTwoFactor(form.passord, form.kode.trim())
      setSetup(null)
      setForm(EMPTY_FORM)
      setCodes(newCodes)
    })
  }

  // Ett skjema med to knapper: «Lag nye reservekoder» og «Slå av tofaktor».
  function handleManage(event) {
    event.preventDefault()
    const action = event.nativeEvent.submitter?.value
    if (action === 'deaktiver') {
      if (!window.confirm('Slå av tofaktor? Kontoen blir da bare beskyttet av passordet.')) return
      run(async () => {
        await disableTwoFactor(form.passord, form.kode.trim())
        setForm(EMPTY_FORM)
        setStatus({ error: null, success: 'Tofaktor er slått av.' })
      })
    } else {
      run(async () => {
        const newCodes = await newBackupCodes(form.passord, form.kode.trim())
        setForm(EMPTY_FORM)
        setCodes(newCodes)
      })
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function handleCodesSaved() {
    setCodes(null)
    setCopied(false)
    setStatus({ error: null, success: 'Tofaktor er aktiv ✓' })
  }

  const passwordAndCodeFields = (idPrefix, codeLabel) => (
    <div className="form-row">
      <div className="form-group">
        <label className="label" htmlFor={`${idPrefix}-password`}>
          Passord
        </label>
        <input
          id={`${idPrefix}-password`}
          type="password"
          className="input"
          required
          autoComplete="current-password"
          value={form.passord}
          onChange={(event) => update('passord', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="label" htmlFor={`${idPrefix}-code`}>
          {codeLabel}
        </label>
        <input
          id={`${idPrefix}-code`}
          type="text"
          className="input"
          required
          autoComplete="one-time-code"
          maxLength={20}
          placeholder="123456"
          value={form.kode}
          onChange={(event) => update('kode', event.target.value)}
        />
      </div>
    </div>
  )

  let content

  if (codes) {
    // Vises rett etter aktivering eller nye koder — siste gang kodene kan sees.
    content = (
      <>
        <p className="tofa-warning">
          Lagre disse reservekodene et trygt sted nå. De vises bare denne ene gangen. Hver kode kan
          brukes én gang til å logge inn hvis du mister telefonen.
        </p>
        <ul className="tofa-codes">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <div className="settings-actions">
          <button type="button" className="btn btn-secondary" onClick={() => downloadCodes(codes)}>
            Last ned (.txt)
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            {copied ? 'Kopiert ✓' : 'Kopier'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCodesSaved}>
            Jeg har lagret kodene
          </button>
        </div>
      </>
    )
  } else if (user.tofaAktivertTid) {
    content = (
      <>
        <dl className="settings-facts">
          <dt>Status</dt>
          <dd>På siden {formatTimestamp(user.tofaAktivertTid)}</dd>
          <dt>Ubrukte reservekoder</dt>
          <dd>{user.reservekoderIgjen} av 10</dd>
        </dl>
        {user.reservekoderIgjen <= 3 && (
          <p className="tofa-warning">
            Du har få reservekoder igjen. Lag nye, så du ikke blir låst ute hvis du mister
            telefonen.
          </p>
        )}
        <form onSubmit={handleManage}>
          <p className="helper-text tofa-help">
            Bekreft med passord og en kode fra appen (eller en reservekode) for å endre.
          </p>
          {passwordAndCodeFields('tofa-manage', 'Kode')}
          <div className="settings-actions">
            <button
              type="submit"
              name="handling"
              value="nye-koder"
              className="btn btn-secondary"
              disabled={busy}
            >
              Lag nye reservekoder
            </button>
            <button
              type="submit"
              name="handling"
              value="deaktiver"
              className="btn btn-danger"
              disabled={busy}
            >
              Slå av tofaktor
            </button>
          </div>
        </form>
      </>
    )
  } else if (setup) {
    content = (
      <>
        <ol className="tofa-steps">
          <li>
            Åpne en autentiseringsapp (f.eks. Google Authenticator, Microsoft Authenticator eller
            Bitwarden) og skann QR-koden.
          </li>
          <li>Skriv inn den 6-sifrede koden appen viser, sammen med passordet ditt.</li>
        </ol>
        <img className="tofa-qr" src={setup.qr} alt="QR-kode for autentiseringsappen" />
        <p className="helper-text tofa-help">Kan du ikke skanne? Skriv inn denne nøkkelen i appen:</p>
        <code className="tofa-key">{groupKey(setup.hemmelighet)}</code>
        <form onSubmit={handleEnable}>
          {passwordAndCodeFields('tofa-enable', 'Kode fra appen')}
          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Slå på tofaktor
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSetup(null)
                setForm(EMPTY_FORM)
              }}
            >
              Avbryt
            </button>
          </div>
        </form>
      </>
    )
  } else {
    content = (
      <>
        <p className="page-subtitle">
          Med tofaktor må du i tillegg til passordet skrive inn en kode fra en app på telefonen når
          du logger inn. Da kommer ingen inn på kontoen selv om passordet blir kjent.
        </p>
        <div className="settings-actions danger-zone-action">
          <button type="button" className="btn btn-primary" onClick={handleStart} disabled={busy}>
            Slå på tofaktor
          </button>
        </div>
      </>
    )
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="section-title">Tofaktorautentisering</h2>
      </div>
      {status.error && <p className="form-error">{status.error}</p>}
      {content}
      {status.success && !codes && <p className="form-success tofa-success">{status.success}</p>}
    </section>
  )
}

export default TwoFactorSection
