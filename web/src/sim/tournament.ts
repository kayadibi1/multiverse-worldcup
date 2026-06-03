import type { ModelParams, Round, MatchSim, RoundResult } from './types'
import { hash2 } from './prng'
import { simulateMatch } from './match'
import type { MatchCtx } from './match'
import { SLOTS } from './bracket2026'
import type { SlotSource } from './bracket2026'

export interface Prepared {
  groups: Record<string, string[]>
  gByCode: Map<string, string>
  p: ModelParams
  s: Map<string, number> // eff strength per code (constant across the run)
  host: Map<string, boolean>
  homeAdv: number
  groupVar: number
  koVar: Map<Round, number>
  pinned: Map<string, { first: string; ga: number; gb: number }>
}

const KO_ROUNDS: Round[] = ['R32', 'R16', 'QF', 'SF', 'F']

const pairKey = (a: string, b: string) => (a < b ? a + '|' + b : b + '|' + a)

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

interface Standing { code: string; pts: number; gd: number; gf: number }

function rankStandings(arr: Standing[], subseed: number, key: string): Standing[] {
  return arr.slice().sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    // seeded "drawing of lots" — deterministic, reproducible tiebreak
    return hash2(subseed, hashStr(key + a.code)) - hash2(subseed, hashStr(key + b.code))
  })
}

function resolveSlot(
  src: SlotSource, winners: Record<string, string>,
  runners: Record<string, string>, thirds: string[],
): string {
  if (src.kind === 'W') return winners[src.group]
  if (src.kind === 'RU') return runners[src.group]
  return thirds[src.rank]
}

// Bounded same-group-avoidance swap across third slots (documented approximation).
function avoidSameGroupThirds(resolved: string[], gByCode: Map<string, string>): void {
  const tPos: number[] = []
  for (let i = 0; i < SLOTS.length; i++) if (SLOTS[i].kind === 'T') tPos.push(i)
  const grp = (c: string) => gByCode.get(c) ?? '?'
  for (let pass = 0; pass < 3; pass++) {
    let changed = false
    for (const pos of tPos) {
      const partner = resolved[pos ^ 1]
      if (grp(resolved[pos]) === grp(partner)) {
        for (const other of tPos) {
          if (other === pos) continue
          const op = resolved[other ^ 1]
          if (grp(resolved[other]) !== grp(partner) && grp(resolved[pos]) !== grp(op)) {
            const tmp = resolved[pos]; resolved[pos] = resolved[other]; resolved[other] = tmp
            changed = true
            break
          }
        }
      }
    }
    if (!changed) break
  }
}

export interface OneResult {
  champion: string
  finalists: [string, string]
  rounds: RoundResult[]
  reach: Record<Round, string[]>
}

export function simulateOne(prep: Prepared, rng: () => number, subseed: number): OneResult {
  const { groups, p, s, host, homeAdv, groupVar, pinned, gByCode } = prep
  const winners: Record<string, string> = {}
  const runners: Record<string, string> = {}
  const thirds: Standing[] = []

  for (const g of Object.keys(groups)) {
    const codes = groups[g]
    const st: Record<string, Standing> = {}
    for (const c of codes) st[c] = { code: c, pts: 0, gd: 0, gf: 0 }
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        const x = codes[i], y = codes[j]
        let ga: number, gb: number
        const pin = pinned.get(pairKey(x, y))
        if (pin) { if (pin.first === x) { ga = pin.ga; gb = pin.gb } else { ga = pin.gb; gb = pin.ga } }
        else {
          const ctx: MatchCtx = { p, groupStage: true, variance: groupVar, homeAdv }
          const r = simulateMatch(x, s.get(x)!, host.get(x)!, y, s.get(y)!, host.get(y)!, ctx, rng, false)
          ga = r.ga; gb = r.gb
        }
        st[x].gf += ga; st[y].gf += gb
        st[x].gd += ga - gb; st[y].gd += gb - ga
        if (ga > gb) st[x].pts += 3
        else if (gb > ga) st[y].pts += 3
        else { st[x].pts += 1; st[y].pts += 1 }
      }
    }
    const ranked = rankStandings(Object.values(st), subseed, g)
    winners[g] = ranked[0].code
    runners[g] = ranked[1].code
    thirds.push(ranked[2])
  }

  const thirdsRanked = rankStandings(thirds, subseed, 'THIRDS').slice(0, 8).map((x) => x.code)
  const resolved: string[] = SLOTS.map((src) => resolveSlot(src, winners, runners, thirdsRanked))
  avoidSameGroupThirds(resolved, gByCode)

  const rounds: RoundResult[] = []
  const reach: Record<Round, string[]> = { R32: resolved.slice(), R16: [], QF: [], SF: [], F: [] }
  let current = resolved
  for (let ri = 0; ri < KO_ROUNDS.length; ri++) {
    const round = KO_ROUNDS[ri]
    const variance = prep.koVar.get(round) ?? 1
    const matches: MatchSim[] = []
    const next: string[] = []
    for (let m = 0; m < current.length; m += 2) {
      const x = current[m], y = current[m + 1]
      let ga: number, gb: number, winner: string
      const pin = pinned.get(pairKey(x, y))
      if (pin) {
        if (pin.first === x) { ga = pin.ga; gb = pin.gb } else { ga = pin.gb; gb = pin.ga }
        winner = ga >= gb ? x : y
      } else {
        const ctx: MatchCtx = { p, groupStage: false, variance, homeAdv }
        const r = simulateMatch(x, s.get(x)!, host.get(x)!, y, s.get(y)!, host.get(y)!, ctx, rng, true)
        ga = r.ga; gb = r.gb; winner = r.winner
      }
      matches.push({ a: x, b: y, ga, gb, winner, round })
      next.push(winner)
    }
    rounds.push({ round, matches })
    const nextRound = KO_ROUNDS[ri + 1]
    if (nextRound) reach[nextRound] = next.slice()
    current = next
  }
  const finalMatch = rounds[rounds.length - 1].matches[0]
  return { champion: current[0], finalists: [finalMatch.a, finalMatch.b], rounds, reach }
}
