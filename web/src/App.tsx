import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'
import { Leaderboard } from './ui/Leaderboard'
import { FuturesRail } from './ui/FuturesRail'
import { useStore } from './state/store'
import { useSim } from './sim/useSim'
import { getRatings, getHealth } from './api/client'

export default function App() {
  const set = useStore((s) => s.set)
  useSim()

  useEffect(() => {
    getRatings().then((r) => set({ ratings: r, view: 'globe' })).catch(() => {})
    getHealth().then((h) => set({ health: h })).catch(() => {})
  }, [set])

  return (
    <div className="app" data-testid="app">
      <Canvas camera={{ position: [0, 1.2, 6.2], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#05070f']} />
        <Scene />
      </Canvas>
      <Hud />
      <Leaderboard />
      <FuturesRail />
    </div>
  )
}
