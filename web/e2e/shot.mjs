import { chromium } from '@playwright/test'
const url = process.argv[2] || 'http://localhost:8000/'
const out = process.argv[3] || 'C:/Users/Sidar/Desktop/ibm/docs/shot.png'
const mode = process.argv[4]
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto(url)
await p.waitForFunction(() => window.__multiverse?.ready === true, { timeout: 60000 })
const mv = await p.evaluate(() => window.__multiverse)
console.log(`__multiverse: ready=${mv.ready} championSum=${mv.championSum?.toFixed(4)} simN=${mv.simCount} bloom=${mv.bloom}`)

if (mode === 'cold') {
  // capture mid cold-open: arcs converging, camera pushing in on the US
  await p.waitForTimeout(Number(process.argv[5] || 2600))
} else {
  try { await p.getByTestId('skip-cold-open').click({ timeout: 2000 }) } catch {}
  await p.waitForTimeout(1800)
  if (mode === 'inject') {
    await p.getByTestId('team-select').selectOption('BRA')
    await p.getByTestId('card-injury').click()
    await p.getByTestId('card-host').click()
    await p.waitForTimeout(800)
  } else if (mode === 'dive') {
    await p.locator('[data-testid^="future-"]').first().click()
    await p.waitForFunction(() => window.__multiverse?.cameraWaypoint === 'stadium', { timeout: 15000 })
    await p.waitForTimeout(2800)
  } else if (mode === 'story') {
    await p.locator('[data-testid^="future-"]').first().click()
    await p.getByTestId('citation-chip').first().waitFor({ state: 'visible', timeout: 55000 })
    await p.waitForTimeout(600)
  }
  await p.waitForTimeout(2000)
}
await p.screenshot({ path: out })
console.log('saved', out)
await b.close()
