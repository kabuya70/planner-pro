"use client";

import { createClient } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const publicRoutes = ["/login", "/register"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      if (!session && !isPublicRoute) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      if (session && isPublicRoute) {
        router.replace("/dashboard");
        setChecking(false);
        return;
      }

      setChecking(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      if (!session && !isPublicRoute) {
        router.replace("/login");
      }

      if (session && isPublicRoute) {
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] px-8 py-6 text-sm text-white/45 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          Vérification de la session...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}