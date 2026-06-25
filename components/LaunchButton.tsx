"use client";

import { useRouter } from "next/navigation";

export default function LaunchButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/ar")}
      className="rounded-full bg-black px-8 py-4 text-white text-lg font-semibold hover:scale-105 transition"
    >
      Launch AR
    </button>
  );
}