import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './constants'

const HOSTS = new Set(['USA', 'CAN', 'MEX'])
const SEG = 60
const DRAW = 1.7
const CONF: Record<string, string> = {
  UEFA: '#4db5ff', CONMEBOL: '#ffd27a', CAF: '#3ddc97',
  AFC: '#ff7a7a', CONCACAF: '#b78cff', OFC: '#ff9ee0',
}
const usV = latLonToVec3(39, -98, 1)
const US = new THREE.Vector3(usV[0], usV[1], usV[2]).normalize().multiplyScalar(R)

interface T {
  nC: THREE.Vector3
  geom: THREE.BufferGeometry
  curve: THREE.QuadraticBezierCurve3
  color: THREE.Color
  started: boolean
  startT: number
}

// Lives INSIDE the globe group, so traces spin with the Earth. Each country fires when it
// rotates into camera view; its line draws itself toward the US, bowed in the spin direction
// (a control point pushed along the +Y rotation tangent — the long way, not the shortest path).
export function Traces() {
  const ratings = useStore((s) => s.ratings)
  const traces = useMemo<T[]>(() => {
    if (!ratings) return []
    return ratings.teams.filter((t) => COORDS[t.code] && !HOSTS.has(t.code)).map((t) => {
      const [lat, lon] = COORDS[t.code]
      const v = latLonToVec3(lat, lon, 1)
      const nC = new THREE.Vector3(v[0], v[1], v[2]).normalize()
      const C = nC.clone().multiplyScalar(R)
      const mid = C.clone().add(US).multiplyScalar(0.5)
      const lift = C.distanceTo(US) * 0.45
      const tan = new THREE.Vector3(-mid.z, 0, mid.x).normalize() // +Y rotation tangent (spin direction)
      const ctrl = mid.clone().normalize().multiplyScalar(R + lift).add(tan.multiplyScalar(lift * 0.95))
      const curve = new THREE.QuadraticBezierCurve3(C, ctrl, US.clone())
      const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG))
      geom.setDrawRange(0, 0)
      return { nC, geom, curve, color: new THREE.Color(CONF[t.confederation] || '#9fb0c8'), started: false, startT: 0 }
    })
  }, [ratings])

  const lines = useMemo(
    () => traces.map((tr) => new THREE.Line(tr.geom, new THREE.LineBasicMaterial({
      color: tr.color, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }))),
    [traces],
  )
  const headRef = useRef<THREE.Points>(null)
  const grpRef = useRef<THREE.Group>(null)
  const headPos = useMemo(() => new Float32Array(Math.max(1, traces.length) * 3), [traces.length])
  const headCol = useMemo(() => new Float32Array(Math.max(1, traces.length) * 3), [traces.length])
  const elapsed = useRef(0)
  const camDir = useMemo(() => new THREE.Vector3(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const wn = useMemo(() => new THREE.Vector3(), [])
  const glowRef = useRef<THREE.Sprite>(null)
  const glowTex = useMemo(() => {
    const S = 128; const c = document.createElement('canvas'); c.width = S; c.height = S
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(255,244,210,1)'); g.addColorStop(0.4, 'rgba(255,210,120,0.55)'); g.addColorStop(1, 'rgba(255,200,100,0)')
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
    for (let i = 0; i < traces.length; i++) {
      const tr = traces[i]
      wn.copy(tr.nC).applyQuaternion(q)
      const facing = wn.dot(camDir)
      if (!tr.started && facing > 0.25) { tr.started = true; tr.startT = e }
      const lp = tr.started ? THREE.MathUtils.clamp((e - tr.startT) / DRAW, 0, 1) : 0
      tr.geom.setDrawRange(0, Math.floor(lp * (SEG + 1)))
      const v = tr.curve.getPoint(lp)
      headPos[i * 3] = v.x; headPos[i * 3 + 1] = v.y; headPos[i * 3 + 2] = v.z
      const lit = tr.started && lp < 1 ? 1 : 0
      headCol[i * 3] = tr.color.r * lit; headCol[i * 3 + 1] = tr.color.g * lit; headCol[i * 3 + 2] = tr.color.b * lit
    }
    if (head) {
      const hg = head.geometry
      ;(hg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(hg.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
    }
    // convergence beacon at the US brightens as each trace arrives
    let completed = 0
    for (const tr of traces) if (tr.started && (e - tr.startT) / DRAW >= 1) completed++
    const frac = traces.length ? completed / traces.length : 0
    if (glowRef.current) {
      const s = 0.3 + frac * 1.3
      glowRef.current.scale.set(s, s, 1)
      ;(glowRef.current.material as THREE.SpriteMaterial).opacity = 0.12 + 0.85 * frac
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
        <pointsMaterial size={0.07} vertexColors transparent opacity={0.95}
          blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation toneMapped={false} />
      </points>
      <sprite ref={glowRef} position={US.toArray() as [number, number, number]} scale={[0.0001, 0.0001, 1]}>
        <spriteMaterial map={glowTex} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} opacity={0} />
      </sprite>
    </group>
  )
}
