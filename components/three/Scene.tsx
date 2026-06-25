export default function Scene() {
  return (
    <>
      {/* Soft ambient light */}
      <ambientLight intensity={1.2} />

      {/* Main light */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2}
        castShadow
      />

      {/* Fill light */}
      <directionalLight
        position={[-5, 4, -5]}
        intensity={0.5}
      />

      {/* Soft spotlight */}
      <spotLight
        position={[0, 10, 0]}
        angle={0.35}
        penumbra={1}
        intensity={1}
      />
    </>
  );
}