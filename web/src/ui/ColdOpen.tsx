import { useEffect } from 'react'
import { useStore } from '../state/store'

// On-rails open: space → spin → converge on the host → dive down onto the city → into the
// stadium (the most-likely final). Skip jumps straight to the explorable globe hub.
export function ColdOpen() {
  const view = useStore((s) => s.view)
  const ratings = useStore((s) => s.ratings)
  const set = useStore((s) => s.set)

  useEffect(() => {
    if (view !== 'cold' || !ratings) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { set({ view: 'globe' }); return }
    const tmr = setTimeout(() => {
      const st = useStore.getState()
      const t = st.sim?.seedTimelines?.[0]
      if (t) {
        const [a, b] = t.finalists
        set({ view: 'stadium', fixture: { a, b, round: 'F', ga: a === t.champion ? 2 : 1, gb: b === t.champion ? 2 : 1, seed: t.seed } })
      } else {
        set({ view: 'globe' })
      }
    }, 9700)
    return () => clearTimeout(tmr)
  }, [view, ratings, set])

  if (view !== 'cold') return null
  return (
    <div className="coldopen" data-testid="coldopen">
      <div className="co-card">
        <div className="co-title">MULTIVERSE</div>
        <div className="co-sub">48 nations converging on the host — diving into the final.</div>
      </div>
      <button data-testid="skip-cold-open" onClick={() => set({ view: 'globe' })}>Skip intro ▸</button>
    </div>
  )
}
