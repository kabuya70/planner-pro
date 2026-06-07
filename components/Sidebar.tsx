"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Settings,
  Repeat,
  User,
} from "lucide-react";

const SIDEBAR_WIDTH = 256;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const items = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/calendar", icon: Calendar, label: "Calendrier" },
  { href: "/tasks", icon: CheckSquare, label: "Tâches" },
  { href: "/habits", icon: Repeat, label: "Habitudes" },
  { href: "/projects", icon: FolderKanban, label: "Projets" },
  { href: "/stats", icon: BarChart3, label: "Asistance IA" },
  { href: "/settings", icon: Settings, label: "Paramètres" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [userName, setUserName] = useState("Utilisateur");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setUserName("Utilisateur");
      setUserEmail("");
      return;
    }

    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "";

    setUserName(displayName || user.email?.split("@")[0] || "Utilisateur");
    setUserEmail(user.email || "");
  }

  const initials = useMemo(() => {
    const clean = userName.trim();

    if (!clean) return "U";

    const parts = clean.split(" ").filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return clean.slice(0, 1).toUpperCase();
  }, [userName]);

  function handleWheel(e: React.WheelEvent<HTMLElement>) {
    window.scrollBy({
      top: e.deltaY,
      behavior: "auto",
    });
  }

  return (
    <>
      <div className="shrink-0" style={{ width: SIDEBAR_WIDTH + 32 }} />

      <aside
        onWheel={handleWheel}
        className="sidebar-glass fixed left-4 top-4 z-50 flex h-[calc(100vh-32px)] w-60 flex-col overflow-hidden rounded-[28px] border border-white/10"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 70px rgba(0,0,0,0.42)",
        }}
      >
        <div className="relative border-b border-white/10 p-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent opacity-70" />

          <div className="relative z-10">
            <h1 className="text-xl font-black tracking-tight text-white">
              KR Productivity
            </h1>

            <p className="mt-1 text-[11px] text-white/35">
              Smart productivity
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-hidden px-3 py-4">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative mb-1.5 flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-300 ${
                  active
                    ? "border-white/15 bg-white/[0.105] text-white shadow-inner shadow-white/5"
                    : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.065] hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-white/70" />
                )}

                <Icon
                  size={17}
                  className={`relative z-10 transition ${
                    active
                      ? "text-white"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                />

                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/settings/profil"
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-inner shadow-white/5 backdrop-blur-2xl transition hover:border-white/20 hover:bg-white/[0.075]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white text-sm font-black text-black">
              {initials || <User size={16} />}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {userName}
              </p>

              <p className="truncate text-[11px] text-white/35">
                {userEmail || "Compte personnel"}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}