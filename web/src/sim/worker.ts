/// <reference lib="webworker" />
import type { SimRequest } from './types'
import { runMonteCarlo } from './montecarlo'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (e: MessageEvent<SimRequest>) => {
  const req = e.data
  if (req && req.type === 'simulate') {
    const res = runMonteCarlo(req)
    ctx.postMessage(res)
  }
}
