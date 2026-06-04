import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { GLOBE_R as R } from './Globe'
import { latLonToVec3 } from '../data/coords'

const usV = latLonToVec3(39, -98, 1)
const usN = new THREE.Vector3(usV[0], usV[1], usV[2]).normalize()
const lookTarget = usN.clone().multiplyScalar(R * 0.55)

// During the cold open, CameraControls is unmounted and we hand-animate the default camera:
// start far out, then push straight in on the United States over ~5s.
function ColdCam() {
  const t = useRef(0)
  useFrame((state, dt) => {
    t.current = Math.min(1, t.current + dt / 5)
    const e = t.current * t.current
    const dist = THREE.MathUtils.lerp(20, 2.6, e)
    const pos = usN.clone().multiplyScalar(R + dist)
    pos.y += 1.4 * (1 - e)
    state.camera.position.copy(pos)
    state.camera.lookAt(lookTarget)
  })
  return null
}

// One rig: hand-flown cold open, then CameraControls eases between globe and stadium.
export function CameraRig() {
  const view = useStore((s) => s.view)
  const fixture = useStore((s) => s.fixture)
  const ref = useRef<any>(null)

  useEffect(() => {
    if (view === 'cold') return
    const c = ref.current
    if (!c) return
    if (view === 'stadium') c.setLookAt(0, 4.5, 11, 0, 0.3, 0, true)
    else c.setLookAt(0, 1.2, 6.4, 0, 0, 0, true) // pulls back from the US to the globe overview
  }, [view, fixture])

  if (view === 'cold') return <ColdCam />
  return <CameraControls ref={ref} makeDefault minDistance={3.2} maxDistance={90} />
}
