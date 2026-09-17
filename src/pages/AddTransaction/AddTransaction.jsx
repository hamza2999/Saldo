import './AddTransaction.css'

const categories = [
  'Bolig',
  'Mat',
  'Transport',
  'Underholdning',
  'Helse',
  'Sparing',
  'Inntekt',
  'Annet',
]

function AddTransaction() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Legg til transaksjon</h1>
          <p className="page-subtitle">Registrer en ny inntekt eller utgift</p>
        </div>
      </div>

      <div className="card add-transaction-card">
        {/* TODO: koble til faktisk lagring (state, validering, onSubmit) */}
        <form className="add-transaction-form">
          <div className="form-group">
            <span className="label">Type</span>
            <div className="toggle-group">
              <label className="toggle-option is-expense">
                <input type="radio" name="type" value="expense" defaultChecked />
                Utgift
              </label>
              <label className="toggle-option is-income">
                <input type="radio" name="type" value="income" />
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
                className="input"
                placeholder="0,00"
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="date">
                Dato
              </label>
              <input id="date" name="date" type="date" className="input" />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="category">
              Kategori
            </label>
            <select id="category" name="category" className="select" defaultValue="">
              <option value="" disabled>
                Velg kategori
              </option>
              {categories.map((category) => (
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
