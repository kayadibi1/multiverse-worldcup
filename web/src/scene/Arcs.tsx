import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './Globe'

const HOSTS = new Set(['USA', 'CAN', 'MEX'])
const usV = latLonToVec3(39, -98, 1)
const US = new THREE.Vector3(usV[0], usV[1], usV[2]).normalize().multiplyScalar(R + 0.02)

const SEG = 64
const DRAW = 1.5 // seconds for one arc to draw itself
const SPREAD = 3.2 // arcs kick off staggered across this window

const CONF: Record<string, string> = {
  UEFA: '#4db5ff', CONMEBOL: '#ffd27a', CAF: '#3ddc97',
  AFC: '#ff7a7a', CONCACAF: '#b78cff', OFC: '#ff9ee0',
}
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

interface Arc { curve: THREE.QuadraticBezierCurve3; geom: THREE.BufferGeometry; color: THREE.Color; delay: number }

// Each nation's arc DRAWS itself from the country toward the US (the line traces the path,
// a bright head at the leading tip), staggered in time, colored by confederation.
export function Arcs() {
  const ratings = useStore((s) => s.ratings)

  const arcs = useMemo<Arc[]>(() => {
    if (!ratings) return []
    const list = ratings.teams.filter((t) => COORDS[t.code] && !HOSTS.has(t.code))
    return list.map((t, i) => {
      const [lat, lon] = COORDS[t.code]
      const a3 = latLonToVec3(lat, lon, 1)
      const a = new THREE.Vector3(a3[0], a3[1], a3[2]).normalize().multiplyScalar(R + 0.02)
      const mid = a.clone().add(US).multiplyScalar(0.5)
      const lift = a.distanceTo(US) * 0.55
      mid.normalize().multiplyScalar(R + lift)
      const curve = new THREE.QuadraticBezierCurve3(a, mid, US.clone())
      const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG))
      geom.setDrawRange(0, 0)
      const color = new THREE.Color(CONF[t.confederation] || '#9fb0c8')
      const delay = (i / list.length) * SPREAD + ((hash(t.code) % 100) / 100) * 0.4
      return { curve, geom, color, delay }
    })
  }, [ratings])

  const lines = useMemo(
    () => arcs.map((a) => new THREE.Line(a.geom, new THREE.LineBasicMaterial({
      color: a.color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }))),
    [arcs],
  )

  const headRef = useRef<THREE.Points>(null)
  const headPos = useMemo(() => new Float32Array(Math.max(1, arcs.length) * 3), [arcs.length])
  const headCol = useMemo(() => new Float32Array(Math.max(1, arcs.length) * 3), [arcs.length])
  const elapsed = useRef(0)

  useFrame((_, dt) => {
    elapsed.current += dt
    const e = elapsed.current
    const head = headRef.current
    for (let i = 0; i < arcs.length; i++) {
      const a = arcs[i]
      const lp = THREE.MathUtils.clamp((e - a.delay) / DRAW, 0, 1)
      a.geom.setDrawRange(0, Math.floor(lp * (SEG + 1)))
      const v = a.curve.getPoint(lp)
      headPos[i * 3] = v.x; headPos[i * 3 + 1] = v.y; headPos[i * 3 + 2] = v.z
      const lit = lp > 0 && lp < 1 ? 1 : 0 // head glows only while the arc is drawing
      headCol[i * 3] = a.color.r * lit; headCol[i * 3 + 1] = a.color.g * lit; headCol[i * 3 + 2] = a.color.b * lit
    }
    if (head) {
      const g = head.geometry
      ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(g.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
    }
  })

  return (
    <group>
      {lines.map((ln, i) => (<primitive key={i} object={ln} />))}
      <points ref={headRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[headPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[headCol, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors transparent opacity={0.95}
          blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation toneMapped={false} />
      </points>
    </group>
  )
}
