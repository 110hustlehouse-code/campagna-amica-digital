/**
 * Contesto di autenticazione — versione Supabase.
 *
 * Sostituisce integralmente la versione Base44. Espone un oggetto `user`
 * che unisce l'identita' (auth.users) e il profilo applicativo (profiles),
 * cosi' le pagine esistenti continuano a leggere user.email, user.role,
 * user.full_name senza modifiche.
 *
 * Il ruolo arriva SEMPRE dal database. Il browser non lo decide e non lo
 * puo' falsificare: anche manomettendo questo oggetto in memoria, le
 * policy RLS valutano il ruolo lato server a ogni query.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  /** Legge sessione e profilo, e li unisce in un unico oggetto. */
  const caricaUtente = useCallback(async () => {
    try {
      setAuthError(null)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        return
      }

      const { data: profilo, error } = await supabase
        .from('users').select('*').eq('id', session.user.id).maybeSingle()

      if (error) {
        setAuthError({ type: 'profile_error', message: error.message })
        setUser(null)
        return
      }

      if (!profilo) {
        // L'utente esiste in auth ma non ha un profilo: succede solo se
        // il trigger di creazione non e' installato.
        setAuthError({
          type: 'user_not_registered',
          message: 'Profilo non trovato per questo account',
        })
        setUser(null)
        return
      }

      setUser({
        id: session.user.id,
        email: profilo.email,
        full_name: profilo.full_name,
        avatar_url: profilo.avatar_url,
        phone: profilo.phone,
        role: profilo.role,
        role_confirmed: profilo.role_confirmed,
        created_at: profilo.created_at,
      })
    } catch (e) {
      setAuthError({ type: 'unknown', message: e?.message ?? 'Errore imprevisto' })
      setUser(null)
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  useEffect(() => {
    caricaUtente()
    // Login, logout e rinnovo del token aggiornano il contesto da soli.
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setUser(null)
        setIsLoadingAuth(false)
      } else {
        caricaUtente()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [caricaUtente])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const navigateToLogin = useCallback(() => {
    window.location.href = '/accedi'
  }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    isLoadingPublicSettings: false,  // non esiste in Supabase: sempre pronto
    authError,
    logout,
    navigateToLogin,
    refreshUser: caricaUtente,
    checkAppState: caricaUtente,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro AuthProvider')
  return ctx
}
