import { create } from 'zustand'
import type { SimResult, Modifier, Timeline } from '../sim/types'
import type { Ratings, Health } from '../api/client'

export type View = 'cold' | 'globe' | 'stadium'

export interface Fixture {
  a: string; b: string; round: string; ga: number; gb: number; seed: number; upset?: boolean
}

interface State {
  ratings: Ratings | null
  sim: SimResult | null
  baseline: SimResult | null // no-modifier run, for trend arrows
  modifiers: Modifier[]
  view: View
  fixture: Fixture | null
  health: Health | null
  simMs: number
  simN: number
  busy: boolean
  set: (p: Partial<State>) => void
  addModifiers: (m: Modifier[]) => void
  removeModifier: (id: string) => void
  clearModifiers: () => void
}

export const useStore = create<State>((set) => ({
  ratings: null, sim: null, baseline: null, modifiers: [], view: 'cold',
  fixture: null, health: null, simMs: 0, simN: 0, busy: false,
  set: (p) => set(p),
  addModifiers: (m) => set((s) => ({ modifiers: [...s.modifiers, ...m], busy: true })),
  removeModifier: (id) => set((s) => ({ modifiers: s.modifiers.filter((x) => x.id !== id), busy: true })),
  clearModifiers: () => set({ modifiers: [], busy: true }),
}))

// Helper: a leaderboard (code + pChamp + trend vs baseline), sorted desc.
export interface LbRow { code: string; pChamp: number; trend: number }
export function leaderboard(sim: SimResult | null, baseline: SimResult | null): LbRow[] {
  if (!sim) return []
  return Object.entries(sim.perTeam)
    .map(([code, v]) => ({ code, pChamp: v.pChamp, trend: v.pChamp - (baseline?.perTeam[code]?.pChamp ?? v.pChamp) }))
    .sort((a, b) => b.pChamp - a.pChamp)
}

export function firstTimelines(sim: SimResult | null): Timeline[] {
  return sim?.seedTimelines ?? []
}
