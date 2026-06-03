import { defineConfig } from '@playwright/test'

// Headless WebGL via ANGLE/SwiftShader so the r3f canvas keeps a valid GL context in CI.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:8000',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
    },
  },
})
