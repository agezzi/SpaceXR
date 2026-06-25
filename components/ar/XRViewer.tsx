"use client";

import { useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "@/components/three/Scene";
import DeviceCheck from "./DeviceCheck";
import LoadingScreen from "./LoadingScreen";
import EnterARButton from "./EnterARButton";
import { useRef } from "react";
import ARPlacement from "./ARPlacement";
import ModelSelector from "./ModelSelector";
import ProductOverlay from "./ProductOverlay";
import { Suspense } from "react";

export default function XRViewer() {
	const [stage, setStage] = useState<"check" | "loading" | "ready">("check");
	const [selectedModel, setSelectedModel] = useState<string>("Modern_arm_chair_02_4k.glb");
	const sessionStarterRef = useRef<(() => Promise<void>) | null>(null);
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
							<Suspense fallback={null}>
								<Scene />
								<ARPlacement selectedModel={selectedModel} scale={placementScale} rotationY={placementRotation} previewEnabled={previewEnabled} onPlacedCountChange={(c) => setPlacedCount(c)} />
							</Suspense>
							<OrbitControls enablePan={false} minDistance={2} maxDistance={8} />
							<XRSetup />
						</Canvas>
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
					<EnterARButton selectedModel={selectedModel} />
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

function XRSetup() {
	const { gl } = useThree();

	// expose a starter function which requests an AR session and sets it on the renderer
	const starter = async () => {
		// @ts-ignore
		if (!navigator.xr || !navigator.xr.requestSession) throw new Error("WebXR not available");
		try {
			// enable XR on the renderer
			// @ts-ignore
			gl.xr.enabled = true;
			// request session
			// @ts-ignore
			const session = await navigator.xr.requestSession("immersive-ar", {
				requiredFeatures: ["local-floor", "hit-test"],
			});
			// @ts-ignore
			await gl.xr.setSession(session);
		} catch (e) {
			console.error("Failed to start XR session:", e);
			throw e;
		}
	};

	// provide starter globally so overlay buttons can call it
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	if (typeof window !== "undefined") window.__startXR = starter;

	return null;
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
