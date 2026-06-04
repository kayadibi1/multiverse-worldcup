import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { GLOBE_R as R } from './constants'

// Cold open: CameraControls is unmounted and the default camera zooms slowly straight in on
// the front (+Z) — where the spinning globe delivers the United States by the end.
function ColdCam() {
  const t = useRef(0)
  useFrame((state, dt) => {
    t.current = Math.min(1, t.current + dt / 7)
    const tt = t.current
    const e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2 // easeInOut
    const dist = THREE.MathUtils.lerp(15, 4.6, e)
    state.camera.position.set(0, 0.5 + 1.4 * (1 - e), dist)
    state.camera.lookAt(0, 0, R * 0.35)
  })
  return null
}

export function CameraRig() {
  const view = useStore((s) => s.view)
  const fixture = useStore((s) => s.fixture)
  const ref = useRef<any>(null)

  useEffect(() => {
    if (view === 'cold') return
    const c = ref.current
    if (!c) return
    if (view === 'stadium') c.setLookAt(0, 4.5, 11, 0, 0.3, 0, true)
    else c.setLookAt(0, 1.2, 6.4, 0, 0, 0, true)
  }, [view, fixture])

  if (view === 'cold') return <ColdCam />
  return <CameraControls ref={ref} makeDefault minDistance={3.2} maxDistance={90} />
}
