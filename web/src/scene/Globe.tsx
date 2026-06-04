import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Pillars } from './Pillars'
import { useStore } from '../state/store'
import { quality } from '../quality'

export const GLOBE_R = 2.5

export function Globe() {
  const grp = useRef<THREE.Group>(null)
  const view = useStore((s) => s.view)
  const tex = useTexture({ map: '/earth.jpg', emissiveMap: '/earth_lights.png' })

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

  // Rotate only on the interactive globe; hold still during the cold open (US faces camera).
  useFrame((_, d) => { if (grp.current && view === 'globe') grp.current.rotation.y += d * 0.018 })

  return (
    <group ref={grp}>
      <mesh>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <meshStandardMaterial
          map={tex.map} emissiveMap={tex.emissiveMap}
          emissive={'#ffbb66'} emissiveIntensity={1.15}
          color={'#54688f'} roughness={1} metalness={0} />
      </mesh>
      {/* soft atmosphere rim */}
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
      <Pillars R={GLOBE_R} />
    </group>
  )
}
