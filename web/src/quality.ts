// Quality flag. Headless (Playwright / ?headless=1) disables bloom + reduces particles
// so the WebGL context stays valid under SwiftShader, and shrinks N so e2e is fast.
const isHeadless = (() => {
  try {
    const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
    if (params.has('hq')) return false // force full quality (for capture/diagnostics) even under automation
    const w = typeof navigator !== 'undefined' && (navigator as any).webdriver
    return Boolean(w || params.has('headless'))
  } catch {
    return false
  }
})()

export const quality = {
  headless: isHeadless,
  bloom: !isHeadless,
  bloomParams: { intensity: 0.6, luminanceThreshold: 0.32, mipmapBlur: true },
  particles: isHeadless ? 1200 : 6000,
  simN: isHeadless ? 4000 : 10000,
  tier: isHeadless ? 'headless' : 'high',
}
