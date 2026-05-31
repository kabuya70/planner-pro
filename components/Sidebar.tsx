"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Settings,
  Repeat,
} from "lucide-react";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/calendar", icon: Calendar, label: "Calendrier" },
  { href: "/tasks", icon: CheckSquare, label: "Tâches" },
  { href: "/habits", icon: Repeat, label: "Habitudes" },
  { href: "/projects", icon: FolderKanban, label: "Projets" },
  { href: "/stats", icon: BarChart3, label: "Statistiques" },
  { href: "/settings", icon: Settings, label: "Paramètres" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="m-4 mr-0 h-[calc(100vh-32px)] w-60 rounded-[28px] glass flex flex-col">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-xl font-black tracking-tight">Planner Pro</h1>
        <p className="mt-1 text-[11px] text-slate-400">Smart productivity</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1.5 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold transition soft-button ${
                active
                  ? "bg-white text-slate-950 shadow-lg"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm font-bold">Raïs</p>
          <p className="text-[11px] text-slate-500">Compte personnel</p>
        </div>
      </div>
    </aside>
  );
}