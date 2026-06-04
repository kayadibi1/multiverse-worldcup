import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'

const dummy = new THREE.Object3D()
const col = new THREE.Color()
const camDir = new THREE.Vector3()
const q = new THREE.Quaternion()
const wn = new THREE.Vector3()

// One glowing node per nation, sitting ON the globe surface; radius + brightness = P(win).
// A surface dot can't streak past the silhouette like a radial bar, and we still fade it
// out on the far/rim hemisphere so only camera-facing nations light up (like city lights).
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
  const target = useRef(new Float32Array(48)) // normalized 0..1 by favorite
  const cur = useRef(new Float32Array(48))

  useEffect(() => {
    const mesh = ref.current
    if (!mesh || !sim) return
    let maxP = 0
    for (const c of codes) maxP = Math.max(maxP, sim.perTeam[c]?.pChamp ?? 0)
    maxP = maxP || 1
    for (let i = 0; i < 48; i++) {
      const frac = i < codes.length ? (sim.perTeam[codes[i]]?.pChamp ?? 0) / maxP : 0
      target.current[i] = frac
      if (i < codes.length) {
        col.setRGB(0.42 + 0.58 * frac, 0.76 + 0.18 * frac, 1 - 0.45 * frac)
        mesh.setColorAt(i, col)
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [sim, codes])

  useFrame((state, dt) => {
    const mesh = ref.current
    if (!mesh) return
    camDir.copy(state.camera.position).normalize() // globe at origin
    mesh.parent?.getWorldQuaternion(q)
    const k = Math.min(1, dt * 4)
    for (let i = 0; i < 48; i++) {
      cur.current[i] += (target.current[i] - cur.current[i]) * k
      if (i < normals.length) {
        const nm = normals[i]
        wn.copy(nm).applyQuaternion(q)
        const facing = wn.dot(camDir)
        const t = THREE.MathUtils.clamp((facing - 0.15) / 0.35, 0, 1)
        const sv = t * t * (3 - 2 * t)
        const radius = (0.022 + cur.current[i] * 0.075) * sv
        dummy.position.copy(nm).multiplyScalar(R + 0.12) // hover above the surface so markers read against city lights
        dummy.quaternion.identity()
        dummy.scale.setScalar(Math.max(0.0001, radius))
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
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
