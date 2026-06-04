import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './constants'

// Pixel-art flag: downsample to a tiny grid, then upscale with NO smoothing → crisp pixels,
// inside a neon frame so it matches the glowing-globe style.
const PW = 30, PH = 20
const W = 132, H = 92
function makeBadge(img: HTMLImageElement | undefined): THREE.Texture {
  const small = document.createElement('canvas'); small.width = PW; small.height = PH
  const sctx = small.getContext('2d')!
  if (img) { sctx.imageSmoothingEnabled = true; sctx.drawImage(img, 0, 0, PW, PH) }
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  const m = 12
  ctx.drawImage(small, m, m, W - 2 * m, H - 2 * m) // pixelated upscale
  // subtle scanline darkening for the retro feel
  ctx.fillStyle = 'rgba(0,8,24,0.16)'
  for (let y = m; y < H - m; y += 4) ctx.fillRect(m, y, W - 2 * m, 1)
  // neon frame
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(205,232,255,0.95)'
  ctx.shadowColor = 'rgba(120,200,255,1)'; ctx.shadowBlur = 11
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const easeOutBack = (t: number) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
const SIZE = 0.2
const ASPECT = H / W

export function Flags() {
  const ratings = useStore((s) => s.ratings)
  const codes = useMemo(() => (ratings ? ratings.teams.filter((t) => COORDS[t.code]).map((t) => t.code) : []), [ratings])
  const tex = useTexture(codes.map((c) => `/flags/${c}.png`))
  const texArr = Array.isArray(tex) ? tex : [tex]
  const badges = useMemo(() => texArr.map((t) => makeBadge(t.image as HTMLImageElement | undefined)), [texArr])
  const meta = useMemo(() => codes.map((c) => {
    const [lat, lon] = COORDS[c]
    const v = latLonToVec3(lat, lon, 1)
    return { code: c, n: new THREE.Vector3(v[0], v[1], v[2]).normalize() }
  }), [codes])

  const refs = useRef<(THREE.Sprite | null)[]>([])
  const started = useRef<boolean[]>([])
  const startT = useRef<number[]>([])
  const grpRef = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const camDir = useMemo(() => new THREE.Vector3(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const wn = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    elapsed.current += dt
    const e = elapsed.current
    const g = grpRef.current
    if (!g) return
    g.getWorldQuaternion(q)
    camDir.copy(state.camera.position).normalize()
    const fadeOut = THREE.MathUtils.clamp(1 - (e - 7.4) / 0.9, 0, 1) // fade before the city dive
    for (let i = 0; i < meta.length; i++) {
      const sp = refs.current[i]
      if (!sp) continue
      wn.copy(meta[i].n).applyQuaternion(q)
      const facing = wn.dot(camDir)
      if (!started.current[i] && facing > 0.32) { started.current[i] = true; startT.current[i] = e }
      const pop = started.current[i] ? THREE.MathUtils.clamp((e - startT.current[i]) / 0.5, 0, 1) : 0
      const vis = facing > 0.14 ? 1 : 0
      const s = (pop <= 0 ? 0 : easeOutBack(pop)) * vis * fadeOut
      sp.scale.set(SIZE * s, SIZE * ASPECT * s, 1)
    }
  })

  if (!meta.length) return null
  return (
    <group ref={grpRef}>
      {meta.map((m, i) => (
        <sprite key={m.code} ref={(el) => { refs.current[i] = el }}
          position={m.n.clone().multiplyScalar(R + 0.14).toArray() as [number, number, number]}
          scale={[0.0001, 0.0001, 1]}>
          <spriteMaterial map={badges[i]} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  )
}
