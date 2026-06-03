import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'

// The stadium lives far below the globe; the camera dives down to it.
export const STADIUM_POS: [number, number, number] = [0, -40, 0]
const [SX, SY, SZ] = STADIUM_POS

// 4-3-3 (attacking +z, in the −z half). [acrossX, alongZ]
const BASE: [number, number][] = [
  [0, -5], [-3, -3.4], [-1, -3.4], [1, -3.4], [3, -3.4],
  [-2.3, -1.9], [0, -1.9], [2.3, -1.9], [-2.7, -0.5], [0, -0.5], [2.7, -0.5],
]

function Team({ mirror, color }: { mirror: boolean; color: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((st) => {
    if (ref.current) {
      const adv = Math.abs(Math.sin(st.clock.elapsedTime * 0.6)) * 0.9
      ref.current.position.z = (mirror ? -1 : 1) * adv
    }
  })
  return (
    <group ref={ref}>
      {BASE.map(([x, z], i) => (
        <mesh key={i} position={[SX + x, SY + 0.3, SZ + (mirror ? -z : z)]}>
          <sphereGeometry args={[0.17, 12, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Clash() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    if (ref.current) {
      const s = 0.3 + Math.abs(Math.sin(st.clock.elapsedTime * 1.4)) * 0.7
      ref.current.scale.setScalar(s)
      ;(ref.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.5 * (1 - s)
    }
  })
  return (
    <mesh ref={ref} position={[SX, SY + 0.4, SZ]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.5} toneMapped={false} />
    </mesh>
  )
}

export function Stadium() {
  return (
    <group>
      <mesh position={[SX, SY, SZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 11]} />
        <meshStandardMaterial color="#0d2c1a" emissive="#06140c" />
      </mesh>
      <mesh position={[SX, SY + 0.02, SZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.62, 48]} />
        <meshBasicMaterial color="#2f7a45" toneMapped={false} />
      </mesh>
      <mesh position={[SX, SY + 0.02, SZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 0.12]} />
        <meshBasicMaterial color="#2f7a45" toneMapped={false} />
      </mesh>
      <Team mirror={false} color="#4db5ff" />
      <Team mirror color="#ffd27a" />
      <Clash />
    </group>
  )
}
