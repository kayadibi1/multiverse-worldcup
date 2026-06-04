import { Suspense } from 'react'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Globe } from './Globe'
import { Stadium } from './Stadium'
import { ShockRing } from './ShockRing'
import { CameraRig } from './CameraRig'
import { Arcs } from './Arcs'
import { Flags } from './Flags'
import { useStore } from '../state/store'
import { quality } from '../quality'

export function Scene() {
  const view = useStore((s) => s.view)
  const inStadium = view === 'stadium'
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 4, 6]} intensity={1.1} />
      {!inStadium && <Globe />}
      {!inStadium && <ShockRing />}
      {view === 'cold' && <Arcs />}
      {view === 'cold' && <Suspense fallback={null}><Flags /></Suspense>}
      {inStadium && <Stadium />}
      <CameraRig />
      {quality.bloom && (
        <EffectComposer>
          <Bloom intensity={quality.bloomParams.intensity}
            luminanceThreshold={quality.bloomParams.luminanceThreshold}
            mipmapBlur={quality.bloomParams.mipmapBlur} />
        </EffectComposer>
      )}
    </>
  )
}
