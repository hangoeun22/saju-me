import { useEffect, useRef, useState } from 'react'

export function useTimedFlag(duration = 1800) {
  const [active, setActive] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function pulse() {
    setActive(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setActive(false), duration)
  }

  function reset() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setActive(false)
  }

  return [active, pulse, reset]
}
