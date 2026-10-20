import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import Footer from '../components/Footer.jsx';
import './Login/Login.css';

function Register() {
  const navigate = useNavigate();
  const { user, signIn } = useUser();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    consent: false,
  });
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError('Passordene er ikke like');
      return;
    }

    try {
      const res = await fetch('/api/registrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epost: form.email,
          passord: form.password,
          samtykke: form.consent,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Serverfeil (${res.status})` }));
        throw new Error(err.error);
      }

      await signIn();
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

        <h1 className="auth-title">Opprett konto</h1>
        <p className="auth-subtitle">Vi lagrer kun e-post, passord (kryptert) og transaksjonene dine.</p>

        {error && <p className="auth-error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
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
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
            <span className="helper-text">Minst 8 tegn</span>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="confirm-password">
              Gjenta passord
            </label>
            <input
              id="confirm-password"
              type="password"
              className="input"
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
            />
          </div>

          {/* GDPR-samtykke: aldri forhåndsavkrysset */}
          <label className="consent-row">
            <input
              type="checkbox"
              required
              checked={form.consent}
              onChange={(event) => updateField('consent', event.target.checked)}
            />
            <span>
              Jeg har lest og godtar{' '}
              <Link to="/personvern" target="_blank" rel="noopener">
                personvernerklæringen
              </Link>
              , og samtykker til at Saldo lagrer e-postadressen min og transaksjonene jeg
              registrerer for å levere tjenesten. Jeg kan når som helst slette kontoen min.
            </span>
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={!form.consent}>
            Opprett konto
          </button>
        </form>
        <div className="auth-alt">
          Har du allerede en konto? <Link to="/">Logg inn</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Register;
