import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { signIn } = useUser();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epost: form.email, passord: form.password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Serverfeil (${res.status})` }));
        throw new Error(err.error);
      }

      const user = await res.json();
      signIn(user.kunde_id, user.epost);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
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

        {error && <p className="auth-error">{error}</p>}

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
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
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
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Logg inn
          </button>
        </form>
        <div className="auth-alt">
          Har du ikke en konto? <a href="/register">Registrer deg her</a>
        </div>
      </div>
    </div>
  );
}

export default Login;