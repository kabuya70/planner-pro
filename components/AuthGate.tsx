"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const publicRoutes = ["/login", "/register"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (!active) return;

      if (!session && !isPublicRoute) {
        router.replace("/login");
        return;
      }

      if (session && isPublicRoute) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (!session && !isPublicRoute) {
        router.replace("/login");
        return;
      }

      if (session && isPublicRoute) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-scréen items-center justify-center bg-[#030712] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-5 text-sm text-white/45">
          Vérification de la session...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

