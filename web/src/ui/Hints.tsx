import { useEffect, useState } from 'react'
import { useStore } from '../state/store'

// Self-explanatory affordances: a controls legend, a one-time coachmark pointing at the
// futures rail, and Esc-to-go-back.
export function Hints() {
  const view = useStore((s) => s.view)
  const set = useStore((s) => s.set)
  const [coach, setCoach] = useState(true)

  useEffect(() => { if (view === 'stadium') setCoach(false) }, [view])
  useEffect(() => { const t = setTimeout(() => setCoach(false), 13000); return () => clearTimeout(t) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useStore.getState().view === 'stadium') set({ view: 'globe', fixture: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  if (view === 'stadium') return null
  return (
    <>
      <div className="controls-legend" data-testid="controls-legend">🖱 drag to spin · scroll to zoom · double-click to dive</div>
      {coach && view === 'globe' && (
        <div className="coachmark" data-testid="coachmark">👇 click a final below to dive into the match</div>
      )}
    </>
  )
}
