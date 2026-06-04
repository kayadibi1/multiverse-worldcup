import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { GLOBE_R as R, HOST_LATLON } from './constants'
import { latLonToVec3 } from '../data/coords'

const hostV = latLonToVec3(HOST_LATLON[0], HOST_LATLON[1], 1)
const hostN = new THREE.Vector3(hostV[0], hostV[1], hostV[2]).normalize()
const RHO1 = Math.PI / 2 - Math.atan2(hostN.z, hostN.x)
const hostDir = hostN.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), RHO1) // host direction at spin's end

// Cold open camera, two phases down the host axis (so the host city ends centered):
//  0–7s  converge   : far -> mid as the world spins in and the traces gather on the host
//  7–9.6s dive       : mid -> just above the city, showing the in-between zoom levels
function ColdCam() {
  const e = useRef(0)
  useFrame((state, dt) => {
    e.current += dt
    const t = e.current
    let dist: number
    if (t <= 7) {
      const p = t / 7
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      dist = THREE.MathUtils.lerp(13, 3.6, ease)
    } else {
      const p = Math.min(1, (t - 7) / 2.6)
      dist = THREE.MathUtils.lerp(3.6, 0.14, p * p) // accelerate the dive in
    }
    state.camera.position.copy(hostDir).multiplyScalar(R + dist)
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
