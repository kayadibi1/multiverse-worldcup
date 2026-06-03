import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'

const MAXH = 1.5
const dummy = new THREE.Object3D()
const col = new THREE.Color()
const up = new THREE.Vector3(0, 1, 0)

// Per-nation glowing bar; height = P(win cup). Updates instance matrices in place
// (never recreates geometry) so re-runs don't leak GPU memory.
export function Pillars({ R }: { R: number }) {
  const sim = useStore((s) => s.sim)
  const ratings = useStore((s) => s.ratings)
  const codes = useMemo(
    () => (ratings ? ratings.teams.map((t) => t.code).filter((c) => COORDS[c]) : []),
    [ratings],
  )
  const ref = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = ref.current
    if (!mesh || !sim) return
    let maxP = 0
    for (const c of codes) maxP = Math.max(maxP, sim.perTeam[c]?.pChamp ?? 0)
    maxP = maxP || 1
    for (let i = 0; i < 48; i++) {
      if (i < codes.length) {
        const c = codes[i]
        const [lat, lon] = COORDS[c]
        const v = latLonToVec3(lat, lon, 1)
        const normal = new THREE.Vector3(v[0], v[1], v[2]).normalize()
        const p = sim.perTeam[c]?.pChamp ?? 0
        const frac = p / maxP
        const h = Math.max(0.03, frac * MAXH)
        dummy.position.copy(normal).multiplyScalar(R + h / 2)
        dummy.quaternion.setFromUnitVectors(up, normal)
        dummy.scale.set(0.045, h, 0.045)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        col.setRGB(0.35 + 0.65 * frac, 0.72 + 0.16 * frac, 1 - 0.55 * frac)
        mesh.setColorAt(i, col)
      } else {
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [sim, codes, R])

  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, 48]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
