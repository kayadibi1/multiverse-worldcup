import { test, expect } from '@playwright/test'

const ALLOW = /(THREE|react-three|postprocessing|WebGL|GL_|Multisample|deprecat|GPU stall|Texture|extension)/i

test('dive into a fixture: camera reaches stadium, hud shows, back returns to globe', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' && !ALLOW.test(m.text())) errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('/?headless=1')
  await page.waitForFunction(() => (window as any).__multiverse?.ready === true, null, { timeout: 60_000 })

  await page.locator('[data-testid^="future-"]').first().click()
  await expect(page.getByTestId('stadium-hud')).toBeVisible()
  await page.waitForFunction(() => (window as any).__multiverse?.cameraWaypoint === 'stadium', null, { timeout: 10_000 })

  await page.getByTestId('back-globe').click()
  await page.waitForFunction(() => (window as any).__multiverse?.cameraWaypoint === 'globe', null, { timeout: 10_000 })

  expect(errors, errors.join('\n')).toEqual([])
})
