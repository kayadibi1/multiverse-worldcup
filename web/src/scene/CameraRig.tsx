import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useStore } from '../state/store'

// One rig that eases between named waypoints — the "one continuous world".
export function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const view = useStore((s) => s.view)
  const fixture = useStore((s) => s.fixture)
  const first = useRef(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const animate = !first.current
    first.current = false
    if (view === 'cold') {
      c.setLookAt(0, 4, 18, 0, 0, 0, animate)
    } else if (view === 'stadium') {
      c.setLookAt(0, 4.5, 11, 0, 0.3, 0, animate)
    } else {
      c.setLookAt(0, 1.2, 6.4, 0, 0, 0, animate)
    }
  }, [view, fixture])

  return <CameraControls ref={ref} makeDefault minDistance={3.2} maxDistance={90} />
}
