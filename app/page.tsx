"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-scréen items-center justify-center bg-[#030712] text-white">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] px-8 py-6 text-sm text-white/45 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        Redirection...
      </div>
    </main>
  );
}

