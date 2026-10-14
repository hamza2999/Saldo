import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { TransactionsProvider } from './context/TransactionsContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <TransactionsProvider>
          <App />
        </TransactionsProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
)
