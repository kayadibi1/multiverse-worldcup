import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './constants'

const HOSTS = new Set(['USA', 'CAN', 'MEX'])
const SEG = 96
const ARRIVE = 7.0 // every trace head reaches the US at this time — they converge simultaneously
const FORCE_START = 4.8 // any country not yet revealed launches by now so all make it
const CONF: Record<string, string> = {
  UEFA: '#4db5ff', CONMEBOL: '#ffd27a', CAF: '#3ddc97',
  AFC: '#ff7a7a', CONCACAF: '#b78cff', OFC: '#ff9ee0',
}
const usV = latLonToVec3(39, -98, 1)
const US = new THREE.Vector3(usV[0], usV[1], usV[2]).normalize().multiplyScalar(R)
const aUS = Math.atan2(US.z, US.x)
const pUS = Math.acos(US.y / R)
const smooth = (s: number) => s * s * (3 - 2 * s)

interface T { pts: THREE.Vector3[]; nC: THREE.Vector3; geom: THREE.BufferGeometry; color: THREE.Color; started: boolean; startT: number }

// Lives inside the spinning globe group. Each trace spirals in the +azimuth (spin) direction
// the long way to the US — NOT the geodesic shortest path. Head speed scales to each trace's
// start time so they ALL arrive at the US together, where a beacon flares.
export function Traces() {
  const ratings = useStore((s) => s.ratings)
  const traces = useMemo<T[]>(() => {
    if (!ratings) return []
    return ratings.teams.filter((t) => COORDS[t.code] && !HOSTS.has(t.code)).map((t) => {
      const [lat, lon] = COORDS[t.code]
      const v = latLonToVec3(lat, lon, 1)
      const nC = new THREE.Vector3(v[0], v[1], v[2]).normalize()
      const C = nC.clone().multiplyScalar(R)
      const aC = Math.atan2(C.z, C.x)
      const pC = Math.acos(C.y / R)
      let dA = aUS - aC
      while (dA < 0) dA += Math.PI * 2
      if (dA < 0.3) dA += Math.PI * 2 // never a near-shortest hop — sweep the long way round
      const pts: THREE.Vector3[] = []
      for (let k = 0; k <= SEG; k++) {
        const s = k / SEG
        const a = aC + dA * s
        const p = pC + (pUS - pC) * smooth(s)
        const rr = R + 0.55 * Math.sin(Math.PI * s) // arc well above the surface so the sweep is visible, not occluded
        pts.push(new THREE.Vector3(rr * Math.sin(p) * Math.cos(a), rr * Math.cos(p), rr * Math.sin(p) * Math.sin(a)))
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts)
      geom.setDrawRange(0, 0)
      return { pts, nC, geom, color: new THREE.Color(CONF[t.confederation] || '#9fb0c8'), started: false, startT: 0 }
    })
  }, [ratings])

  const lines = useMemo(
    () => traces.map((tr) => new THREE.Line(tr.geom, new THREE.LineBasicMaterial({
      color: tr.color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }))),
    [traces],
  )
  const headRef = useRef<THREE.Points>(null)
  const grpRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Sprite>(null)
  const headPos = useMemo(() => new Float32Array(Math.max(1, traces.length) * 3), [traces.length])
  const headCol = useMemo(() => new Float32Array(Math.max(1, traces.length) * 3), [traces.length])
  const elapsed = useRef(0)
  const camDir = useMemo(() => new THREE.Vector3(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const wn = useMemo(() => new THREE.Vector3(), [])
  const glowTex = useMemo(() => {
    const S = 128; const c = document.createElement('canvas'); c.width = S; c.height = S
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.32, 'rgba(150,220,255,0.55)'); g.addColorStop(1, 'rgba(110,180,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state, dt) => {
    elapsed.current += dt
    const e = elapsed.current
    const g = grpRef.current
    if (!g) return
    g.getWorldQuaternion(q)
    camDir.copy(state.camera.position).normalize()
    const head = headRef.current
    let completed = 0
    for (let i = 0; i < traces.length; i++) {
      const tr = traces[i]
      wn.copy(tr.nC).applyQuaternion(q)
      const facing = wn.dot(camDir)
      if (!tr.started && (facing > 0.2 || e > FORCE_START)) { tr.started = true; tr.startT = e }
      const headF = tr.started ? THREE.MathUtils.clamp((e - tr.startT) / Math.max(0.5, ARRIVE - tr.startT), 0, 1) : 0
      tr.geom.setDrawRange(0, Math.floor(headF * (SEG + 1)))
      const f = headF * SEG
      const i0 = Math.min(SEG, Math.floor(f)); const i1 = Math.min(SEG, i0 + 1); const fr = f - i0
      const a = tr.pts[i0], b = tr.pts[i1]
      headPos[i * 3] = a.x + (b.x - a.x) * fr; headPos[i * 3 + 1] = a.y + (b.y - a.y) * fr; headPos[i * 3 + 2] = a.z + (b.z - a.z) * fr
      const lit = tr.started && headF < 1 ? 1 : 0
      headCol[i * 3] = tr.color.r * lit; headCol[i * 3 + 1] = tr.color.g * lit; headCol[i * 3 + 2] = tr.color.b * lit
      if (headF >= 1) completed++
    }
    if (head) {
      const hg = head.geometry
      ;(hg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(hg.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
    }
    const frac = traces.length ? completed / traces.length : 0
    if (glowRef.current) {
      const s = 0.4 + 2.8 * frac
      glowRef.current.scale.set(s, s, 1)
      ;(glowRef.current.material as THREE.SpriteMaterial).opacity = 0.1 + 0.9 * frac
    }
  })

  return (
    <group ref={grpRef}>
      {lines.map((ln, i) => (<primitive key={i} object={ln} />))}
      <points ref={headRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[headPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[headCol, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors transparent opacity={0.95}
          blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation toneMapped={false} />
      </points>
      <sprite ref={glowRef} position={US.clone().multiplyScalar(1.06).toArray() as [number, number, number]} scale={[0.0001, 0.0001, 1]}>
        <spriteMaterial map={glowTex} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} opacity={0} />
      </sprite>
    </group>
  )
}
