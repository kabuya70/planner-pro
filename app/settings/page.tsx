"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  User,
  Bell,
  Palette,
  Shield,
  LogOut,
  Save,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState("Sombre");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }

    loadUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function saveSettings() {
    setMessage("Paramètres sauvegardés.");
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <header className="mb-8">
          <p className="text-sm font-semibold text-blue-400">Paramètres</p>
          <h1 className="text-4xl font-black mt-1">Réglages du compte</h1>
          <p className="text-slate-400 mt-2">
            Gère ton profil, les notifications et les préférences de ton planner.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-6">
          <section className="col-span-2 space-y-6">
            <Card
              icon={<User />}
              title="Profil utilisateur"
              description="Informations liées à ton compte connecté."
            >
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" value={user?.email || ""} readOnly />
                <Input
                  label="Identifiant utilisateur"
                  value={user?.id || ""}
                  readOnly
                />
              </div>
            </Card>

            <Card
              icon={<Bell />}
              title="Notifications"
              description="Active ou désactive les rappels de ton planner."
            >
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 border border-white/10 p-4">
                <div>
                  <p className="font-bold">Notifications navigateur</p>
                  <p className="text-sm text-slate-500">
                    Recevoir une alerte avant une tâche.
                  </p>
                </div>

                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`h-8 w-14 rounded-full p-1 transition ${
                    notifications ? "bg-blue-600" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full bg-white transition ${
                      notifications ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </Card>

            <Card
              icon={<Palette />}
              title="Apparence"
              description="Préférences visuelles de l'application."
            >
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option>Sombre</option>
                <option>Clair</option>
                <option>Système</option>
              </select>
            </Card>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <div className="h-20 w-20 rounded-3xl bg-blue-600 flex items-center justify-center text-3xl font-black mb-5">
                {user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <h2 className="text-xl font-black">
                {user?.email || "Utilisateur"}
              </h2>

              <p className="text-sm text-slate-500 mt-2">
                Compte connecté à Supabase.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <Shield className="text-blue-400 mb-4" />
              <h2 className="text-xl font-black">Sécurité</h2>
              <p className="text-sm text-slate-500 mt-2">
                Ton compte est protégé par Supabase Auth.
              </p>
            </div>

            <button
              onClick={saveSettings}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500 transition flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Sauvegarder
            </button>

            <button
              onClick={logout}
              className="w-full rounded-2xl bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20 transition flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Déconnexion
            </button>

            {message && (
              <p className="rounded-2xl bg-green-500/10 text-green-400 p-3 text-sm text-center">
                {message}
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="text-blue-400">{icon}</div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function Input({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm text-slate-400">{label}</p>
      <input
        value={value}
        readOnly={readOnly}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none text-slate-300"
      />
    </label>
  );
}