import { createContext, useContext, useEffect, useReducer } from 'react'

// ---------------------------------------------------------------------------
// 1. Form på dataene
// ---------------------------------------------------------------------------
// {
//   id: string,
//   type: 'income' | 'expense',
//   amount: number,        // alltid positivt tall — fortegn styres av "type"
//   category: string,
//   date: string,           // ISO-format, f.eks. '2026-09-19'
//   description: string,
// }

const STORAGE_KEY = 'saldo.transactions'

function loadInitialState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return { transactions: stored ? JSON.parse(stored) : [] }
  } catch {
    // localStorage kan feile (privat nettlesing, blokkerte cookies o.l.)
    // — appen skal fortsatt fungere, bare uten lagring mellom økter.
    return { transactions: [] }
  }
}

// ---------------------------------------------------------------------------
// 2. Reducer — samlet logikk for hvordan state endrer seg
// ---------------------------------------------------------------------------
function transactionsReducer(state, action) {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      }
    }

    case 'DELETE_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.filter(
          (transaction) => transaction.id !== action.payload.id,
        ),
      }
    }

    case 'EDIT_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.payload.id
            ? { ...transaction, ...action.payload.updates }
            : transaction,
        ),
      }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// 3. Context + Provider
// ---------------------------------------------------------------------------
const TransactionsContext = createContext(undefined)

export function TransactionsProvider({ children }) {
  const [state, dispatch] = useReducer(transactionsReducer, undefined, loadInitialState)

  // Skriver til localStorage hver gang transaksjonslisten endrer seg, slik
  // at data overlever en sideoppdatering. Dette er KUN lokal lagring i
  // nettleseren til denne ene brukeren — ingen ekte database eller
  // synkronisering mellom enheter før dette kobles til en backend.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions))
    } catch {
      // Ignorer — se kommentar i loadInitialState().
    }
  }, [state.transactions])

  function addTransaction(transaction) {
    const withId = {
      ...transaction,
      id: crypto.randomUUID(),
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: withId })
  }

  function deleteTransaction(id) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } })
  }

  function editTransaction(id, updates) {
    dispatch({ type: 'EDIT_TRANSACTION', payload: { id, updates } })
  }

  const value = {
    transactions: state.transactions,
    addTransaction,
    deleteTransaction,
    editTransaction,
  }

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// 4. Hook for å konsumere contexten
// ---------------------------------------------------------------------------
export function useTransactions() {
  const context = useContext(TransactionsContext)

  if (context === undefined) {
    throw new Error('useTransactions() må brukes inni en <TransactionsProvider>')
  }

  return context
}
