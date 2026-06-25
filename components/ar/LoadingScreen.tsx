"use client";

export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent border-white" />
        <p className="text-white">Loading AR viewer...</p>
      </div>
    </div>
  );
}
