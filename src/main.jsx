import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ResultPage from './ResultPage.jsx'
import './index.css'

function Root() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const resultMatch = path.match(/^\/result\/([^/]+)\/?$/)
  if (resultMatch) {
    return <ResultPage readingId={decodeURIComponent(resultMatch[1])} />
  }

  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
