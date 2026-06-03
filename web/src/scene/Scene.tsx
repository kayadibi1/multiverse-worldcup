import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Globe } from './Globe'
import { ShockRing } from './ShockRing'
import { quality } from '../quality'

export function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 4, 6]} intensity={1.1} />
      <Globe />
      <ShockRing />
      <OrbitControls enablePan={false} enableDamping minDistance={3.4} maxDistance={9}
        autoRotate autoRotateSpeed={0.35} />
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
