import { test, expect } from '@playwright/test'

// Benign GL/three/r3f noise we don't fail on.
const ALLOW = /(THREE|react-three|postprocessing|WebGL|GL_|Multisample|deprecat|GPU stall|Texture|extension)/i

test('globe boots headless, sims run, probability invariant holds', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' && !ALLOW.test(m.text())) errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('/?headless=1')
  await page.waitForFunction(() => (window as any).__multiverse?.ready === true, null, { timeout: 60_000 })

  const mv = await page.evaluate(() => (window as any).__multiverse)
  expect(Math.abs(mv.championSum - 1)).toBeLessThan(1e-6)
  expect(mv.leaderboard.length).toBeGreaterThan(5)
  expect(mv.simCount).toBeGreaterThan(0)
  expect(mv.bloom).toBe(false) // headless disables bloom

  await expect(page.getByTestId('leaderboard')).toBeVisible()
  await expect(page.getByTestId('futures-rail')).toBeVisible()

  expect(errors, 'console errors:\n' + errors.join('\n')).toEqual([])
})
