import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const { user, signIn } = useUser()
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  })

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  // Midlertidig: ingen passord eller ekte autentisering. Navn og e-post
  // lagres lokalt og brukes i appen. Bytt ut med ekte innlogging senere.
  function handleSubmit(event) {
    event.preventDefault()
    signIn(form)
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
            <label className="label" htmlFor="name">
              Navn
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="input"
              required
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Logg inn
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
