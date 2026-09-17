import './Settings.css'

function Settings() {
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
          <div className="form-row">
            <div className="form-group">
              <span className="label">Navn</span>
              <p className="settings-value">Hamza Ali</p>
            </div>
            <div className="form-group">
              <span className="label">E-post</span>
              <p className="settings-value">hamza@example.com</p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="section-title">Endre passord</h2>
          </div>
          {/* TODO: koble til faktisk oppdatering av passord */}
          <form className="settings-form">
            <div className="form-group">
              <label className="label" htmlFor="current-password">
                Nåværende passord
              </label>
              <input
                id="current-password"
                name="current-password"
                type="password"
                className="input"
                placeholder="••••••••"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="new-password">
                  Nytt passord
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="confirm-password">
                  Bekreft nytt passord
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Oppdater passord
            </button>
          </form>
        </section>

        <section className="danger-zone">
          <h2 className="section-title">Faresone</h2>
          <p className="page-subtitle">
            Sletting av konto fjerner all data permanent og kan ikke angres.
          </p>
          {/* TODO: koble til faktisk sletting, gjerne med bekreftelsessteg */}
          <button type="button" className="btn btn-danger danger-zone-action">
            Slett konto
          </button>
        </section>
      </div>
    </div>
  )
}

export default Settings
