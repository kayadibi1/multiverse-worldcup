import { useStore, leaderboard } from '../state/store'

export function Leaderboard() {
  const sim = useStore((s) => s.sim)
  const baseline = useStore((s) => s.baseline)
  const ratings = useStore((s) => s.ratings)
  const rows = leaderboard(sim, baseline).slice(0, 12)
  const name = (c: string) => ratings?.teams.find((t) => t.code === c)?.name ?? c
  const max = rows[0]?.pChamp || 1
  return (
    <div className="panel left" data-testid="leaderboard">
      <div className="h">Contenders · P(win cup)</div>
      {rows.map((r) => (
        <div className="row" key={r.code} data-testid={'lb-' + r.code} title={name(r.code)}>
          <span className="code">{r.code}</span>
          <span className="bar"><i style={{ width: (r.pChamp / max) * 100 + '%' }} /></span>
          <span className="pct">{(r.pChamp * 100).toFixed(1)}%</span>
          <span className={'tr ' + (r.trend > 0.002 ? 'up' : r.trend < -0.002 ? 'down' : '')}>
            {r.trend > 0.002 ? '▲' : r.trend < -0.002 ? '▼' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
