// Shared simulation contracts (spec v2 §7/§8/§12). Erasable-only TS (no enums/namespaces).

export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'F'
export const ROUNDS = ['R32', 'R16', 'QF', 'SF', 'F'] as const

export interface KeyPlayer { name: string; role: string; importance: number }

export interface Team {
  code: string
  name: string
  confederation: string
  group: string
  elo: number
  fifaRank?: number | null
  isHost: boolean
  keyPlayers: KeyPlayer[]
  style?: string
  blurb?: string
  modifiers?: Modifier[]
}

export interface ModelParams {
  base: number; k: number; homeAdv: number; etBump: number
  penaltyK: number; eloCenter: number; eloScale: number; variance: number
}

export type ModScope = 'team' | 'match' | 'round' | 'global'
export type ModField = 'strength' | 'homeAdv' | 'result' | 'variance'
export type ModOp = 'add' | 'mul' | 'set'

export interface Modifier {
  id: string
  scope: ModScope
  target: string            // team code | "A-B" fixture key | round name | "*"
  field: ModField
  op: ModOp
  value: number | { a: number; b: number }
  label: string
  source?: 'card' | 'granite' | 'fallback' | 'anchor'
}

export interface MatchSim {
  a: string; b: string; ga: number; gb: number; winner: string
  round: Round | 'G'
}
export interface RoundResult { round: Round; matches: MatchSim[] }

export interface Timeline {
  seed: number
  champion: string
  finalists: [string, string]
  rounds: RoundResult[]
}

export interface PerTeam { pChamp: number; pReach: Record<Round, number> }

export interface SimRequest {
  type: 'simulate'
  strengthTable: Team[]
  modelParams: ModelParams
  groups: Record<string, string[]>
  modifiers: Modifier[]
  N: number
  seed: number
  sampleTimelines: number
}

export interface SimResult {
  type: 'result'
  perTeam: Record<string, PerTeam>
  seedTimelines: Timeline[]
  elapsedMs: number
  N: number
}
