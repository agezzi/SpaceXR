"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string | null;
  onClose: () => void;
};

export default function ModelViewerFallback({ src, onClose }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).modelViewerScriptLoaded) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
    s.onload = () => {
      (window as any).modelViewerScriptLoaded = true;
    };
    document.head.appendChild(s);
    return () => {};
  }, []);

  if (!src) return null;

  const base = src.replace(/^\/+/, "");
  const name = base.split("/").pop() || base;
  const usdzcandidate = src.replace(/\.glb?$|\.gltf?$/i, ".usdz");

  const [hasUSDZ, setHasUSDZ] = useState(false);

  // non-blocking check for USDZ file
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(usdzcandidate, { method: "HEAD" });
        if (!mounted) return;
        if (res.ok) setHasUSDZ(true);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [usdzcandidate]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.92)" }}>
      <div style={{ position: "absolute", right: 12, top: 12 }}>
        <button onClick={onClose} className="px-3 py-1 rounded bg-white/10 text-white">Close</button>
      </div>

      <div style={{ maxWidth: 1100, margin: "64px auto", background: "#0b0b0b", borderRadius: 12, padding: 20 }}>
        <h3 style={{ color: "white", marginBottom: 8 }}>{name}</h3>
        <p style={{ color: "#cfcfcf", marginBottom: 12 }}>Fallback viewer (Scene Viewer / Quick Look) — tap the AR button below to open the native AR viewer on supported devices.</p>

        <div style={{ width: "100%", height: 560, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* @ts-ignore */}
          <model-viewer
            src={src}
            alt={name}
            style={{ width: "100%", height: "100%", borderRadius: 8 }}
            ar
            ar-modes="scene-viewer quick-look webxr"
            environment-image="neutral"
            camera-controls
            auto-rotate
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {hasUSDZ && (
            <a href={usdzcandidate} download className="px-3 py-2 rounded bg-white text-black">
              Download USDZ (iOS Quick Look)
            </a>
          )}
          <a href={src} download className="px-3 py-2 rounded bg-white text-black">Download GLB</a>
        </div>
      </div>
    </div>
  );
}
