import type { Team, ModelParams, Modifier } from '../sim/types'

export interface Ratings {
  teams: Team[]
  modelParams: ModelParams
  format: Record<string, number>
  groups: Record<string, string[]>
  provenance: Record<string, unknown>
}
export interface Health {
  graniteProvider: string; model: string; kbFacts: number; embeddings: boolean
}
export interface Citation { id: string; text: string; source: string; label: string; teams: string[] }
export interface NarrateMeta {
  headline: string; voice: string
  causes: { text: string; citation: Citation }[]
  citations: Citation[]
}

export const getRatings = async (): Promise<Ratings> => (await fetch('/api/ratings')).json()
export const getHealth = async (): Promise<Health> => (await fetch('/api/health')).json()
export const getFeed = async (): Promise<{ items: { headline: string; blurb: string; citations: Citation[] }[] }> =>
  (await fetch('/api/feed')).json()

export async function intervene(text: string): Promise<{ modifiers: Modifier[]; explanation: string; source: string }> {
  const r = await fetch('/api/intervene', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
  })
  return r.json()
}

export async function anchor(actuals: unknown[]): Promise<{ modifiers: Modifier[] }> {
  const r = await fetch('/api/anchor', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actuals }),
  })
  return r.json()
}

// SSE narration: streams token deltas, then a single meta event.
export function narrate(
  payload: Record<string, unknown>,
  onToken: (d: string) => void, onMeta: (m: NarrateMeta) => void, onDone: () => void,
): () => void {
  const ctrl = new AbortController()
  fetch('/api/narrate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: ctrl.signal,
  })
    .then(async (res) => {
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() || ''
        for (const p of parts) {
          const ev = parseSSE(p)
          if (!ev) continue
          if (ev.event === 'token') onToken((ev.data as { delta: string }).delta)
          else if (ev.event === 'meta') onMeta(ev.data as NarrateMeta)
        }
      }
      onDone()
    })
    .catch(() => onDone())
  return () => ctrl.abort()
}

function parseSSE(block: string): { event: string; data: unknown } | null {
  let event = 'message'
  let data = ''
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  try { return { event, data: JSON.parse(data) } } catch { return null }
}
