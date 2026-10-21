import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import Footer from '../../components/Footer.jsx';
import './Login.css';

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `Serverfeil (${res.status})` }));
  return { ok: res.ok, data };
}

function Login() {
  const navigate = useNavigate();
  const { user, signIn } = useUser();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  // 'passord' = steg 1, 'kode' = steg 2 (tofaktor)
  const [step, setStep] = useState('passord');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Allerede innlogget (gyldig sesjon) → rett til oversikten.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function finishLogin() {
    await signIn();
    navigate('/dashboard');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);

    try {
      const { ok, data } = await postJson('/api/login', {
        epost: form.email,
        passord: form.password,
      });
      if (!ok) throw new Error(data.error);

      if (data.trenger2fa) {
        setError(null);
        setCode('');
        setStep('kode');
        return;
      }

      await finishLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCodeSubmit(event) {
    event.preventDefault();
    setBusy(true);

    try {
      const { ok, data } = await postJson('/api/login/2fa', { kode: code.trim() });
      if (!ok) {
        // Utløpt eller for mange forsøk: tilbake til passord-steget.
        if (data.startPaaNytt) backToPassword();
        throw new Error(data.error);
      }
      await finishLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function backToPassword() {
    setStep('passord');
    setCode('');
    updateField('password', '');
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark" />
          <span className="auth-brand-name">Saldo</span>
        </div>

        {step === 'passord' ? (
          <>
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
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                Logg inn
              </button>
            </form>
            <div className="auth-alt">
              Har du ikke en konto? <Link to="/register">Registrer deg her</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Bekreft at det er deg</h1>
            <p className="auth-subtitle">
              Skriv inn den 6-sifrede koden fra autentiseringsappen din. Har du ikke telefonen,
              kan du bruke en av reservekodene.
            </p>

            {error && <p className="auth-error">{error}</p>}

            <form className="auth-form" onSubmit={handleCodeSubmit}>
              <div className="form-group">
                <label className="label" htmlFor="tofa-kode">
                  Kode
                </label>
                <input
                  id="tofa-kode"
                  name="kode"
                  type="text"
                  className="input"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="text"
                  maxLength={20}
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                Bekreft
              </button>
            </form>
            <div className="auth-alt">
              <button type="button" className="btn btn-ghost" onClick={backToPassword}>
                Tilbake
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Login;
