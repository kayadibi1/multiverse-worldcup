import { useEffect } from 'react'
import { useStore } from '../state/store'

// Lightweight on-rails open: start far out in space, then ease into the globe.
// Backdrop is pointer-events:none so it never blocks the UI; skippable; reduced-motion = instant.
export function ColdOpen() {
  const view = useStore((s) => s.view)
  const ratings = useStore((s) => s.ratings)
  const set = useStore((s) => s.set)

  useEffect(() => {
    if (view !== 'cold' || !ratings) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { set({ view: 'globe' }); return }
    const t = setTimeout(() => set({ view: 'globe' }), 3200)
    return () => clearTimeout(t)
  }, [view, ratings, set])

  if (view !== 'cold') return null
  return (
    <div className="coldopen" data-testid="coldopen">
      <div className="co-title">MULTIVERSE</div>
      <div className="co-sub">Every future of the 2026 World Cup — simulated.</div>
      <button data-testid="skip-cold-open" onClick={() => set({ view: 'globe' })}>Enter ▸</button>
    </div>
  )
}
