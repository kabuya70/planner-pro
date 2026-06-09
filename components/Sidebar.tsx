"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Repeat,
  FolderKanban,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Calendrier",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Tâches",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    label: "Habitudes",
    href: "/habits",
    icon: Repeat,
  },
  {
    label: "Projets",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Assistance IA",
    href: "/stats",
    icon: BarChart3,
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("KAPINGA");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      const user = sessionData.session.user;

      setEmail(user.email || "");

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Utilisateur";

      setDisplayName(String(name).toUpperCase());
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const user = userData.user;

      setEmail(user.email || "");

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Utilisateur";

      setDisplayName(String(name).toUpperCase());
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut({ scope: "global" });

    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        const normalizedKey = key.toLowerCase();

        if (
          key.startsWith("sb-") ||
          normalizedKey.includes("supabase") ||
          normalizedKey.includes("auth")
        ) {
          localStorage.removeItem(key);
        }
      });

      sessionStorage.clear();

      window.location.replace("/login");
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#080d16]/95 text-white shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="border-b border-white/10 px-6 py-7">
        <h1 className="text-2xl font-black tracking-tight">KR Productivity</h1>
        <p className="mt-2 text-sm text-white/35">Smart productivity</p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.label === "Assistance IA" &&
              (pathname === "/stats" || pathname.startsWith("/stats/")));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "border-white/15 bg-white/[0.09] text-white shadow-lg shadow-black/20"
                  : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-sm font-bold text-white/60">
              {displayName.slice(0, 1)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {displayName}
              </p>

              <p className="truncate text-xs text-white/35">
                {email || "Session active"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
        >
          <LogOut size={17} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}