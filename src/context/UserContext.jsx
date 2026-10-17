import { createContext, useContext, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Midlertidig "bruker" — kun navn og e-post, lagret i localStorage.
// Ingen passord eller ekte autentisering ennå. Når innlogging kobles på,
// er det denne filen som byttes ut (resten av appen bruker bare useUser()).
// ---------------------------------------------------------------------------
// { name: string, email: string } | null

const STORAGE_KEY = 'saldo.user'

function loadInitialUser() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const UserContext = createContext(undefined)

export function UserProvider({ children }) {
  const [user, setUser] = useState(loadInitialUser)

  useEffect(() => {
    try {
      if (user) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignorer — appen fungerer fortsatt, bare uten lagring mellom økter.
    }
  }, [user])

  function signIn({ name, email }) {
    setUser({ name: name.trim(), email: email.trim() })
  }

  function updateUser(updates) {
    setUser((previous) => ({ ...previous, ...updates }))
  }

  function signOut() {
    setUser(null)
  }

  const value = { user, signIn, updateUser, signOut }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUser() må brukes inni en <UserProvider>')
  }

  return context
}

// "Hamza Ali" -> "HA", "kari" -> "K"
export function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
