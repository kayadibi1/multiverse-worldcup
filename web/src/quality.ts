// Quality flag. Headless (Playwright / ?headless=1) disables bloom + reduces particles
// so the WebGL context stays valid under SwiftShader, and shrinks N so e2e is fast.
const isHeadless = (() => {
  try {
    const w = typeof navigator !== 'undefined' && (navigator as any).webdriver
    const q = typeof location !== 'undefined' && new URLSearchParams(location.search).has('headless')
    return Boolean(w || q)
  } catch {
    return false
  }
})()

export const quality = {
  headless: isHeadless,
  bloom: !isHeadless,
  bloomParams: { intensity: 1.1, luminanceThreshold: 0.18, mipmapBlur: true },
  particles: isHeadless ? 1200 : 6000,
  simN: isHeadless ? 4000 : 10000,
  tier: isHeadless ? 'headless' : 'high',
}
