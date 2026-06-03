import { chromium } from '@playwright/test'
const url = process.argv[2] || 'http://localhost:8000/'
const out = process.argv[3] || 'C:/Users/Sidar/Desktop/ibm/docs/shot.png'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto(url)
await p.waitForFunction(() => window.__multiverse?.ready === true, { timeout: 60000 })
if (process.argv[4] === 'inject') {
  await p.getByTestId('team-select').selectOption('BRA')
  await p.getByTestId('card-injury').click()
  await p.getByTestId('card-host').click()
  await p.waitForTimeout(800)
}
await p.waitForTimeout(2000)
await p.screenshot({ path: out })
console.log('saved', out)
await b.close()
