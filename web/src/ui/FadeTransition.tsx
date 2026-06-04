import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'

// On any view change, snap to black instantly (masking the globe<->stadium scene swap),
// then fade back out — so the dive reads as "punch in, arrive at the pitch".
export function FadeTransition() {
  const view = useStore((s) => s.view)
  const prev = useRef(view)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (prev.current === view) return
    prev.current = view
    setFlash(true)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFlash(false)))
    return () => cancelAnimationFrame(id)
  }, [view])
  return <div className={'fade' + (flash ? ' flash' : '')} aria-hidden />
}
