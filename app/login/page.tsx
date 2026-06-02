"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  }

  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center text-white p-6">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.05] p-8 text-center">
        <h1 className="text-4xl font-bold mb-3">Planner Pro</h1>
        <p className="text-white/45 mb-8">
          Connecte-toi pour accéder à ton planning.
        </p>

        <button
          onClick={loginWithGoogle}
          className="w-full rounded-2xl bg-white text-black py-4 font-semibold hover:bg-white/90 transition"
        >
          Continuer avec Google
        </button>
      </div>
    </main>
  );
}