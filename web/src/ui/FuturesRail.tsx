import { useStore, firstTimelines } from '../state/store'

// The counterfactual-at-rest signal: 3 deliberately divergent futures, so the home
// screen reads as a SPACE of outcomes, not a single prediction.
export function FuturesRail() {
  const sim = useStore((s) => s.sim)
  const ratings = useStore((s) => s.ratings)
  const setStore = useStore((s) => s.set)
  const tls = firstTimelines(sim)
  const name = (c: string) => ratings?.teams.find((t) => t.code === c)?.name ?? c
  if (!tls.length) return null

  const openFixture = (champion: string, finalists: [string, string], seed: number) => {
    const a = finalists[0], b = finalists[1]
    // open the final of this timeline in the stadium
    setStore({ view: 'stadium', fixture: { a, b, round: 'F', ga: a === champion ? 2 : 1, gb: b === champion ? 2 : 1, seed } })
  }

  return (
    <div className="panel rail" data-testid="futures-rail">
      <div className="h">{(sim?.N ?? 0).toLocaleString()} timelines simulated — 3 wildly different ones</div>
      <div className="rail-row">
        {tls.map((t, i) => (
          <button className="future" key={i} data-testid={'future-' + t.champion}
            onClick={() => openFixture(t.champion, t.finalists, t.seed)}>
            <div className="champ">🏆 {name(t.champion)}</div>
            <div className="path">{name(t.finalists[0])} v {name(t.finalists[1])}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
