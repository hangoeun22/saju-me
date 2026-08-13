import { useEffect, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ message: '', leaving: false })
  const showTimerRef = useRef(null)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  function showToast(message) {
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)

    setToast({ message, leaving: false })

    showTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev.message ? { ...prev, leaving: true } : prev))
      hideTimerRef.current = setTimeout(() => {
        setToast({ message: '', leaving: false })
      }, 320)
    }, 2200)
  }

  return { toast, showToast }
}
