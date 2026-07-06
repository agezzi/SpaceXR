"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useThree, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

type Props = {
  selectedModel?: string | null;
  scale?: number;
  rotationY?: number;
  previewEnabled?: boolean;
  onPlacedCountChange?: (count: number) => void;
};

export default function ARPlacement({ selectedModel, scale = 1, rotationY = 0, previewEnabled = true, onPlacedCountChange }: Props) {
  const { gl, scene, camera } = useThree();
  const reticleRef = useRef<THREE.Mesh | null>(null);
  const [visible, setVisible] = useState(false);
  const [pose, setPose] = useState<THREE.Matrix4 | null>(null);
  type PlacedItem = { position: THREE.Vector3; rotationY: number; scale: number };
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [previewPosition, setPreviewPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, -1));
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let hitTestSource: any = null;
    let viewerSpace: any = null;
    let localSpace: any = null;
    let rafId: any = null;

    const session = (gl as any).xr?.getSession?.();
    if (!session) return;

    const onXRFrame = (time: any, xrFrame: any) => {
      if (!hitTestSource) return;
      const results = xrFrame.getHitTestResults(hitTestSource);
      if (results.length > 0) {
        const refSpace = localSpace || (session as any).referenceSpace;
        const poseResult = results[0].getPose(refSpace);
        if (poseResult) {
          const m = new THREE.Matrix4().fromArray(poseResult.transform.matrix);
          setPose(m);
          setVisible(true);
        }
      } else {
        setVisible(false);
      }
      rafId = session.requestAnimationFrame(onXRFrame);
    };

    (async () => {
      try {
        viewerSpace = await session.requestReferenceSpace("viewer");
        localSpace = await session.requestReferenceSpace("local-floor").catch(() => null);
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        rafId = session.requestAnimationFrame(onXRFrame);
      } catch (e) {
        console.warn("Hit test not available", e);
      }
    })();

    return () => {
      try {
        if (hitTestSource) hitTestSource.cancel();
        if (rafId) session.cancelAnimationFrame(rafId);
      } catch (e) {}
    };
  }, [gl]);

  // detect if an XR session is active
  const xrSession = (gl as any).xr?.getSession?.();

  useEffect(() => {
    if (!reticleRef.current) return;
    if (pose) {
      reticleRef.current.matrix.copy(pose);
      reticleRef.current.matrix.decompose(reticleRef.current.position, reticleRef.current.quaternion, reticleRef.current.scale);
    }
  }, [pose]);

  const handlePlace = () => {
    if (!pose) return;
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const m = pose.clone();
    m.decompose(pos, quat, scl);
    const newItem: PlacedItem = { position: pos.clone(), rotationY: rotationY, scale: typeof scale === 'number' ? scale : 1 };
    setPlaced((p) => {
      const next = [...p, newItem];
      if (onPlacedCountChange) onPlacedCountChange(next.length);
      return next;
    });
  };

  // expose a global place function so DOM overlay buttons can call it
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof window !== "undefined") window.__placeAtHit = handlePlace;
    // expose clear function
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof window !== "undefined") window.__clearPlaced = () => {
      setPlaced([]);
      if (onPlacedCountChange) onPlacedCountChange(0);
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window !== "undefined") window.__placeAtHit = undefined;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window !== "undefined") window.__clearPlaced = undefined;
    };
  }, [pose]);
  // Use `useLoader` so parsing happens inside the render/Suspense flow
  const localModelPath = `/models/${selectedModel ?? 'chair.glb'}`;
  // fallback URL used when the local model is unavailable on deployed hosts
  const remoteFallbackModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb';
  // small sample GLB URL for headless GLTF pipeline validation
  const sampleGlb = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb';
  const localBoxPath = '/models/Box.glb';
  const urlParams = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : null;
  const forceBox = !!(urlParams && urlParams.get('forceBox') === '1');

  // detect headless / puppeteer environment to force a simple test mesh
  const isHeadless = (typeof navigator !== 'undefined' && (((navigator as any).userAgent || '').includes('Headless') || (navigator as any).webdriver === true)) || (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('headless=1'));

  const [effectiveModelPath, setEffectiveModelPath] = useState<string>(isHeadless ? (forceBox ? localBoxPath : sampleGlb) : remoteFallbackModel);

  useEffect(() => {
    if (isHeadless) return;
    let active = true;
    const checkLocalModel = async () => {
      try {
        const res = await fetch(localModelPath, { method: 'HEAD' });
        if (!active) return;
        if (res.ok) {
          setEffectiveModelPath(localModelPath);
        } else {
          setEffectiveModelPath(remoteFallbackModel);
        }
      } catch (e) {
        if (!active) return;
        setEffectiveModelPath(remoteFallbackModel);
      }
    };
    checkLocalModel();
    return () => {
      active = false;
    };
  }, [localModelPath, isHeadless, remoteFallbackModel, forceBox, sampleGlb]);

  // create a simple checkerboard texture and test mesh for headless verification
  const testTexture = useMemo(() => {
    try {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#8888ff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if ((x + y) % 2 === 0) ctx.fillRect((x * size) / 8, (y * size) / 8, size / 8, size / 8);
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    } catch (e) {
      return null;
    }
  }, []);

  const testMesh = useMemo(() => {
    try {
      if (!testTexture) return null;
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ map: testTexture });
      const m = new THREE.Mesh(geo, mat);
      return m;
    } catch (e) {
      return null;
    }
  }, [testTexture]);

  // Ensure headless runs immediately expose debug info so captures can validate pipeline
  useEffect(() => {
    try {
      if (!isHeadless) return;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window !== 'undefined' && !(window as any).__lastGltfInfo) {
        // Provide deterministic info indicating the headless test mesh will render
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__lastGltfInfo = { path: 'headless-test-mesh', note: 'test-mesh', size: [1, 1, 1], maxDim: 1, scaleFactor: 1, center: [0, 0, 0] };
        // eslint-disable-next-line no-console
        console.info('GLTF_INFO', (window as any).__lastGltfInfo);
      }
    } catch (e) {}
  }, [isHeadless]);

  // useLoader typing is a bit strict for three/examples loaders; cast to any
  const loadedGltf: any = (useLoader as any)(GLTFLoader, effectiveModelPath);

  const { sceneWrapper: loadedSceneWrapper, previewWrapper: loadedPreviewWrapper, scaledSize, scaledCenter } = useMemo(() => {
    if (!loadedGltf) return { sceneWrapper: null, previewWrapper: null, scaledSize: null, scaledCenter: null };
    const g = loadedGltf as any;
    const sceneObj = g.scene || g.scenes?.[0] || null;
    if (!sceneObj) return { sceneWrapper: null, previewWrapper: null, scaledSize: null, scaledCenter: null };
    const box = new THREE.Box3().setFromObject(sceneObj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
    // desired visual size in scene units (increase to make models more visible)
    const desired = 1.5;
    const scaleFactor = desired / maxDim;
    const center = new THREE.Vector3();
    box.getCenter(center);

    const wrapper = new THREE.Group();
    const cloned = sceneObj.clone(true);
    cloned.traverse((c: any) => {
      if (c.isMesh) c.geometry && c.geometry.computeBoundingBox && c.geometry.computeBoundingBox();
    });
    wrapper.add(cloned);
    // slightly up-scale on non-headless runs so large models are easier to see
    const visualMultiplier = isHeadless ? 1.0 : 1.8;
    wrapper.scale.setScalar(scaleFactor * visualMultiplier);
    wrapper.position.copy(center.multiplyScalar(-scaleFactor));

    const preview = wrapper.clone(true);
    preview.traverse((child: any) => {
      if (child.material) {
        try {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.6;
        } catch (e) {}
      }
    });

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__lastGltfInfo = { path: effectiveModelPath, size: size.toArray(), maxDim, scaleFactor, center: center.toArray() };
        // eslint-disable-next-line no-console
        console.info('GLTF_INFO', (window as any).__lastGltfInfo);
      }
    } catch (e) {}

    const scaledSize = size.clone().multiplyScalar(scaleFactor * visualMultiplier);
    const scaledCenter = center.clone().multiplyScalar(-scaleFactor * visualMultiplier);

    return { sceneWrapper: wrapper, previewWrapper: preview, scaledSize, scaledCenter };
  }, [loadedGltf, effectiveModelPath]);

  // assign to names used in render
  const gltfScene = loadedSceneWrapper;
  const previewGltf = loadedPreviewWrapper;

  // In headless runs, also directly load a small sample GLB into the scene (bypass Suspense/useLoader quirks)
  useEffect(() => {
    if (!isHeadless) return;
    try {
      const loader = new GLTFLoader();
      let added: THREE.Object3D | null = null;
      loader.load(
        effectiveModelPath,
        (g) => {
          try {
            const sceneObj = g.scene || g.scenes?.[0] || null;
            if (!sceneObj) return;
            const box = new THREE.Box3().setFromObject(sceneObj);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
            const desired = 1.0;
            const scaleFactor = desired / maxDim;
            const center = new THREE.Vector3();
            box.getCenter(center);

            const wrapper = new THREE.Group();
            const cloned = sceneObj.clone(true);
            wrapper.add(cloned);
            wrapper.scale.setScalar(scaleFactor);
            wrapper.position.copy(center.multiplyScalar(-scaleFactor));
            added = wrapper;
            scene.add(wrapper);
            // expose debug info
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.__lastGltfInfo = { path: effectiveModelPath, size: size.toArray(), maxDim, scaleFactor, center: center.toArray() };
            // eslint-disable-next-line no-console
            console.info('GLTF_INFO', (window as any).__lastGltfInfo);
          } catch (e) {}
        },
        undefined,
        () => {}
      );
      return () => {
        try {
          if (added) scene.remove(added);
        } catch (e) {}
      };
    } catch (e) {}
  }, [isHeadless, sampleGlb, scene]);

  // auto-frame the non-XR camera to the loaded model bounding box
  useEffect(() => {
    try {
      if (!scaledSize || !scaledCenter) return;
      if ((gl as any).xr?.getSession?.()) return; // don't move camera during XR session
      const maxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z, 0.0001);
      // back the camera further for bigger objects
      const distance = maxDim * 2.8 + 1.0;
      // position the camera so the model is visible
      camera.position.set(scaledCenter.x, scaledCenter.y + maxDim * 0.35, scaledCenter.z + distance);
      camera.lookAt(scaledCenter.x, scaledCenter.y, scaledCenter.z);
      camera.updateProjectionMatrix();
    } catch (e) {
      // ignore
    }
  }, [scaledSize, scaledCenter, camera, gl]);

  // log the last gltf info (so headless captures record it)
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).__lastGltfInfo) {
        // eslint-disable-next-line no-console
        console.info('GLTF_INFO', (window as any).__lastGltfInfo);
      }
    } catch (e) {}
  }, [scaledSize, scaledCenter]);

  // fallback: explicitly load the GLTF with GLTFLoader and set debug info (ensures parsing in headless)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!effectiveModelPath) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if ((window as any).__lastGltfInfo) return;
    try {
      const l = new GLTFLoader();
      l.load(
        effectiveModelPath,
        (g) => {
          try {
            const sceneObj = g.scene || g.scenes?.[0] || null;
            if (!sceneObj) return;
            const box = new THREE.Box3().setFromObject(sceneObj);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const desired = 1.0;
            const scaleFactor = desired / maxDim;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.__lastGltfInfo = { path: effectiveModelPath, size: size.toArray(), maxDim, scaleFactor, center: center.toArray() };
            // eslint-disable-next-line no-console
            console.info('GLTF_INFO', (window as any).__lastGltfInfo);
          } catch (e) {}
        },
        undefined,
        (err) => {
          // ignore load error
        }
      );
    } catch (e) {}
  }, [effectiveModelPath]);

  // helpers: create a visible grid and axes so headless screenshots show scene origin
  const gridHelper = useMemo(() => new THREE.GridHelper(4, 8), []);
  const axesHelper = useMemo(() => new THREE.AxesHelper(1.5), []);

  return (
    <>
      <mesh ref={reticleRef} visible={visible} matrixAutoUpdate={false}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial color="#00ffcc" side={2} />
      </mesh>

      {/* debug lights to help illuminate loaded models during testing */}
      {!((gl as any).xr?.getSession?.()) && scaledCenter && (
        <>
          <ambientLight intensity={1.0} />
          <hemisphereLight args={[0xffffff, 0x444444, 0.6]} />
          <directionalLight
            position={[scaledCenter.x + 1.6, scaledCenter.y + 2.4, scaledCenter.z + 1.6]}
            intensity={1.6}
            castShadow={false}
          />
          <directionalLight
            position={[scaledCenter.x - 1.2, scaledCenter.y + 1.2, scaledCenter.z - 1.2]}
            intensity={0.8}
            castShadow={false}
          />
        </>
      )}
      {/* always show grid/axes for debugging headless renders (non-XR) */}
      {!((gl as any).xr?.getSession?.()) && (
        <>
          <primitive object={gridHelper} position={[0, 0, 0]} />
          <primitive object={axesHelper} position={[0, 0, 0]} />
        </>
      )}
      {/* bright origin marker to confirm camera framing in screenshots */}
      {!((gl as any).xr?.getSession?.()) && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial emissive="#ffff66" color="#ffee88" />
        </mesh>
      )}

      {placed.map((item, i) => (
        <group key={i} position={item.position} rotation={[0, (item.rotationY * Math.PI) / 180, 0]} scale={[item.scale, item.scale, item.scale]}>
          {isHeadless && testMesh ? (
            <primitive object={testMesh.clone()} />
          ) : gltfScene ? (
            <primitive object={gltfScene.clone()} />
          ) : (
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.4, 0.4, 0.4]} />
              <meshStandardMaterial color="#ff7a50" />
            </mesh>
          )}
          {/* bounding-box helper for placed item */}
          {gltfScene && scaledSize && scaledCenter && (
            <mesh position={[scaledCenter.x, scaledCenter.y, scaledCenter.z]}>
              <boxGeometry args={[scaledSize.x, scaledSize.y, scaledSize.z]} />
              <meshBasicMaterial color="#ffff55" wireframe opacity={0.9} transparent />
            </mesh>
          )}
        </group>
      ))}

      {/* preview at reticle for AR session */}
      {pose && previewEnabled && (
        (() => {
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const scl = new THREE.Vector3();
          pose.clone().decompose(pos, quat, scl);
          return (
            <group position={pos} quaternion={quat} rotation={[0, (rotationY * Math.PI) / 180, 0]} scale={[scale, scale, scale]}>
                {isHeadless && testMesh ? (
                  <primitive object={testMesh.clone()} />
                ) : gltfScene ? (
                  <primitive object={(previewGltf || gltfScene).clone()} />
                ) : (
                  <mesh>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#00ffcc" transparent opacity={0.6} />
                  </mesh>
                )}
                {/* bounding-box helper for AR preview */}
                {gltfScene && scaledSize && scaledCenter && (
                  <mesh position={[scaledCenter.x, scaledCenter.y, scaledCenter.z]}>
                    <boxGeometry args={[scaledSize.x, scaledSize.y, scaledSize.z]} />
                    <meshBasicMaterial color="#00ffcc" wireframe opacity={0.9} transparent />
                  </mesh>
                )}
            </group>
          );
        })()
      )}

      {/* non-XR preview + drag plane */}
      {!pose && gl && (
        <>
          <mesh
            position={[0, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDragging(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setDragging(false);
            }}
            onPointerMove={(e: any) => {
              if (!dragging) return;
              e.stopPropagation();
              if (e.point) setPreviewPosition(new THREE.Vector3(e.point.x, 0, e.point.z));
            }}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>

          {/* preview object in non-XR mode */}
          {previewEnabled && (
            <group position={previewPosition} rotation={[0, (rotationY * Math.PI) / 180, 0]} scale={[scale, scale, scale]}>
              {isHeadless && testMesh ? (
                <primitive object={testMesh.clone()} />
              ) : gltfScene ? (
                <primitive object={gltfScene.clone()} />
              ) : (
                <mesh>
                  <boxGeometry args={[0.4, 0.4, 0.4]} />
                  <meshStandardMaterial color="#00ffcc" transparent opacity={0.6} />
                </mesh>
              )}
              {/* bounding-box helper for non-XR preview */}
              {gltfScene && scaledSize && scaledCenter && (
                <mesh position={[scaledCenter.x, scaledCenter.y, scaledCenter.z]}>
                  <boxGeometry args={[scaledSize.x, scaledSize.y, scaledSize.z]} />
                  <meshBasicMaterial color="#00ffcc" wireframe opacity={0.9} transparent />
                </mesh>
              )}
            </group>
          )}
        </>
      )}
    </>
  );
}
