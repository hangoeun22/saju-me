const GA_MEASUREMENT_ID = 'G-C9RKKYC8T7'
const LOGIN_LOCATION_KEY = 'saju-me:login-location'

function isBrowser() {
  return typeof window !== 'undefined'
}

function isLocalhost() {
  if (!isBrowser()) return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function gtag(...args) {
  if (!isBrowser() || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

function compact(params = {}) {
  const out = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

export function normalizePath(path) {
  const raw = path || (isBrowser() ? window.location.pathname : '/')
  if (/^\/result\/[^/]+/i.test(raw)) return '/result/:id'
  if (raw.length > 1 && raw.endsWith('/')) return raw.replace(/\/+$/, '')
  return raw || '/'
}

function pageNameFromPath(pagePath) {
  if (pagePath === '/result/:id') return 'shared_result'
  return 'home'
}

let configured = false

function ensureConfig() {
  if (configured || !isBrowser()) return
  configured = true
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
    debug_mode: isLocalhost(),
  })
  gtag('set', { app_name: 'saju-me' })
}

ensureConfig()

export function trackEvent(name, params = {}) {
  ensureConfig()
  gtag('event', name, compact(params))
}

export function trackPageView(path, extra = {}) {
  const pagePath = normalizePath(path)
  const pageName = extra.page_name || pageNameFromPath(pagePath)
  trackEvent('page_view', {
    page_title: extra.page_title || (isBrowser() ? document.title : ''),
    page_location: isBrowser() ? `${window.location.origin}${pagePath}` : pagePath,
    page_path: pagePath,
    page_name: pageName,
  })
}

export function setUserType(isGuest) {
  ensureConfig()
  gtag('set', 'user_properties', {
    user_type: isGuest ? 'guest' : 'member',
  })
}

export function setUserProperties(props) {
  ensureConfig()
  gtag('set', 'user_properties', compact(props))
}

export function rememberLoginLocation(location) {
  try {
    sessionStorage.setItem(LOGIN_LOCATION_KEY, location || 'unknown')
  } catch {
    // private mode
  }
}

export function trackLoginClick(location = 'unknown') {
  rememberLoginLocation(location)
  trackEvent('login_click', { method: 'google', login_location: location })
}

export function trackLoginSuccess() {
  let loginLocation = 'unknown'
  try {
    loginLocation = sessionStorage.getItem(LOGIN_LOCATION_KEY) || 'unknown'
    sessionStorage.removeItem(LOGIN_LOCATION_KEY)
  } catch {
    // private mode
  }
  trackEvent('login', { method: 'google', login_location: loginLocation })
}

export function trackLoginFail(reason = 'unknown', location) {
  trackEvent('login_fail', compact({ method: 'google', reason, login_location: location }))
}

export function trackLogoutClick() {
  trackEvent('logout_click')
}

export function trackLogoutSuccess() {
  try {
    sessionStorage.removeItem(LOGIN_LOCATION_KEY)
  } catch {
    // ignore
  }
  trackEvent('logout')
}

export function trackException(description, fatal = false) {
  trackEvent('exception', { description, fatal })
}

export function classifyAnalyzeError(err) {
  const message = String(err?.message || '')
  if (message.includes('VITE_GEMINI_API_KEY')) return 'missing_api_key'
  if (message.includes('비어')) return 'empty_response'
  if (message.includes('network') || message.includes('Failed to fetch')) return 'network'
  return 'unknown'
}
