import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import { publishDebug } from '../state/debug'
import { quality } from '../quality'
import type { SimRequest, SimResult } from './types'

// Fixed seed → reproducible multiverse (the precondition for honest what-if comparisons).
const SEED = 20260611

export function useSim(): void {
  const ratings = useStore((s) => s.ratings)
  const modifiers = useStore((s) => s.modifiers)
  const view = useStore((s) => s.view)
  const set = useStore((s) => s.set)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    w.onmessage = (e: MessageEvent<SimResult>) => {
      const res = e.data
      const st = useStore.getState()
      const isBaseline = st.modifiers.length === 0
      set({ sim: res, baseline: isBaseline ? res : st.baseline, simMs: res.elapsedMs, simN: res.N, busy: false })
      publishDebug(res, st.modifiers, useStore.getState().view)
    }
    return () => w.terminate()
  }, [set])

  useEffect(() => {
    const w = workerRef.current
    if (!w || !ratings) return
    const req: SimRequest = {
      type: 'simulate', strengthTable: ratings.teams, modelParams: ratings.modelParams,
      groups: ratings.groups, modifiers, N: quality.simN, seed: SEED, sampleTimelines: 3,
    }
    w.postMessage(req)
  }, [ratings, modifiers])

  // keep cameraWaypoint fresh on view changes
  useEffect(() => {
    const st = useStore.getState()
    if (st.sim) publishDebug(st.sim, st.modifiers, view)
  }, [view])
}
