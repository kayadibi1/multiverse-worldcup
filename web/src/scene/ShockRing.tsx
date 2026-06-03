import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'
import { GLOBE_R } from './Globe'

// Expanding amber shell that pulses outward whenever a what-if is applied.
export function ShockRing() {
  const rippleAt = useStore((s) => s.rippleAt)
  const ref = useRef<THREE.Mesh>(null)
  const t = useRef(1)
  useEffect(() => { if (rippleAt) t.current = 0 }, [rippleAt])
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt * 0.9)
      const s = GLOBE_R * (1.0 + t.current * 0.9)
      m.scale.set(s, s, s)
      ;(m.material as THREE.MeshBasicMaterial).opacity = (1 - t.current) * 0.45
      m.visible = true
    } else {
      m.visible = false
    }
  })
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#ffd27a" wireframe transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
