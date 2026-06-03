// Node/tsx test runner (no framework). Run from repo root:  web/node_modules/.bin/tsx web/src/sim/__tests__/run.ts
import { readFileSync } from 'node:fs'
import { mulberry32 } from '../prng'
import { samplePoisson } from '../poisson'
import { simulateMatch } from '../match'
import type { MatchCtx } from '../match'
import { runMonteCarlo } from '../montecarlo'
import { SLOTS, ROUND_SLOTS } from '../bracket2026'
import { ROUNDS } from '../types'
import type { SimRequest, ModelParams } from '../types'

let pass = 0, fail = 0
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}  ${detail}`) }
}
const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

const kb = JSON.parse(readFileSync('data/kb/teams.json', 'utf-8'))
const params: ModelParams = kb.modelParams
const req: SimRequest = {
  type: 'simulate', strengthTable: kb.teams, modelParams: params, groups: kb.groups,
  modifiers: [], N: 2000, seed: 12345, sampleTimelines: 3,
}

console.log('--- format ---')
ok('SLOTS length 32', SLOTS.length === 32)
ok('ROUND_SLOTS sums', ROUND_SLOTS.R32 === 32 && ROUND_SLOTS.R16 === 16 && ROUND_SLOTS.F === 2)
ok('12 groups of 4', Object.keys(kb.groups).length === 12 && Object.values(kb.groups).every((g: any) => g.length === 4))
ok('48 teams', kb.teams.length === 48)

console.log('--- match model monotonicity ---')
function winRate(sA: number, sB: number, n = 6000): number {
  const rng = mulberry32(99)
  const ctx: MatchCtx = { p: params, groupStage: false, variance: 1, homeAdv: params.homeAdv }
  let w = 0
  for (let i = 0; i < n; i++) { if (simulateMatch('A', sA, false, 'B', sB, false, ctx, rng, true).winner === 'A') w++ }
  return w / n
}
const wrStrong = winRate(1.5, -0.5)
const wrEven = winRate(0.5, 0.5)
const wrStronger = winRate(2.2, -0.5)
ok('stronger team wins more than even', wrStrong > wrEven, `${wrStrong} vs ${wrEven}`)
ok('even match ~ 0.5', Math.abs(wrEven - 0.5) < 0.05, `${wrEven}`)
ok('monotonic in strength', wrStronger > wrStrong, `${wrStronger} vs ${wrStrong}`)

console.log('--- poisson mean ---')
{
  const rng = mulberry32(7)
  let sum = 0, n = 40000
  for (let i = 0; i < n; i++) sum += samplePoisson(1.5, rng)
  ok('poisson mean ~ lambda', Math.abs(sum / n - 1.5) < 0.05, `${sum / n}`)
}

console.log('--- PRNG reproducibility ---')
{
  const a = runMonteCarlo({ ...req, N: 500 })
  const b = runMonteCarlo({ ...req, N: 500 })
  ok('same seed -> identical perTeam', JSON.stringify(a.perTeam) === JSON.stringify(b.perTeam))
  ok('same seed -> identical timelines', JSON.stringify(a.seedTimelines) === JSON.stringify(b.seedTimelines))
}

console.log('--- probability invariants (N=2000) ---')
const res = runMonteCarlo(req)
const codes = Object.keys(res.perTeam)
const sumChamp = codes.reduce((a, c) => a + res.perTeam[c].pChamp, 0)
ok('Σ pChamp = 1', approx(sumChamp, 1), `${sumChamp}`)
for (const r of ROUNDS) {
  const s = codes.reduce((a, c) => a + res.perTeam[c].pReach[r], 0)
  ok(`Σ pReach(${r}) = ${ROUND_SLOTS[r]}`, approx(s, ROUND_SLOTS[r]), `${s}`)
}
let mono = true
for (const c of codes) {
  const t = res.perTeam[c]
  if (!(t.pReach.R32 + 1e-9 >= t.pReach.R16 && t.pReach.R16 + 1e-9 >= t.pReach.QF &&
        t.pReach.QF + 1e-9 >= t.pReach.SF && t.pReach.SF + 1e-9 >= t.pReach.F &&
        t.pReach.F + 1e-9 >= t.pChamp)) { mono = false; break }
}
ok('per-team reach monotonic R32≥R16≥QF≥SF≥F≥champ', mono)

console.log('--- divergence rail ---')
const champs = new Set(res.seedTimelines.map((t) => t.champion))
ok('3 seed timelines', res.seedTimelines.length === 3, `${res.seedTimelines.length}`)
ok('≥2 distinct champions', champs.size >= 2, `${[...champs].join(',')}`)
ok('timeline shape (finalists 2, rounds 5)', res.seedTimelines.every((t) => t.finalists.length === 2 && t.rounds.length === 5))

console.log('--- response shape ---')
ok('48 perTeam entries', codes.length === 48)
ok('pReach has all rounds', codes.every((c) => ROUNDS.every((r) => typeof res.perTeam[c].pReach[r] === 'number')))
ok('elapsedMs reported', typeof res.elapsedMs === 'number')

console.log('--- data sanity (real Elo) ---')
const board = codes.sort((a, b) => res.perTeam[b].pChamp - res.perTeam[a].pChamp)
ok('leader ∈ {ESP,FRA,ARG}', ['ESP', 'FRA', 'ARG'].includes(board[0]), `leader=${board[0]}`)
ok('ESP/FRA/ARG each pChamp > 0.05', ['ESP', 'FRA', 'ARG'].every((c) => res.perTeam[c].pChamp > 0.05),
  `ESP=${res.perTeam.ESP?.pChamp} FRA=${res.perTeam.FRA?.pChamp} ARG=${res.perTeam.ARG?.pChamp}`)

console.log(`\n[sim tests] N=${req.N} elapsedMs=${res.elapsedMs.toFixed(0)} | top: ${board.slice(0, 5).map((c) => c + ' ' + (res.perTeam[c].pChamp * 100).toFixed(1) + '%').join(', ')}`)
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
