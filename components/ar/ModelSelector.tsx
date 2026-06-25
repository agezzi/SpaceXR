"use client";

import React from "react";

type Props = {
  models: string[];
  selected: string | null;
  onSelect: (m: string) => void;
};

export default function ModelSelector({ models, selected, onSelect }: Props) {
  return (
    <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8, zIndex: 50 }}>
      {models.map((m) => {
        const name = m.replace(/\\.glb?$|\\.gltf?$/i, "");
        const thumbCandidates = [`/models/${name}.png`, `/models/${name}.webp`, `/${name}.png`, `/${name}.webp`];
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className={
              "flex items-center gap-2 px-3 py-1 rounded shadow-sm text-sm " + (selected === m ? "bg-white text-black" : "bg-black text-white/90")
            }
          >
            <img
              src={thumbCandidates[0]}
              onError={(e) => {
                // try next candidate
                const el = e.currentTarget as HTMLImageElement;
                const next = thumbCandidates.find((p) => p !== el.src) || thumbCandidates[0];
                el.src = next;
              }}
              alt={name}
              style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }}
            />
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
