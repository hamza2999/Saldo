import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

const navItems = [
  { to: '/dashboard', label: 'Oversikt', icon: '⌂' },
  { to: '/add-transaction', label: 'Legg til transaksjon', icon: '+' },
  { to: '/transactions', label: 'Transaksjoner', icon: '≡' },
  { to: '/settings', label: 'Innstillinger', icon: '⚙' },
]

function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" />
          <span className="sidebar-brand-name">Saldo</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'sidebar-link' + (isActive ? ' is-active' : '')
              }
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* TODO: koble til faktisk utlogging */} v  
          <button type="button" className="sidebar-logout">
            Logg ut
          </button>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="topbar-spacer" />
          <div className="topbar-user">
            <span className="topbar-user-avatar" aria-hidden="true">
              HA
            </span>
            <span className="topbar-user-name">Hamza Ali</span>
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
