import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'

const MAXH = 1.35
const dummy = new THREE.Object3D()
const col = new THREE.Color()
const up = new THREE.Vector3(0, 1, 0)

// Glowing bar per nation; height = P(win). Heights tween toward target each frame so
// a what-if visibly ripples; matrices update in place (no geometry recreation).
export function Pillars({ R }: { R: number }) {
  const sim = useStore((s) => s.sim)
  const ratings = useStore((s) => s.ratings)
  const codes = useMemo(
    () => (ratings ? ratings.teams.map((t) => t.code).filter((c) => COORDS[c]) : []),
    [ratings],
  )
  const normals = useMemo(
    () => codes.map((c) => {
      const [lat, lon] = COORDS[c]
      const v = latLonToVec3(lat, lon, 1)
      return new THREE.Vector3(v[0], v[1], v[2]).normalize()
    }),
    [codes],
  )
  const ref = useRef<THREE.InstancedMesh>(null)
  const target = useRef(new Float32Array(48))
  const cur = useRef(new Float32Array(48))

  useEffect(() => {
    const mesh = ref.current
    if (!mesh || !sim) return
    let maxP = 0
    for (const c of codes) maxP = Math.max(maxP, sim.perTeam[c]?.pChamp ?? 0)
    maxP = maxP || 1
    for (let i = 0; i < 48; i++) {
      if (i < codes.length) {
        const frac = (sim.perTeam[codes[i]]?.pChamp ?? 0) / maxP
        target.current[i] = Math.max(0.03, frac * MAXH)
        col.setRGB(0.35 + 0.65 * frac, 0.72 + 0.16 * frac, 1 - 0.55 * frac)
        mesh.setColorAt(i, col)
      } else {
        target.current[i] = 0
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [sim, codes])

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const k = Math.min(1, dt * 4)
    for (let i = 0; i < 48; i++) {
      cur.current[i] += (target.current[i] - cur.current[i]) * k
      if (i < normals.length) {
        const h = Math.max(0.0001, cur.current[i])
        const nm = normals[i]
        dummy.position.copy(nm).multiplyScalar(R + h / 2)
        dummy.quaternion.setFromUnitVectors(up, nm)
        dummy.scale.set(0.045, h, 0.045)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      } else {
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, 48]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
