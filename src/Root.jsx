import { useEffect, useState } from 'react'
import App from './App.jsx'
import { trackPageView } from './lib/analytics'
import ResultPage from './pages/ResultPage.jsx'

export default function Root() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    trackPageView(path)
  }, [path])

  const resultMatch = path.match(/^\/result\/([^/]+)\/?$/)
  if (resultMatch) {
    return <ResultPage readingId={decodeURIComponent(resultMatch[1])} />
  }

  return <App />
}
