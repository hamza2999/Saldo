import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/meg');
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser({ kundeId: data.kunde_id });
      } catch {
        setUser(null);
      }
    }

    fetchUser();
  }, []);

  async function signIn(kundeId, epost) {
    setUser({ kundeId, epost });
  }

  async function signOut() {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  }

  const value = { user, signIn, signOut };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUser() må brukes inni en <UserProvider>');
  }

  return context;
}