import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { narrate } from '../api/client'
import type { NarrateMeta } from '../api/client'

const VOICES = ['pundit', 'poet', 'tactician', 'kid']

export function StoryPanel() {
  const view = useStore((s) => s.view)
  const fixture = useStore((s) => s.fixture)
  const [body, setBody] = useState('')
  const [meta, setMeta] = useState<NarrateMeta | null>(null)
  const [voice, setVoice] = useState('pundit')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<(() => void) | undefined>(undefined)

  function run(v: string) {
    if (!fixture) return
    abortRef.current?.()
    setBody('')
    setMeta(null)
    setLoading(true)
    abortRef.current = narrate(
      { kind: 'fixture', teamA: fixture.a, teamB: fixture.b, round: fixture.round, scoreline: { a: fixture.ga, b: fixture.gb }, voice: v },
      (d) => setBody((b) => b + d),
      (m) => setMeta(m),
      () => setLoading(false),
    )
  }

  useEffect(() => {
    if (view === 'stadium' && fixture) { setVoice('pundit'); run('pundit') }
    return () => abortRef.current?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, fixture?.a, fixture?.b, fixture?.seed])

  if (view !== 'stadium' || !fixture) return null
  return (
    <div className="panel story" data-testid="story-panel">
      <div className="h">Granite story · this timeline</div>
      <div className="story-headline" data-testid="story-headline">{meta?.headline ?? '…'}</div>
      <div className="story-body" data-testid="story-body">{body}{loading && <span className="cursor">▍</span>}</div>
      {meta && meta.citations.length > 0 && (
        <div className="citations">
          {meta.citations.slice(0, 4).map((c) => (
            <span className="cite" key={c.id} data-testid="citation-chip" title={c.text + ' — ' + c.source}>
              📎 {c.label}
            </span>
          ))}
        </div>
      )}
      <div className="voices">
        {VOICES.map((v) => (
          <button key={v} className={v === voice ? 'on' : ''} onClick={() => { setVoice(v); run(v) }} data-testid={'voice-' + v}>{v}</button>
        ))}
        <button onClick={() => run(voice)} data-testid="regenerate" title="regenerate">↻</button>
      </div>
    </div>
  )
}
