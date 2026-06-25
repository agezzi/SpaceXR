"use client";

import { Float, useGLTF } from "@react-three/drei";

export default function Chair() {
  const { scene } = useGLTF("/models/chair.glb");

  return (
    <Float
      speed={2}
      rotationIntensity={0.4}
      floatIntensity={0.8}
    >
      <primitive
        object={scene}
        scale={1}
        position={[0, -0.5, 0]}
      />
    </Float>
  );
}

useGLTF.preload("/models/chair.glb");