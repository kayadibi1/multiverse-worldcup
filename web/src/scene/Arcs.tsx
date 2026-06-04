import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './Globe'

const HOSTS = new Set(['USA', 'CAN', 'MEX'])
const usV = latLonToVec3(39, -98, 1)
const US = new THREE.Vector3(usV[0], usV[1], usV[2]).normalize().multiplyScalar(R + 0.02)
const PER_ARC = 3

// Glowing arcs tracing from every participating nation, converging on the US host —
// the cold-open "the whole world descends on North America" beat.
export function Arcs() {
  const ratings = useStore((s) => s.ratings)
  const curves = useMemo(() => {
    if (!ratings) return [] as THREE.QuadraticBezierCurve3[]
    return ratings.teams
      .filter((t) => COORDS[t.code] && !HOSTS.has(t.code))
      .map((t) => {
        const [lat, lon] = COORDS[t.code]
        const a3 = latLonToVec3(lat, lon, 1)
        const a = new THREE.Vector3(a3[0], a3[1], a3[2]).normalize().multiplyScalar(R + 0.02)
        const mid = a.clone().add(US).multiplyScalar(0.5)
        const lift = a.distanceTo(US) * 0.55
        mid.normalize().multiplyScalar(R + lift)
        return new THREE.QuadraticBezierCurve3(a, mid, US.clone())
      })
  }, [ratings])

  const points = useMemo(() => curves.map((c) => c.getPoints(40)), [curves])
  const ptsRef = useRef<THREE.Points>(null)
  const count = curves.length * PER_ARC
  const posArr = useMemo(() => new Float32Array(Math.max(1, count) * 3), [count])
  const clock = useRef(0)

  useFrame((_, dt) => {
    clock.current += dt
    const p = (clock.current * 0.4) % 1
    const pts = ptsRef.current
    if (!pts || !curves.length) return
    const arr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    let idx = 0
    for (let i = 0; i < curves.length; i++) {
      for (let m = 0; m < PER_ARC; m++) {
        const t = (p + m / PER_ARC) % 1
        const v = curves[i].getPoint(t)
        arr[idx * 3] = v.x; arr[idx * 3 + 1] = v.y; arr[idx * 3 + 2] = v.z
        idx++
      }
    }
    ;(pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <group>
      {points.map((p, i) => (
        <Line key={i} points={p} color="#4db5ff" lineWidth={1} transparent opacity={0.14} />
      ))}
      <points ref={ptsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posArr, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.055} color="#ffe6b0" transparent opacity={0.95}
          blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  )
}
