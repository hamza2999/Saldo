import { createContext, useContext, useEffect, useReducer } from 'react';

const TransactionsContext = createContext(undefined);

export function TransactionsProvider({ children }) {
  const [transactions, dispatch] = useReducer(transactionsReducer, []);

  useEffect(() => {
    async function fetchTransactions() {
      const res = await fetch('/api/transaksjoner');
      const data = await res.json();
      dispatch({ type: 'SET_TRANSACTIONS', payload: data });
    }

    fetchTransactions();
  }, []);

  async function addTransaction(transaction) {
    const res = await fetch('/api/transaksjoner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    const data = await res.json();
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...transaction, id: data.id } });
  }

  async function deleteTransaction(id) {
    await fetch(`/api/transaksjoner/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } });
  }

  async function editTransaction(id, updates) {
    await fetch(`/api/transaksjoner/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    dispatch({ type: 'EDIT_TRANSACTION', payload: { id, updates } });
  }

  const value = {
    transactions,
    addTransaction,
    deleteTransaction,
    editTransaction,
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