import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Globe } from './Globe'
import { Stadium } from './Stadium'
import { ShockRing } from './ShockRing'
import { CameraRig } from './CameraRig'
import { quality } from '../quality'

export function Scene() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[6, 4, 6]} intensity={1.1} />
      <Globe />
      <Stadium />
      <ShockRing />
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
