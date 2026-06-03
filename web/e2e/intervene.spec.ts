import { test, expect } from '@playwright/test'

const ALLOW = /(THREE|react-three|postprocessing|WebGL|GL_|Multisample|deprecat|GPU stall|Texture|extension)/i

test('injury what-if ripples: target pChamp drops, shockwave fires, chip shows', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' && !ALLOW.test(m.text())) errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('/?headless=1')
  await page.waitForFunction(() => (window as any).__multiverse?.ready === true, null, { timeout: 60_000 })

  const pChamp = () => page.evaluate(() =>
    ((window as any).__multiverse.leaderboard.find((r: any) => r.code === 'BRA')?.pChamp ?? 0))
  const before = await pChamp()
  const gen0 = await page.evaluate(() => (window as any).__multiverse.generation)

  await page.getByTestId('team-select').selectOption('BRA')
  await page.getByTestId('card-injury').click()

  // same fixed seed → baseline vs intervened differ ONLY by the modifier (deterministic)
  await page.waitForFunction((g) => (window as any).__multiverse.generation > g, gen0, { timeout: 30_000 })

  const after = await pChamp()
  const shock = await page.evaluate(() => (window as any).__multiverse.lastShockwaveAt)
  expect(after, `before=${before} after=${after}`).toBeLessThan(before - 0.003)
  expect(shock).toBeGreaterThan(0)
  await expect(page.getByTestId('modifier-chip').first()).toBeVisible()
  expect(errors, errors.join('\n')).toEqual([])
})
