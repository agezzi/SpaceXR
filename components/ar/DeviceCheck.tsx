"use client";

import { useEffect, useState } from "react";

export default function DeviceCheck({ onContinue }: { onContinue: () => void }) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const xr = navigator?.xr;
        if (xr) {
          if (typeof xr.isSessionSupported === "function") {
            const ok = await xr.isSessionSupported("immersive-ar");
            if (mounted) setSupported(Boolean(ok));
          } else if (typeof xr.requestSession === "function") {
            if (mounted) setSupported(true);
          } else {
            if (mounted) setSupported(false);
          }
        } else {
          if (mounted) setSupported(false);
        }
      } catch (e) {
        if (mounted) setSupported(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-white/95 p-6 rounded-lg shadow-lg max-w-sm text-center">
        <h3 className="text-lg font-semibold">Prepare to enter AR</h3>
        <p className="mt-2 text-sm text-gray-600">
          {supported === null
            ? "Checking device capabilities..."
            : supported
            ? "This device appears to support WebXR AR."
            : "WebXR AR not detected. You can still view the 3D scene."}
        </p>
        <div className="mt-4 flex justify-center">
          <button
            onClick={onContinue}
            className="rounded-full bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
