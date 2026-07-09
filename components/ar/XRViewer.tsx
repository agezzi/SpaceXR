"use client";

import { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { OrbitControls } from "@react-three/drei";
import Scene from "@/components/three/Scene";
import DeviceCheck from "./DeviceCheck";
import LoadingScreen from "./LoadingScreen";
import ARPlacement from "./ARPlacement";
import ModelSelector from "./ModelSelector";
import ProductOverlay from "./ProductOverlay";
import { Suspense } from "react";

export default function XRViewer() {
	const [stage, setStage] = useState<"check" | "loading" | "ready">("check");
	const [selectedModel, setSelectedModel] = useState<string>("Modern_arm_chair_02_4k.glb");
	const xrStore = useMemo(() => createXRStore({ domOverlay: false, hitTest: true }), []);
	const [placementScale, setPlacementScale] = useState<number>(1);
	const [placementRotation, setPlacementRotation] = useState<number>(0);
	const [previewEnabled, setPreviewEnabled] = useState<boolean>(true);
	const [placedCount, setPlacedCount] = useState<number>(0);

	const [modelList, setModelList] = useState<string[]>([]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const res = await fetch('/models/index.json');
				if (!mounted) return;
				if (res.ok) {
					const json = await res.json();
					// manifest can be { models: [...] } or an array
					const list = Array.isArray(json) ? json : json.models || [];
					if (list.length > 0) {
						setModelList(list as string[]);
						return;
					}
				}
			} catch (e) {
				// ignore and fallback
			}
			// fallback list
			setModelList(["chair.glb", "sofa.glb"]);
		})();
		return () => { mounted = false };
	}, []);

	// prefetch model files into the browser cache (try /models/ then root)
	useEffect(() => {
		if (!modelList || modelList.length === 0) return;
		for (const name of modelList) {
			const paths = [`/models/${name}`, `/${name}`];
			(async () => {
				for (const p of paths) {
					try {
						await fetch(p, { method: "GET" });
						break;
					} catch (e) {
						// try next
					}
				}
			})();
		}
	}, [modelList]);

	const handleContinue = () => {
		setStage("loading");
		setTimeout(() => setStage("ready"), 700);
	};

	return (
		<div className="relative h-screen w-screen bg-black">
			{stage === "check" && <DeviceCheck onContinue={handleContinue} />}
			{stage === "loading" && <LoadingScreen />}

				{stage === "ready" && (
				<>
						<Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
							<XR store={xrStore}>
								<Suspense fallback={null}>
									<Scene />
									<ARPlacement selectedModel={selectedModel} scale={placementScale} rotationY={placementRotation} previewEnabled={previewEnabled} onPlacedCountChange={(c) => setPlacedCount(c)} />
								</Suspense>
								<OrbitControls enablePan={false} minDistance={2} maxDistance={8} />
							</XR>
						</Canvas>
						<div className="absolute bottom-6 right-6 z-40">
							<button
								className="rounded-full bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition"
								onClick={async () => {
								try {
									await xrStore.enterAR();
								} catch (error) {
									console.error('AR session failed to start:', error);
									alert('AR session failed to start. Please use a compatible browser and allow camera permissions.');
								}
							}}
							>
								Enter AR
							</button>
						</div>
						{/* Model selector overlay (expects models in /public/models/*.glb) */}
					<ModelSelector models={modelList} selected={selectedModel} onSelect={(m) => setSelectedModel(m)} />
					<ProductOverlay
						modelName={selectedModel}
						scale={placementScale}
						rotation={placementRotation}
						preview={previewEnabled}
						placedCount={placedCount}
						onScaleChange={(s) => setPlacementScale(s)}
						onRotationChange={(r) => setPlacementRotation(r)}
						onTogglePreview={() => setPreviewEnabled((v) => !v)}
						onClearPlaced={() => {
							// instruct ARPlacement to clear via global (simple) function
							// @ts-ignore
							if (typeof window !== 'undefined' && window.__clearPlaced) window.__clearPlaced();
							setPlacedCount(0);
						}}
					/>
					{/* DOM overlay: Place button calls the global placement function exposed by ARPlacement */}
					<div style={{ position: "absolute", bottom: 24, right: 24 }}>
						<button
							className="rounded-full bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition"
							onClick={() => {
								// eslint-disable-next-line @typescript-eslint/ban-ts-comment
								// @ts-ignore
								if (typeof window !== "undefined" && window.__placeAtHit) window.__placeAtHit();
							}}
						>
							Place
						</button>
					</div>
				</>
			)}

			{/* debug overlay */}
			<DebugInfo />
		</div>
	);
}


function DebugInfo() {
	const [info, setInfo] = useState<any>(null);
	useEffect(() => {
		let id: any = null;
		const poll = () => {
			// @ts-ignore
			if (typeof window !== 'undefined' && window.__lastGltfInfo) {
				// @ts-ignore
				setInfo(window.__lastGltfInfo);
			}
			id = setTimeout(poll, 1000);
		};
		poll();
		return () => clearTimeout(id);
	}, []);
	if (!info) return null;
	return (
		<div style={{ position: 'absolute', left: 12, top: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: 8, borderRadius: 6, fontSize: 12 }}>
			<div><strong>GLTF Debug</strong></div>
			<div>path: {info.path}</div>
			<div>maxDim: {info.maxDim?.toFixed?.(3) ?? info.maxDim}</div>
			<div>scaleFactor: {info.scaleFactor?.toFixed?.(3) ?? info.scaleFactor}</div>
		</div>
	);
}
