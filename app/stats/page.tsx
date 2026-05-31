"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Clock3, Target, Flame } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const periods = ["Aujourd’hui", "Semaine", "Mois"] as const;

export default function StatsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [period, setPeriod] = useState<(typeof periods)[number]>("Semaine");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: tasksData } = await supabase.from("tasks").select("*");
    const { data: projectsData } = await supabase.from("projects").select("*");

    setTasks(tasksData || []);
    setProjects(projectsData || []);
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const productiveTime = completed * 45;
  const hours = Math.floor(productiveTime / 60);
  const minutes = productiveTime % 60;

  const priorityStats = [
    { label: "Urgente", color: "bg-red-500", value: tasks.filter((t) => t.priority === "Urgent").length },
    { label: "Importante", color: "bg-yellow-500", value: tasks.filter((t) => t.priority === "Important").length },
    { label: "Normale", color: "bg-blue-500", value: tasks.filter((t) => !t.priority || t.priority === "Normal").length },
    { label: "Basse", color: "bg-slate-500", value: tasks.filter((t) => t.priority === "Basse").length },
  ];

  const activity = useMemo(() => {
    if (period === "Aujourd’hui") {
      return ["08h", "10h", "12h", "14h", "16h", "18h"].map((label, i) => ({
        label,
        value: [2, 4, 1, 5, 3, 2][i],
      }));
    }

    if (period === "Mois") {
      return ["S1", "S2", "S3", "S4"].map((label, i) => ({
        label,
        value: [6, 10, 8, 12][i],
      }));
    }

    return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((label, i) => ({
      label,
      value: [5, 9, 4, 7, 10, 6, 3][i],
    }));
  }, [period]);

  return (
    <main className="min-h-screen bg-[#020617] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-400">Statistiques</p>
            <h1 className="text-4xl font-black mt-1">Statistiques</h1>
            <p className="text-slate-400 mt-2">
              Analyse tes tâches, projets et priorités.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-1 flex">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  period === p ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-4 gap-5 mb-8">
          <Kpi icon={<CheckCircle2 />} label="Tâches terminées" value={completed} sub="+12%" />
          <Kpi icon={<Clock3 />} label="Temps productif" value={`${hours}h ${minutes}m`} sub="+8%" />
          <Kpi icon={<Target />} label="Taux de réussite" value={`${successRate}%`} sub="+5%" />
          <Kpi icon={<Flame />} label="Série de jours" value="7" sub="+2" />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <section className="rounded-3xl bg-slate-900/80 border border-white/10 p-6">
            <h2 className="text-xl font-black mb-1">Tâches par période</h2>
            <p className="text-sm text-slate-400 mb-8">{period}</p>

            <div className="h-72 grid gap-4 items-end" style={{ gridTemplateColumns: `repeat(${activity.length}, 1fr)` }}>
              {activity.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-3">
                  <div className="w-full h-60 flex items-end rounded-xl bg-slate-800/70 overflow-hidden">
                    <div
                      className="w-full rounded-t-xl bg-blue-600"
                      style={{ height: `${Math.max(item.value * 8, 12)}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-slate-900/80 border border-white/10 p-6">
            <h2 className="text-xl font-black mb-1">Répartition par priorité</h2>
            <p className="text-sm text-slate-400 mb-8">Basée sur tes tâches</p>

            <div className="flex items-center gap-10">
              <div
                className="h-56 w-56 rounded-full"
                style={{
                  background:
                    "conic-gradient(#ef4444 0 30%, #eab308 30% 65%, #2563eb 65% 90%, #64748b 90% 100%)",
                }}
              >
                <div className="h-full w-full flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-[#020617]" />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {priorityStats.map((item) => {
                  const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

                  return (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${item.color}`} />
                        <p>{item.label}</p>
                      </div>
                      <p className="text-slate-400">{percent}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl bg-slate-900/80 border border-white/10 p-6">
          <h2 className="text-xl font-black mb-1">Statistiques par projet</h2>
          <p className="text-sm text-slate-400 mb-6">
            Prend en compte les tâches liées à chaque projet.
          </p>

          <div className="grid grid-cols-3 gap-5">
            {projects.length === 0 ? (
              <p className="text-slate-500">Aucun projet pour le moment.</p>
            ) : (
              projects.map((project) => {
                const projectTasks = tasks.filter((t) => t.project_id === project.id);
                const done = projectTasks.filter((t) => t.done).length;
                const progress =
                  projectTasks.length > 0
                    ? Math.round((done / projectTasks.length) * 100)
                    : 0;

                return (
                  <div key={project.id} className="rounded-2xl bg-slate-950 border border-white/10 p-5">
                    <h3 className="font-black">{project.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {done}/{projectTasks.length} tâches terminées
                    </p>

                    <div className="mt-5 h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="text-sm text-slate-400 mt-2">{progress}%</p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  sub: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-900/80 border border-white/10 p-6">
      <div className="text-blue-400 mb-5">{icon}</div>
      <p className="text-sm text-slate-400">{label}</p>
      <h2 className="text-4xl font-black mt-3">{value}</h2>
      <p className="text-sm text-green-400 mt-3">{sub}</p>
    </div>
  );
}