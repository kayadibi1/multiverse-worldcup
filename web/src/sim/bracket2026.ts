import type { Round } from './types'

export const ROUND_SLOTS: Record<Round, number> = { R32: 32, R16: 16, QF: 8, SF: 4, F: 2 }

// A R32 slot is filled by a group winner (W), runner-up (RU), or the n-th best third (T).
export type SlotSource =
  | { kind: 'W'; group: string }
  | { kind: 'RU'; group: string }
  | { kind: 'T'; rank: number }

const W = (group: string): SlotSource => ({ kind: 'W', group })
const RU = (group: string): SlotSource => ({ kind: 'RU', group })
const T = (rank: number): SlotSource => ({ kind: 'T', rank })

// 32 slots in PAIR ORDER: [0]v[1], [2]v[3], … define the 16 R32 matches; the bracket
// then advances by standard single-elimination on this order.
//
// DOCUMENTED APPROXIMATION of FIFA's official 2026 layout (see README "known
// approximations"): the team COUNTS are exact (12 winners + 12 runners-up + 8 best
// thirds = 32) and the no-same-group-in-R32 property is enforced. Winner/runner-up
// pairings use distinct group letters by construction; third → slot assignment is
// best-thirds rank order plus a bounded same-group-avoidance swap (tournament.ts).
// FIFA's exact thirds-combination lookup table is intentionally not replicated.
export const SLOTS: SlotSource[] = [
  W('A'), T(0),   W('C'), RU('D'),
  W('E'), T(1),   W('G'), RU('H'),
  W('B'), T(2),   W('D'), RU('C'),
  W('F'), T(3),   W('H'), RU('G'),
  W('I'), T(4),   W('K'), RU('L'),
  W('J'), T(5),   W('L'), RU('K'),
  RU('A'), T(6),  RU('E'), RU('B'),
  RU('I'), T(7),  RU('F'), RU('J'),
]
