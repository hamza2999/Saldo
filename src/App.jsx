import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Login from './pages/Login/Login.jsx'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import AddTransaction from './pages/AddTransaction/AddTransaction.jsx'
import TransactionHistory from './pages/TransactionHistory/TransactionHistory.jsx'
import Settings from './pages/Settings/Settings.jsx'
import Privacy from './pages/Privacy/Privacy.jsx'
import Register from './pages/register'

function App() {
  return (
    <Routes>
      {/* Auth — no sidebar */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Offentlig — må kunne leses før man registrerer seg */}
      <Route path="/personvern" element={<Privacy />} />

      {/* App shell — sidebar + topbar */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-transaction" element={<AddTransaction />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}


export default App
