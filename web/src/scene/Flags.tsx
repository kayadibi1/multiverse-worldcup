import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './Globe'

const HOSTS = new Set(['USA', 'CAN', 'MEX'])
const SPREAD = 3.2 // must match Arcs so each flag pops as its arc launches
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
const W = 0.17, H = 0.115

// A small pixel flag pops up (scale overshoot) at each nation's location, timed to its arc.
// Sprites depth-test against the globe, so back-side flags are naturally occluded.
export function Flags() {
  const ratings = useStore((s) => s.ratings)
  const codes = useMemo(() => (ratings ? ratings.teams.filter((t) => COORDS[t.code]).map((t) => t.code) : []), [ratings])
  const meta = useMemo(() => {
    if (!ratings) return [] as { code: string; pos: [number, number, number]; delay: number }[]
    const nonHost = ratings.teams.filter((t) => COORDS[t.code] && !HOSTS.has(t.code))
    const dmap: Record<string, number> = {}
    nonHost.forEach((t, i) => { dmap[t.code] = (i / nonHost.length) * SPREAD + ((hash(t.code) % 100) / 100) * 0.4 })
    return codes.map((c) => {
      const [lat, lon] = COORDS[c]
      const v = latLonToVec3(lat, lon, 1)
      const n = new THREE.Vector3(v[0], v[1], v[2]).normalize().multiplyScalar(R + 0.16)
      return { code: c, pos: [n.x, n.y, n.z] as [number, number, number], delay: HOSTS.has(c) ? 0.15 : (dmap[c] ?? 0) }
    })
  }, [ratings, codes])

  const tex = useTexture(codes.map((c) => `/flags/${c}.png`))
  const texArr = Array.isArray(tex) ? tex : [tex]
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const elapsed = useRef(0)

  useFrame((_, dt) => {
    elapsed.current += dt
    const e = elapsed.current
    for (let i = 0; i < meta.length; i++) {
      const sp = refs.current[i]
      if (!sp) continue
      const t = THREE.MathUtils.clamp((e - meta[i].delay) / 0.5, 0, 1)
      const s = t <= 0 ? 0.0001 : easeOutBack(t)
      sp.scale.set(W * s, H * s, 1)
    }
  })

  if (!meta.length) return null
  return (
    <group>
      {meta.map((m, i) => (
        <sprite key={m.code} ref={(el) => { refs.current[i] = el }} position={m.pos} scale={[0.0001, 0.0001, 1]}>
          <spriteMaterial map={texArr[i]} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  )
}
