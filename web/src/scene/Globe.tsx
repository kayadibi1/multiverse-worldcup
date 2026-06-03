import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Pillars } from './Pillars'
import { quality } from '../quality'

export const GLOBE_R = 2.5

export function Globe() {
  const grp = useRef<THREE.Group>(null)
  const atmo = useMemo(() => {
    const n = quality.particles
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = GLOBE_R * (1.06 + Math.random() * 0.55)
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      pos[i * 3] = r * s * Math.cos(t)
      pos[i * 3 + 1] = r * u
      pos[i * 3 + 2] = r * s * Math.sin(t)
      const amber = Math.random() < 0.28
      col[i * 3] = amber ? 1 : 0.32
      col[i * 3 + 1] = amber ? 0.82 : 0.7
      col[i * 3 + 2] = amber ? 0.48 : 1
    }
    return { pos, col, n }
  }, [])

  useFrame((_, d) => { if (grp.current) grp.current.rotation.y += d * 0.025 })

  return (
    <group ref={grp}>
      <mesh>
        <sphereGeometry args={[GLOBE_R, 48, 48]} />
        <meshStandardMaterial color="#0b1a33" emissive="#07122a" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.002, 24, 24]} />
        <meshBasicMaterial color="#2f6fb0" wireframe transparent opacity={0.16} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[atmo.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[atmo.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.026} vertexColors transparent opacity={0.7}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <Pillars R={GLOBE_R} />
    </group>
  )
}
