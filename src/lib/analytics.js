const LOGIN_FLAG_KEY = 'saju-me:ga-logged-in'

function gtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

export function trackPageView(path, title) {
  const pagePath = path || (typeof window !== 'undefined' ? window.location.pathname : '/')
  gtag('event', 'page_view', {
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
    page_location:
      typeof window !== 'undefined' ? `${window.location.origin}${pagePath}${window.location.search}` : pagePath,
    page_path: pagePath,
  })
}

export function trackEvent(name, params = {}) {
  gtag('event', name, params)
}

export function setUserType(isGuest) {
  gtag('set', 'user_properties', {
    user_type: isGuest ? 'guest' : 'member',
  })
}

export function trackLoginSuccess() {
  try {
    if (sessionStorage.getItem(LOGIN_FLAG_KEY) === '1') return
    sessionStorage.setItem(LOGIN_FLAG_KEY, '1')
  } catch {
    // private mode 등에서 sessionStorage가 막혀도 이벤트는 보냄
  }
  trackEvent('login', { method: 'google' })
}

export function trackLogoutSuccess() {
  try {
    sessionStorage.removeItem(LOGIN_FLAG_KEY)
  } catch {
    // ignore
  }
  trackEvent('logout')
}
