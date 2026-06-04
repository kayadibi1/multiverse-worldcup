import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useStore } from '../state/store'
import { COORDS, latLonToVec3 } from '../data/coords'
import { GLOBE_R as R } from './constants'

// Stylize a raw flag into a glowing circular badge (matches the neon globe aesthetic).
function makeBadge(img: HTMLImageElement | undefined): THREE.Texture {
  const S = 80
  const c = document.createElement('canvas'); c.width = S; c.height = S
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, S, S)
  ctx.save()
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2); ctx.clip()
  if (img) {
    const iw = img.width || 40, ih = img.height || 27
    const sc = Math.max((S - 16) / iw, (S - 16) / ih)
    const dw = iw * sc, dh = ih * sc
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh)
  }
  // gentle inner shading so it reads as a 3D badge
  const g = ctx.createRadialGradient(S / 2, S / 2 - 6, 4, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(0,10,30,0.35)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  ctx.restore()
  // glowing rim
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(200,230,255,0.95)'
  ctx.shadowColor = 'rgba(120,200,255,1)'; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2); ctx.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const easeOutBack = (t: number) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
const SIZE = 0.17

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
    for (let i = 0; i < meta.length; i++) {
      const sp = refs.current[i]
      if (!sp) continue
      wn.copy(meta[i].n).applyQuaternion(q)
      const facing = wn.dot(camDir)
      if (!started.current[i] && facing > 0.32) { started.current[i] = true; startT.current[i] = e }
      const pop = started.current[i] ? THREE.MathUtils.clamp((e - startT.current[i]) / 0.5, 0, 1) : 0
      const vis = facing > 0.14 ? 1 : 0
      const s = (pop <= 0 ? 0 : easeOutBack(pop)) * vis
      sp.scale.set(SIZE * s, SIZE * s, 1)
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
