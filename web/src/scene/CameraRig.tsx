import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { GLOBE_R as R } from './constants'
import { latLonToVec3 } from '../data/coords'

// Direction of the US at the end of the spin (lat 39N → upper-front, not the equator).
const usV = latLonToVec3(39, -98, 1)
const usN = new THREE.Vector3(usV[0], usV[1], usV[2]).normalize()
const RHO1 = Math.PI / 2 - Math.atan2(usN.z, usN.x)
const usDir = usN.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), RHO1)

// Cold open: zoom slowly straight down the US axis (so the US ends up centered) while the
// globe spins the world through view beneath.
function ColdCam() {
  const t = useRef(0)
  useFrame((state, dt) => {
    t.current = Math.min(1, t.current + dt / 7)
    const tt = t.current
    const e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2 // easeInOut
    const dist = THREE.MathUtils.lerp(13, 3.6, e)
    state.camera.position.copy(usDir).multiplyScalar(R + dist)
    state.camera.lookAt(0, 0, 0)
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
