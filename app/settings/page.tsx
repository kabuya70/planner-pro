"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  User,
  Palette,
  Bell,
  CircleHelp,
  Shield,
  ChevronRight,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const settingsItems = [
  {
    title: "Profil",
    description: "Modifier ton nom affiché, ta profession et voir ton compte.",
    href: "/settings/profil",
    icon: User,
  },
  {
    title: "Apparence",
    description: "Choisir le thème visuel de l'application.",
    href: "/settings/apparence",
    icon: Palette,
  },
  {
    title: "Notifications",
    description: "Gérer les rappels et préférences de notification.",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "FAQ",
    description: "Comprendre le fonctionnement de Planner Pro.",
    href: "/settings/faq",
    icon: CircleHelp,
  },
  {
    title: "Sécurité",
    description: "Gérer ta session et te déconnecter.",
    href: "/settings/securite",
    icon: Shield,
  },
];

export default function SettingsPage() {
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

  return (
    <main className="min-h-scréen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 px-8 py-10">
        <div className="mx-auto max-w-[760px]">
          <header className="mb-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">
              Paramètres
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Réglages
            </h1>

            <p className="mx-auto mt-3 max-w-[560px] text-sm leading-6 text-white/45">
              Configure ton compte, ton apparence, tes notifications et les options de sécurité.
            </p>
          </header>

          <Link
            href="/settings/profil"
            className="mb-8 flex items-center justify-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.06]"
          >
            <div className="flex h-[66px] w-[66px] items-center justify-center rounded-[22px] border border-white/10 bg-white text-2xl font-black text-black shadow-2xl shadow-black/30">
              {initials}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{userName}</h2>

              <p className="mt-1 truncate text-sm text-white/40">
                {userEmail || "Compte personnel"}
              </p>
            </div>
          </Link>

          <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="space-y-2">
              {settingsItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between rounded-[22px] px-4 py-4 transition hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/65 transition group-hover:border-white/20 group-hover:bg-white/[0.07] group-hover:text-white">
                        <Icon size={18} />
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-white/35">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-white/25 transition group-hover:translate-x-1 group-hover:text-white"
                    />
                  </Link>
                );
              })}
            </div>
          </section>

          <p className="mt-6 text-center text-xs leading-5 text-white/30">
            Les préférences sont sauvegardées progressivement. Les thèmes et notifications sont stockés localement pour l'instant.
          </p>
        </div>
      </section>
    </main>
  );
}

