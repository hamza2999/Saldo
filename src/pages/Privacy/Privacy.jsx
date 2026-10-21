import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'
import Footer from '../../components/Footer.jsx'
import {
  BACKUP_INTERVAL,
  BACKUP_RETENTION,
  CONTROLLER,
  DATA_LOCATION,
  DPO,
  POLICY_UPDATED,
  POLICY_VERSION,
} from '../../constants/privacy.js'
import { formatDateDisplay } from '../../utils/format.js'
import './Privacy.css'

const STORED_DATA = [
  {
    what: 'E-postadresse',
    why: 'Innlogging og identifisering av kontoen din',
    how: 'Til du sletter kontoen',
  },
  {
    what: 'Passord',
    why: 'Innlogging. Lagres kun som en enveis-kryptert hash (bcrypt) — vi kan ikke se passordet ditt',
    how: 'Til du sletter kontoen',
  },
  {
    what: 'Tofaktor, kun hvis du slår det på (kryptert nøkkel til autentiseringsappen, tidspunkt for aktivering og reservekoder lagret som hash)',
    why: 'Ekstra beskyttelse av innloggingen',
    how: 'Til du slår av tofaktor eller sletter kontoen',
  },
  {
    what: 'Transaksjoner (type, beløp, dato, kategori og valgfri beskrivelse)',
    why: 'Selve tjenesten: oversikt over inntekter og utgifter',
    how: 'Til du sletter dem eller kontoen',
  },
  {
    what: 'Samtykke (tidspunkt og versjon av erklæringen)',
    why: 'Dokumentere at du har samtykket (GDPR art. 7 nr. 1)',
    how: 'Til du sletter kontoen',
  },
  {
    what: 'Tidspunkt kontoen ble opprettet',
    why: 'Drift og feilsøking',
    how: 'Til du sletter kontoen',
  },
  {
    what: 'Innloggingscookie (saldo.sid)',
    why: 'Holde deg innlogget mellom sidevisninger',
    how: 'Til du logger ut, eller etter 7 dager uten aktivitet',
  },
]

const RIGHTS = [
  {
    title: 'Rett til innsyn',
    article: 'art. 15',
    text: 'Du kan få vite hvilke opplysninger vi har om deg og få en kopi av dem.',
    how: 'Innstillinger → «Last ned mine data».',
  },
  {
    title: 'Rett til retting',
    article: 'art. 16',
    text: 'Du kan rette feil eller ufullstendige opplysninger.',
    how: 'Endre e-post i Innstillinger, og rediger eller slett transaksjoner selv.',
  },
  {
    title: 'Rett til sletting («retten til å bli glemt»)',
    article: 'art. 17',
    text: `Du kan når som helst slette kontoen din. Da slettes e-post, passord, samtykke og alle transaksjoner permanent fra databasen, og du logges ut på alle enheter. Kopier i eldre sikkerhetskopier slettes automatisk senest ${BACKUP_RETENTION} etter at kopien ble tatt.`,
    how: 'Innstillinger → «Slett konto».',
  },
  {
    title: 'Rett til begrenset behandling',
    article: 'art. 18',
    text: 'Du kan be oss om å midlertidig stanse behandlingen, for eksempel mens en innsigelse vurderes.',
    how: 'Kontakt oss eller personvernombudet.',
  },
  {
    title: 'Rett til dataportabilitet',
    article: 'art. 20',
    text: 'Du kan få dataene dine i et maskinlesbart format (JSON) og ta dem med til en annen tjeneste.',
    how: 'Innstillinger → «Last ned mine data».',
  },
  {
    title: 'Rett til å protestere',
    article: 'art. 21',
    text: 'Du kan protestere mot behandlingen av opplysningene dine.',
    how: 'Kontakt oss eller personvernombudet.',
  },
  {
    title: 'Rett til å trekke tilbake samtykke',
    article: 'art. 7 nr. 3',
    text: 'Du kan trekke samtykket tilbake like enkelt som du ga det. Siden tjenesten ikke kan fungere uten disse opplysningene, gjør du dette ved å slette kontoen.',
    how: 'Innstillinger → «Slett konto».',
  },
  {
    title: 'Rett til å klage',
    article: 'art. 77',
    text: 'Mener du at vi behandler opplysningene dine i strid med regelverket, kan du klage til Datatilsynet.',
    how: (
      <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer">
        datatilsynet.no
      </a>
    ),
  },
]

function Privacy() {
  const { user } = useUser()

  return (
    <div className="privacy-shell">
      <header className="privacy-header">
        <Link to={user ? '/dashboard' : '/'} className="privacy-brand">
          <span className="auth-brand-mark" />
          <span className="auth-brand-name">Saldo</span>
        </Link>
        <Link to={user ? '/dashboard' : '/'} className="btn btn-secondary">
          ← Tilbake
        </Link>
      </header>

      <main className="privacy-doc">
        <h1 className="page-title">Personvernerklæring</h1>
        <p className="page-subtitle">
          Versjon {POLICY_VERSION} · Sist oppdatert {formatDateDisplay(POLICY_UPDATED)}
        </p>

        <div className="privacy-callout">
          <strong>Vi selger aldri dataene dine.</strong> Vi leier dem ikke ut, deler dem ikke med
          annonsører og bruker dem ikke til markedsføring. Vi lagrer bare det som trengs for at
          Saldo skal fungere.
        </div>

        <section>
          <h2 className="section-title">1. Hvem er ansvarlig</h2>
          <p>
            Behandlingsansvarlig for personopplysningene i Saldo er {CONTROLLER.name},{' '}
            {CONTROLLER.address}. Spørsmål om personvern kan sendes til{' '}
            <a href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>.
          </p>
        </section>

        <section>
          <h2 className="section-title">2. Personvernombud (DPO)</h2>
          <p>
            Vårt personvernombud (Data Protection Officer) er {DPO.name}. Du kan kontakte
            personvernombudet direkte om alt som gjelder behandlingen av opplysningene dine og
            rettighetene dine på <a href={`mailto:${DPO.email}`}>{DPO.email}</a>.
            Personvernombudet har taushetsplikt.
          </p>
        </section>

        <section>
          <h2 className="section-title">3. Hvilke opplysninger vi lagrer</h2>
          <p>
            Vi følger prinsippet om dataminimering (GDPR art. 5). Dette er alt vi lagrer om deg:
          </p>
          <div className="privacy-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Opplysning</th>
                  <th>Hvorfor</th>
                  <th>Hvor lenge</th>
                </tr>
              </thead>
              <tbody>
                {STORED_DATA.map((row) => (
                  <tr key={row.what}>
                    <td>{row.what}</td>
                    <td>{row.why}</td>
                    <td>{row.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Vi samler <strong>ikke</strong> inn navn, adresse, telefonnummer, fødselsnummer,
            bankkontonummer eller lokasjon. Vi bruker ingen analyseverktøy, sporingscookies eller
            tredjeparts annonsering. Unngå å skrive personopplysninger om andre i
            beskrivelsesfeltet på transaksjoner.
          </p>
        </section>

        <section>
          <h2 className="section-title">4. Rettslig grunnlag</h2>
          <p>
            Vi behandler opplysningene for å levere tjenesten du har bedt om (GDPR art. 6 nr. 1
            bokstav b) og på grunnlag av samtykket du gir når du oppretter kontoen (art. 6 nr. 1
            bokstav a). Vi lagrer tidspunktet og versjonen av samtykket for å kunne dokumentere
            det.
          </p>
        </section>

        <section>
          <h2 className="section-title">5. Deling av opplysninger</h2>
          <p>
            Vi selger, leier eller gir aldri bort opplysningene dine. De deles bare med
            leverandøren som drifter serveren og databasen vår (databehandler), som kun kan
            behandle dem på våre vegne etter en databehandleravtale, og ellers bare dersom vi er
            pålagt det ved lov. Dataene lagres i {DATA_LOCATION}.
          </p>
        </section>

        <section>
          <h2 className="section-title">6. Sikkerhet</h2>
          <p>
            Passord lagres kun som kryptert hash. Innloggingscookien er utilgjengelig for
            JavaScript (httpOnly) og sendes kun over HTTPS i produksjon. Hver bruker har bare
            tilgang til sine egne data. Ved bytte av passord logges alle andre enheter ut. Du kan
            slå på tofaktorautentisering i Innstillinger, slik at innlogging også krever en kode
            fra en app på telefonen din.
          </p>
        </section>

        <section>
          <h2 className="section-title">7. Sikkerhetskopier (backup)</h2>
          <p>
            For at dataene dine ikke skal gå tapt ved feil, tar vi sikkerhetskopi av databasen
            hver {BACKUP_INTERVAL}. Hver sikkerhetskopi testes ved at vi gjenoppretter den, slik
            at vi vet at den faktisk virker. Sikkerhetskopiene inneholder de samme opplysningene
            som er beskrevet i punkt 3, lagres i {DATA_LOCATION} og er beskyttet på samme måte som
            databasen.
          </p>
          <p>
            Sikkerhetskopier slettes automatisk {BACKUP_RETENTION} etter at de ble tatt. Sletter du
            kontoen eller transaksjoner, forsvinner de umiddelbart fra databasen, men kan ligge i
            eldre sikkerhetskopier til disse slettes, altså i inntil {BACKUP_RETENTION}. Vi
            bruker aldri sikkerhetskopier til noe annet enn å gjenopprette tjenesten etter feil.
            Må vi gjenopprette fra en sikkerhetskopi, sletter vi data du allerede har slettet på
            nytt.
          </p>
        </section>

        <section>
          <h2 className="section-title">8. Informasjonskapsler (cookies)</h2>
          <p>
            Saldo bruker kun én nødvendig cookie, <code>saldo.sid</code>, som holder deg innlogget.
            Den inneholder ingen personopplysninger, bare en tilfeldig sesjons-ID. Vi bruker ingen
            cookies til sporing eller markedsføring.
          </p>
        </section>

        <section>
          <h2 className="section-title">9. Dine rettigheter</h2>
          <p>
            Etter personvernforordningen (GDPR) har du følgende rettigheter. De fleste kan du
            bruke selv, direkte i appen. Ellers svarer vi på henvendelser uten ugrunnet opphold og
            senest innen én måned (art. 12 nr. 3). Det koster ingenting.
          </p>
          <ul className="privacy-rights">
            {RIGHTS.map((right) => (
              <li key={right.title}>
                <h3>
                  {right.title} <span className="privacy-article">{right.article}</span>
                </h3>
                <p>{right.text}</p>
                <p className="privacy-how">Slik gjør du det: {right.how}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="section-title">10. Endringer</h2>
          <p>
            Hvis vi endrer erklæringen vesentlig, får den et nytt versjonsnummer, og vi ber deg om
            å godta den på nytt før du fortsetter å bruke Saldo.
          </p>
        </section>

        <section>
          <h2 className="section-title">11. Kontakt</h2>
          <p>
            Behandlingsansvarlig: <a href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>
            <br />
            Personvernombud: <a href={`mailto:${DPO.email}`}>{DPO.email}</a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Privacy
