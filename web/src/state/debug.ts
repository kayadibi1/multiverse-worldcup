// Publishes window.__multiverse for the headless e2e to assert against. The contract:
//   ready, generation, simCount, elapsedMs, championSum, leaderboard[], activeModifiers[],
//   cameraWaypoint, bloom, particleCount, quality, lastShockwaveAt
import { quality } from '../quality'
import type { SimResult, Modifier } from '../sim/types'

let generation = 0
let lastShockwaveAt = 0

export function markShockwave(): void {
  lastShockwaveAt = Date.now()
  const w = window as any
  if (w.__multiverse) w.__multiverse.lastShockwaveAt = lastShockwaveAt
}

export function publishDebug(sim: SimResult | null, modifiers: Modifier[], view: string): void {
  const w = window as any
  if (!sim) { w.__multiverse = { ready: false }; return }
  const lb = Object.entries(sim.perTeam)
    .map(([code, v]) => ({ code, pChamp: v.pChamp }))
    .sort((a, b) => b.pChamp - a.pChamp)
  const championSum = lb.reduce((a, x) => a + x.pChamp, 0)
  w.__multiverse = {
    ready: true,
    generation: ++generation,
    simCount: sim.N,
    elapsedMs: sim.elapsedMs,
    championSum,
    leaderboard: lb.slice(0, 12),
    activeModifiers: modifiers.map((m) => m.label),
    cameraWaypoint: view,
    bloom: quality.bloom,
    particleCount: quality.particles,
    quality: quality.tier,
    lastShockwaveAt,
  }
}
