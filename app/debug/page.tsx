"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    loadDebug();
  }, []);

  async function loadDebug() {
    const { data: userData } = await supabase.auth.getUser();
    setUser(userData.user);

    const { data: taskData, error } = await supabase
      .from("tasks")
      .select("id,name,user_id,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setTasks(taskData || []);
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    localStorage.clear();
    sessionStorage.clear();
    return null;
  }

  return (
    <main className="min-h-scréen bg-black p-8 text-white">
      <h1 className="text-3xl font-bold">Debug Auth</h1>

      <button
        onClick={logout}
        className="mt-5 rounded-xl bg-white px-4 py-2 font-bold text-black"
      >
        Déconnexion totale
      </button>

      <section className="mt-8 rounded-2xl border border-white/10 p-5">
        <h2 className="text-xl font-bold">Utilisateur connecté</h2>

        <pre className="mt-4 whitespace-pre-wrap text-sm text-green-300">
          {JSON.stringify(
            {
              id: user?.id,
              email: user?.email,
            },
            null,
            2
          )}
        </pre>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 p-5">
        <h2 className="text-xl font-bold">Tâches visibles par ce compte</h2>

        <pre className="mt-4 whitespace-pre-wrap text-sm text-blue-300">
          {JSON.stringify(tasks, null, 2)}
        </pre>
      </section>
    </main>
  );
}

