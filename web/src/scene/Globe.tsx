import * as THREE from 'three'
import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Pillars } from './Pillars'
import { Traces } from './Traces'
import { Flags } from './Flags'
import { useStore } from '../state/store'
import { quality } from '../quality'
import { latLonToVec3 } from '../data/coords'
import { GLOBE_R } from './constants'

const COLD_DUR = 7
const SPIN = Math.PI * 2.5 // ~1.25 slow turns during the cold open
const usN = (() => { const v = latLonToVec3(39, -98, 1); return new THREE.Vector3(v[0], v[1], v[2]).normalize() })()
// grp.rotation.y that brings the US to face +Z (the camera) at the end of the spin.
const RHO1 = Math.PI / 2 - Math.atan2(usN.z, usN.x)
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

export function Globe() {
  const grp = useRef<THREE.Group>(null)
  const view = useStore((s) => s.view)
  const tex = useTexture({ map: '/earth.jpg', emissiveMap: '/earth_lights.png' })
  const cold = useRef(0)

  const atmo = useMemo(() => {
    const n = quality.particles
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = GLOBE_R * (1.08 + Math.random() * 0.5)
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      pos[i * 3] = r * s * Math.cos(t)
      pos[i * 3 + 1] = r * u
      pos[i * 3 + 2] = r * s * Math.sin(t)
      const amber = Math.random() < 0.25
      col[i * 3] = amber ? 1 : 0.4
      col[i * 3 + 1] = amber ? 0.82 : 0.72
      col[i * 3 + 2] = amber ? 0.5 : 1
    }
    return { pos, col, n }
  }, [])

  useFrame((_, d) => {
    if (!grp.current) return
    if (view === 'cold') {
      cold.current += d
      const t = Math.min(1, cold.current / COLD_DUR)
      grp.current.rotation.y = RHO1 - SPIN * (1 - smoother(t)) // slow spin, lands on the US
    } else if (view === 'globe') {
      grp.current.rotation.y += d * 0.015 // gentle idle, continuing from the US
    }
  })

  return (
    <group ref={grp}>
      <mesh>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <meshStandardMaterial
          map={tex.map} emissiveMap={tex.emissiveMap}
          emissive={'#ffbb66'} emissiveIntensity={1.15}
          color={'#54688f'} roughness={1} metalness={0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.02, 32, 32]} />
        <meshBasicMaterial color={'#3a7bd0'} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[atmo.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[atmo.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.018} vertexColors transparent opacity={0.35}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      {view === 'globe' && <Pillars R={GLOBE_R} />}
      {view === 'cold' && <Traces />}
      {view === 'cold' && <Suspense fallback={null}><Flags /></Suspense>}
    </group>
  )
}
