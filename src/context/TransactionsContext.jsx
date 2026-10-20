import { createContext, useContext, useEffect, useReducer } from 'react';
import { useUser } from './UserContext.jsx';

const TransactionsContext = createContext(undefined);

export function TransactionsProvider({ children }) {
  const [transactions, dispatch] = useReducer(transactionsReducer, []);

  const { user } = useUser();

  // Hent på nytt hver gang brukeren endrer seg (innlogging/utlogging).
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      return;
    }

    async function fetchTransactions() {
      try {
        const res = await fetch('/api/transaksjoner');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          dispatch({ type: 'SET_TRANSACTIONS', payload: data.map(fromApi) });
        }
      } catch {
        // Nettverksfeil: behold det vi har.
      }
    }

    fetchTransactions();
  }, [user?.kundeId]);

  async function addTransaction(transaction) {
    const res = await fetch('/api/transaksjoner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toApi(transaction)),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Serverfeil (${res.status})`);
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...transaction, id: data.transaksjon_id } });
  }

  async function deleteTransaction(id) {
    const res = await fetch(`/api/transaksjoner/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Kunne ikke slette (${res.status})`);
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } });
  }

  async function editTransaction(id, updates) {
    const current = transactions.find((t) => t.id === id);
    const res = await fetch(`/api/transaksjoner/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toApi({ ...current, ...updates })),
    });
    if (!res.ok) throw new Error(`Kunne ikke lagre (${res.status})`);
    dispatch({ type: 'EDIT_TRANSACTION', payload: { id, updates } });
  }

  async function clearTransactions() {
    const res = await fetch('/api/transaksjoner', { method: 'DELETE' });
    if (!res.ok) throw new Error(`Kunne ikke slette (${res.status})`);
    dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
  }

  const value = {
    transactions,
    addTransaction,
    deleteTransaction,
    editTransaction,
    clearTransactions,
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);

  if (context === undefined) {
    throw new Error('useTransactions() må brukes inni en <TransactionsProvider>');
  }

  return context;
}

// Databasen bruker norske felt ('inntekt'/'utgift', belop, kategori_navn ...),
// resten av appen bruker { id, type: 'income'/'expense', amount, category ... }.
function fromApi(row) {
  return {
    id: row.transaksjon_id,
    type: row.type === 'inntekt' ? 'income' : 'expense',
    amount: Number(row.belop),
    category: row.kategori_navn,
    date: row.dato,
    description: row.beskrivelse ?? '',
  };
}

function toApi(tx) {
  return {
    type: tx.type === 'income' ? 'inntekt' : 'utgift',
    belop: tx.amount,
    kategori_navn: tx.category,
    dato: tx.date,
    beskrivelse: tx.description || null,
  };
}

function transactionsReducer(state, action) {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return action.payload;
    case 'ADD_TRANSACTION':
      return [...state, action.payload];
    case 'DELETE_TRANSACTION':
      return state.filter((t) => t.id !== action.payload.id);
    case 'EDIT_TRANSACTION':
      return state.map((t) =>
        t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
      );
    default:
      return state;
  }
}