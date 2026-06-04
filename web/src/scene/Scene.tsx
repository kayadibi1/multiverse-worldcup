import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Globe } from './Globe'
import { Stadium } from './Stadium'
import { ShockRing } from './ShockRing'
import { CameraRig } from './CameraRig'
import { useStore } from '../state/store'
import { quality } from '../quality'

export function Scene() {
  const inStadium = useStore((s) => s.view) === 'stadium'
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[6, 4, 6]} intensity={1.1} />
      {!inStadium && <Globe />}
      {!inStadium && <ShockRing />}
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
