import { useEffect, useRef, useState } from 'react'
import {
  setUserType,
  trackLoginFail,
  trackLoginSuccess,
  trackLogoutClick,
  trackLogoutSuccess,
} from '../lib/analytics'
import { supabase } from '../lib/supabase'

function readOAuthErrorFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  return (
    hashParams.get('error_description') ||
    hashParams.get('error') ||
    queryParams.get('error_description') ||
    queryParams.get('error') ||
    ''
  )
}

function clearOAuthParamsFromUrl() {
  const url = new URL(window.location.href)
  const hadQuery =
    url.searchParams.has('code') ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description') ||
    url.searchParams.has('state')
  const hadHash = Boolean(url.hash)

  if (!hadQuery && !hadHash) return

  url.search = ''
  url.hash = ''
  window.history.replaceState({}, document.title, url.pathname + url.search)
}

/**
 * Supabase 세션을 구독하고 Google 로그인/로그아웃 헬퍼를 제공합니다.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const hadSessionRef = useRef(false)

  useEffect(() => {
    let mounted = true
    const oauthError = readOAuthErrorFromUrl()
    if (oauthError) {
      setAuthError(decodeURIComponent(oauthError.replace(/\+/g, ' ')))
      trackLoginFail('oauth_redirect')
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        console.error(error)
        setAuthError(error.message)
      }
      const nextSession = data.session ?? null
      hadSessionRef.current = Boolean(nextSession)
      setSession(nextSession)
      setUserType(!nextSession)
      setAuthLoading(false)
      clearOAuthParamsFromUrl()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      setUserType(!nextSession)

      if (event === 'INITIAL_SESSION') {
        hadSessionRef.current = Boolean(nextSession)
        return
      }

      if (event === 'SIGNED_IN' && nextSession) {
        const wasGuest = !hadSessionRef.current
        hadSessionRef.current = true
        if (wasGuest) trackLoginSuccess()
        setAuthError('')
        clearOAuthParamsFromUrl()
        return
      }

      if (event === 'SIGNED_OUT') {
        if (hadSessionRef.current) trackLogoutSuccess()
        hadSessionRef.current = false
      }

      if (nextSession) {
        setAuthError('')
        clearOAuthParamsFromUrl()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    setAuthError('')
    setAuthBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    if (error) {
      console.error(error)
      setAuthError(error.message || 'Google 로그인에 실패했습니다.')
      trackLoginFail('oauth_start')
      setAuthBusy(false)
    }
  }

  async function signOut() {
    trackLogoutClick()
    setAuthError('')
    setAuthBusy(true)
    const { error } = await supabase.auth.signOut()
    setAuthBusy(false)
    if (error) {
      console.error(error)
      setAuthError(error.message || '로그아웃에 실패했습니다.')
      return
    }
    setSession(null)
  }

  return {
    session,
    user: session?.user ?? null,
    authLoading,
    authBusy,
    authError,
    signInWithGoogle,
    signOut,
  }
}
