import type { ModelParams, Modifier } from './types'
import { samplePoisson } from './poisson'

export function strength(elo: number, p: ModelParams): number {
  return (elo - p.eloCenter) / p.eloScale
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

// Sum team-scope strength modifiers into a per-code delta (clamped at use site).
export function teamStrengthDeltas(modifiers: Modifier[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const mod of modifiers) {
    if (mod.scope === 'team' && mod.field === 'strength' && typeof mod.value === 'number') {
      const cur = m.get(mod.target) ?? 0
      m.set(mod.target, cur + (mod.op === 'add' ? mod.value : 0))
    }
  }
  return m
}

export function effStrength(
  code: string, elo: number, p: ModelParams, deltas: Map<string, number>,
): number {
  const s = strength(elo, p) + (deltas.get(code) ?? 0)
  return clamp(s, -1.5, 2.5)
}

export interface MatchCtx {
  p: ModelParams
  groupStage: boolean
  variance: number // round variance multiplier
  homeAdv: number // possibly globally modified
}

// Independent Poisson goals model (spec v2 §8). Host edge only in the group stage.
export function simulateMatch(
  aCode: string, sA: number, hostA: boolean,
  bCode: string, sB: number, hostB: boolean,
  ctx: MatchCtx, rng: () => number, knockout: boolean,
): { ga: number; gb: number; winner: string } {
  const { p } = ctx
  const homeTerm = ctx.groupStage ? ctx.homeAdv * ((hostA ? 1 : 0) - (hostB ? 1 : 0)) : 0
  const lamA = clamp(p.base * Math.exp(p.k * (sA - sB) + homeTerm) * ctx.variance, 0.15, 6)
  const lamB = clamp(p.base * Math.exp(p.k * (sB - sA) - homeTerm) * ctx.variance, 0.15, 6)
  let ga = samplePoisson(lamA, rng)
  let gb = samplePoisson(lamB, rng)
  if (!knockout) {
    return { ga, gb, winner: ga > gb ? aCode : gb > ga ? bCode : 'draw' }
  }
  if (ga === gb) {
    ga += samplePoisson(lamA * p.etBump, rng)
    gb += samplePoisson(lamB * p.etBump, rng)
  }
  if (ga === gb) {
    const pA = 1 / (1 + Math.exp(-p.penaltyK * (sA - sB)))
    return { ga, gb, winner: rng() < pA ? aCode : bCode }
  }
  return { ga, gb, winner: ga > gb ? aCode : bCode }
}
