import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  // true til vi vet om sesjonen fra serveren fortsatt er gyldig.
  // Uten denne sender Layout brukeren til innlogging ved hver refresh.
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const res = await fetch('/api/meg');
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser({
        kundeId: data.kunde_id,
        epost: data.epost,
        opprettet: data.opprettet,
        samtykkeTid: data.vilkaar_akseptert_tid,
        samtykkeVersjon: data.vilkaar_versjon,
        tofaAktivertTid: data.tofa_aktivert_tid,
        reservekoderIgjen: Number(data.reservekoder_igjen ?? 0),
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  // Henter hele profilen (inkl. samtykke) etter innlogging/registrering.
  async function signIn() {
    await fetchUser();
  }

  async function signOut() {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  }

  async function changeEmail(epost, passord) {
    await request('/api/meg/epost', 'PUT', { epost, passord });
    setUser((previous) => ({ ...previous, epost }));
  }

  async function changePassword(passord, nyttPassord) {
    await request('/api/meg/passord', 'PUT', { passord, nyttPassord });
  }

  async function deleteAccount(passord) {
    await request('/api/meg', 'DELETE', { passord });
    setUser(null);
  }

  /* ---------- Tofaktor ---------- */

  // Steg 1: henter QR-kode og nøkkel. Ingenting er slått på ennå.
  async function startTwoFactorSetup() {
    return request('/api/meg/2fa/oppsett', 'POST', {});
  }

  // Steg 2: slår på tofaktor og returnerer reservekodene (vises bare én gang).
  async function enableTwoFactor(passord, kode) {
    const data = await request('/api/meg/2fa/aktiver', 'POST', { passord, kode });
    await fetchUser();
    return data.reservekoder;
  }

  async function disableTwoFactor(passord, kode) {
    await request('/api/meg/2fa/deaktiver', 'POST', { passord, kode });
    await fetchUser();
  }

  async function newBackupCodes(passord, kode) {
    const data = await request('/api/meg/2fa/reservekoder', 'POST', { passord, kode });
    await fetchUser();
    return data.reservekoder;
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    changeEmail,
    changePassword,
    deleteAccount,
    startTwoFactorSetup,
    enableTwoFactor,
    disableTwoFactor,
    newBackupCodes,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUser() må brukes inni en <UserProvider>');
  }

  return context;
}

async function request(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Serverfeil (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}
