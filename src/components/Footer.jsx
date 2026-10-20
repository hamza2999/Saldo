import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Saldo</span>
      <span aria-hidden="true">·</span>
      <Link to="/personvern">Personvernerklæring</Link>
      <span aria-hidden="true">·</span>
      <span>Vi selger aldri dataene dine</span>
    </footer>
  )
}

export default Footer
