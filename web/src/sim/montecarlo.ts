import type { SimRequest, SimResult, PerTeam, Round, Timeline } from './types'
import { ROUNDS } from './types'
import { mulberry32, hash2 } from './prng'
import { teamStrengthDeltas, effStrength } from './match'
import { simulateOne } from './tournament'
import type { Prepared } from './tournament'

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function prepare(req: SimRequest): Prepared {
  const p = req.modelParams
  const deltas = teamStrengthDeltas(req.modifiers)
  const s = new Map<string, number>()
  const host = new Map<string, boolean>()
  const gByCode = new Map<string, string>()
  for (const g of Object.keys(req.groups)) for (const c of req.groups[g]) gByCode.set(c, g)
  for (const t of req.strengthTable) {
    s.set(t.code, effStrength(t.code, t.elo, p, deltas))
    host.set(t.code, !!t.isHost)
  }
  let homeAdv = p.homeAdv
  let groupVar = 1
  const koVar = new Map<Round, number>()
  const pinned = new Map<string, { first: string; ga: number; gb: number }>()
  for (const m of req.modifiers) {
    if (m.scope === 'global' && m.field === 'homeAdv' && m.op === 'add' && typeof m.value === 'number') {
      homeAdv += m.value
    } else if (m.scope === 'round' && m.field === 'variance' && m.op === 'mul' && typeof m.value === 'number') {
      if (m.target === '*' || m.target === 'KO') for (const r of ROUNDS) koVar.set(r, (koVar.get(r) ?? 1) * m.value)
      else if (m.target === 'G') groupVar *= m.value
      else koVar.set(m.target as Round, (koVar.get(m.target as Round) ?? 1) * m.value)
    } else if (m.scope === 'match' && m.field === 'result' && m.op === 'set' && typeof m.value === 'object') {
      const [a, b] = m.target.split('-')
      if (a && b) pinned.set(a < b ? a + '|' + b : b + '|' + a, { first: a, ga: m.value.a, gb: m.value.b })
    }
  }
  return { groups: req.groups, gByCode, p, s, host, homeAdv, groupVar, koVar, pinned }
}

export function runMonteCarlo(req: SimRequest): SimResult {
  const t0 = now()
  const prep = prepare(req)
  const codes = req.strengthTable.map((t) => t.code)
  const champ = new Map<string, number>()
  const reach: Record<Round, Map<string, number>> = {
    R32: new Map(), R16: new Map(), QF: new Map(), SF: new Map(), F: new Map(),
  }
  for (const c of codes) { champ.set(c, 0); for (const r of ROUNDS) reach[r].set(c, 0) }
  const tlByChamp = new Map<string, Timeline>()

  for (let i = 0; i < req.N; i++) {
    const sub = hash2(req.seed, i)
    const rng = mulberry32(sub)
    const res = simulateOne(prep, rng, sub)
    for (const r of ROUNDS) {
      const map = reach[r]
      for (const c of res.reach[r]) map.set(c, (map.get(c) ?? 0) + 1)
    }
    champ.set(res.champion, (champ.get(res.champion) ?? 0) + 1)
    if (!tlByChamp.has(res.champion)) {
      tlByChamp.set(res.champion, { seed: sub, champion: res.champion, finalists: res.finalists, rounds: res.rounds })
    }
  }

  const perTeam: Record<string, PerTeam> = {}
  for (const c of codes) {
    const pr = { R32: 0, R16: 0, QF: 0, SF: 0, F: 0 } as Record<Round, number>
    for (const r of ROUNDS) pr[r] = reach[r].get(c)! / req.N
    perTeam[c] = { pChamp: champ.get(c)! / req.N, pReach: pr }
  }
  const seedTimelines = selectDivergent(tlByChamp, champ, perTeam, req.sampleTimelines)
  return { type: 'result', perTeam, seedTimelines, elapsedMs: now() - t0, N: req.N }
}

function flatWinners(t: Timeline): string[] {
  const out: string[] = []
  for (const r of t.rounds) for (const m of r.matches) out.push(m.winner)
  return out
}
function dist(a: Timeline, b: Timeline): number {
  const wa = flatWinners(a), wb = flatWinners(b)
  let d = 0
  for (let i = 0; i < wa.length; i++) if (wa[i] !== wb[i]) d++
  return d
}

// Pick `count` maximally-divergent timelines: modal favorite, top dark horse
// (champion outside the top-4 leaderboard), and the bracket furthest from the favorite.
export function selectDivergent(
  tlByChamp: Map<string, Timeline>, champ: Map<string, number>,
  perTeam: Record<string, PerTeam>, count: number,
): Timeline[] {
  const entries = [...tlByChamp.values()]
  if (entries.length === 0) return []
  const board = Object.keys(perTeam).sort((a, b) => perTeam[b].pChamp - perTeam[a].pChamp)
  const top4 = new Set(board.slice(0, 4))
  const fav = tlByChamp.get(board[0]) ?? entries[0]

  let dark: Timeline | undefined
  let bestDark = -1
  for (const [code, t] of tlByChamp) {
    if (!top4.has(code) && (champ.get(code) ?? 0) > bestDark) { bestDark = champ.get(code)!; dark = t }
  }
  let far: Timeline | undefined
  let fd = -1
  for (const t of entries) { const d = dist(fav, t); if (d > fd) { fd = d; far = t } }

  const chosen: Timeline[] = []
  const seen = new Set<string>()
  for (const t of [fav, dark, far]) if (t && !seen.has(t.champion)) { chosen.push(t); seen.add(t.champion) }
  if (chosen.length < count) {
    const rest = entries
      .filter((t) => !seen.has(t.champion))
      .sort((a, b) => (champ.get(b.champion) ?? 0) - (champ.get(a.champion) ?? 0))
    for (const t of rest) { if (chosen.length >= count) break; chosen.push(t); seen.add(t.champion) }
  }
  return chosen.slice(0, count)
}
