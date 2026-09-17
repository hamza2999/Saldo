import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  // Midlertidig: sender deg bare videre til dashbordet, ingen ekte
  // innlogging eller validering. Erstatt med din egen logikk
  // (autentisering, feilhåndtering osv.) når du er klar.
  function handleSubmit(event) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark" />
          <span className="auth-brand-name">Saldo</span>
        </div>

        <h1 className="auth-title">Logg inn</h1>
        <p className="auth-subtitle">Få oversikt over økonomien din på ett sted.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="navn@epost.no"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">
              Passord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Logg inn
          </button>
        </form>

        <p className="auth-switch">
          Har du ikke en konto?{' '}
          <a href="#" className="btn-ghost">
            Registrer deg
          </a>
        </p>
      </div>
    </div>
  )
}

export default Login
