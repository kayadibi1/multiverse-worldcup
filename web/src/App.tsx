import { Canvas } from '@react-three/fiber'
import { useEffect, Suspense } from 'react'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'
import { Leaderboard } from './ui/Leaderboard'
import { FuturesRail } from './ui/FuturesRail'
import { WhatIfDock } from './ui/WhatIfDock'
import { ColdOpen } from './ui/ColdOpen'
import { StadiumHud } from './ui/StadiumHud'
import { StoryPanel } from './ui/StoryPanel'
import { FadeTransition } from './ui/FadeTransition'
import { Hints } from './ui/Hints'
import { useStore } from './state/store'
import { useSim } from './sim/useSim'
import { getRatings, getHealth } from './api/client'

// Double-click the globe → dive into the most-likely final (no card-hunting).
function diveTopFinal() {
  const st = useStore.getState()
  if (st.view !== 'globe') return
  const t = st.sim?.seedTimelines?.[0]
  if (!t) return
  const [a, b] = t.finalists
  st.set({ view: 'stadium', fixture: { a, b, round: 'F', ga: a === t.champion ? 2 : 1, gb: b === t.champion ? 2 : 1, seed: t.seed } })
}

export default function App() {
  const set = useStore((s) => s.set)
  useSim()

  useEffect(() => {
    getRatings().then((r) => set({ ratings: r })).catch(() => {})
    getHealth().then((h) => set({ health: h })).catch(() => {})
  }, [set])

  return (
    <div className="app" data-testid="app">
      <Canvas camera={{ position: [0, 4, 18], fov: 45 }} dpr={[1, 2]} onDoubleClick={diveTopFinal}>
        <color attach="background" args={['#05070f']} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Hud />
      <Leaderboard />
      <WhatIfDock />
      <FuturesRail />
      <StadiumHud />
      <StoryPanel />
      <Hints />
      <ColdOpen />
      <FadeTransition />
    </div>
  )
}
