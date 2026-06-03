import { test, expect } from '@playwright/test'

const ALLOW = /(THREE|react-three|postprocessing|WebGL|GL_|Multisample|deprecat|GPU stall|Texture|extension)/i

test('narration: dive shows a streamed Granite story grounded in a Docling citation', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' && !ALLOW.test(m.text())) errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('/?headless=1')
  await page.waitForFunction(() => (window as any).__multiverse?.ready === true, null, { timeout: 60_000 })

  await page.locator('[data-testid^="future-"]').first().click()
  await expect(page.getByTestId('story-panel')).toBeVisible()

  // body streams text in
  await expect.poll(async () => (await page.getByTestId('story-body').innerText()).length, { timeout: 45_000 })
    .toBeGreaterThan(20)

  // a citation chip appears, traceable to a real dossier .md (Docling provenance)
  const chip = page.getByTestId('citation-chip').first()
  await expect(chip).toBeVisible({ timeout: 45_000 })
  const title = await chip.getAttribute('title')
  expect(title).toMatch(/\.md$/)

  expect(errors, errors.join('\n')).toEqual([])
})
