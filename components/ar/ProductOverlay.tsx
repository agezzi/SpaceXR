"use client";

import React from "react";

type Props = {
  modelName: string | null;
  scale: number;
  rotation: number;
  preview: boolean;
  placedCount: number;
  onScaleChange: (s: number) => void;
  onRotationChange: (r: number) => void;
  onTogglePreview: () => void;
  onClearPlaced: () => void;
};

export default function ProductOverlay({ modelName, scale, rotation, preview, placedCount, onScaleChange, onRotationChange, onTogglePreview, onClearPlaced }: Props) {
  const displayName = modelName ? modelName.replace(/\.glb?$|\.gltf?$/i, "") : "Select a model";

  return (
    <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 60, width: 320 }}>
      <div className="bg-white/5 backdrop-blur rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm text-gray-200">{displayName}</div>
            <div className="text-xs text-gray-400">Placed: {placedCount}</div>
          </div>
          <div>
            <button onClick={onClearPlaced} className="px-2 py-1 bg-red-600 rounded text-xs">Clear</button>
          </div>
        </div>

        <div className="mb-2">
          <label className="text-xs text-gray-300">Scale: {scale.toFixed(2)}</label>
          <input
            className="w-full"
            type="range"
            min="0.1"
            max="3"
            step="0.01"
            value={scale}
            onChange={(e) => onScaleChange(Number(e.target.value))}
          />
        </div>

        <div className="mb-2 flex items-center gap-2">
          <label className="text-xs text-gray-300">Rotation: {Math.round(rotation)}°</label>
          <div className="ml-auto flex gap-2">
            <button onClick={() => onRotationChange(rotation - 15)} className="px-2 py-1 bg-white/10 rounded">-15°</button>
            <button onClick={() => onRotationChange(rotation + 15)} className="px-2 py-1 bg-white/10 rounded">+15°</button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <button onClick={onTogglePreview} className="px-3 py-2 rounded bg-blue-600">{preview ? 'Hide Preview' : 'Show Preview'}</button>
          <a href="#" className="text-xs text-gray-300">Details</a>
        </div>
      </div>
    </div>
  );
}
