import { useStore } from '../state/store'

export function StadiumHud() {
  const view = useStore((s) => s.view)
  const fixture = useStore((s) => s.fixture)
  const ratings = useStore((s) => s.ratings)
  const set = useStore((s) => s.set)
  if (view !== 'stadium' || !fixture) return null
  const name = (c: string) => ratings?.teams.find((t) => t.code === c)?.name ?? c
  return (
    <div className="stadium-hud" data-testid="stadium-hud">
      <button className="back" onClick={() => set({ view: 'globe', fixture: null })} data-testid="back-globe">
        ⤺ Back to globe
      </button>
      <div className="matchup">
        <b style={{ color: '#4db5ff' }}>{name(fixture.a)}</b>
        <span> {fixture.ga}–{fixture.gb} </span>
        <b style={{ color: '#ffd27a' }}>{name(fixture.b)}</b>
      </div>
    </div>
  )
}
