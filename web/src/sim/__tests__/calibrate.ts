// Probe the strength coefficient k to find a realistic champion spread.
import { readFileSync } from 'node:fs'
import { runMonteCarlo } from '../montecarlo'
const kb = JSON.parse(readFileSync('data/kb/teams.json', 'utf-8'))
for (const k of [0.22, 0.26, 0.30, 0.34, 0.40, 0.55]) {
  const res = runMonteCarlo({
    type: 'simulate', strengthTable: kb.teams, modelParams: { ...kb.modelParams, k },
    groups: kb.groups, modifiers: [], N: 4000, seed: 1, sampleTimelines: 3,
  })
  const b = Object.keys(res.perTeam).sort((x, y) => res.perTeam[y].pChamp - res.perTeam[x].pChamp)
  console.log(`k=${k.toFixed(2)} | ` + b.slice(0, 6).map((c) => `${c} ${(res.perTeam[c].pChamp * 100).toFixed(1)}%`).join('  '))
}
