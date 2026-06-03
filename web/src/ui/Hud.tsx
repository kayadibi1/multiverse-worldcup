import { useStore } from '../state/store'

const ROUNDS = ['Groups', 'R32', 'R16', 'QF', 'SF', 'Final']

export function Hud() {
  const health = useStore((s) => s.health)
  const simN = useStore((s) => s.simN)
  const simMs = useStore((s) => s.simMs)
  const busy = useStore((s) => s.busy)
  return (
    <div className="hud">
      <div className="brand">MULTIVERSE<span> · A World Cup 2026 Oracle</span></div>
      <div className="scrubber">
        {ROUNDS.map((r, i) => (<span key={r} className={i === 1 ? 'on' : ''}>{r}</span>))}
      </div>
      <div className="hud-right">
        <span className="sims" data-testid="sims-counter">
          ◷ {simN.toLocaleString()} sims · {simMs.toFixed(0)}ms{busy ? ' …' : ''}
        </span>
        {health && (
          <span className={'prov ' + health.graniteProvider} data-testid="provider">
            {health.graniteProvider === 'ollama' ? '● Granite live' : health.graniteProvider}
          </span>
        )}
      </div>
    </div>
  )
}
