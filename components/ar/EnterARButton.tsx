"use client";

import { useState } from "react";
import ModelViewerFallback from "./ModelViewerFallback";

type Props = {
  selectedModel?: string | null;
};

export default function EnterARButton({ selectedModel }: Props) {
  const [busy, setBusy] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const handle = async () => {
    try {
      setBusy(true);
      // Prefer the renderer starter if available
      // @ts-ignore
      if (typeof window !== "undefined" && window.__startXR) {
        // @ts-ignore
        await window.__startXR();
        return;
      }

      // Fallback: try to start a session directly
      // @ts-ignore
      if (navigator.xr && navigator.xr.isSessionSupported) {
        // @ts-ignore
        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        if (!supported) {
          // show model-viewer fallback instead of alert
          setShowFallback(true);
          return;
        }

        // @ts-ignore
        const session = await navigator.xr.requestSession("immersive-ar", {
          requiredFeatures: ["local-floor", "hit-test"],
        });

        if (session) {
          alert("AR session started (session created). Integrate renderer.xr.setSession to render AR view.");
        }
      } else {
        // WebXR API not present — show fallback
        setShowFallback(true);
      }
    } catch (e: any) {
      alert("Failed to start AR session: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="absolute bottom-6 right-6 z-40">
        <button
          onClick={handle}
          disabled={busy}
          className="rounded-full bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition disabled:opacity-60"
        >
          {busy ? "Starting AR..." : "Enter AR"}
        </button>
      </div>
      {showFallback && (
        <ModelViewerFallback src={selectedModel ? `/models/${selectedModel}` : null} onClose={() => setShowFallback(false)} />
      )}
    </>
  );
}
