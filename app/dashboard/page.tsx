"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  FolderKanban,
  ArrowUpRight,
  Circle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function dateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: tasksData } = await supabase.from("tasks").select("*");
    const { data: projectsData } = await supabase.from("projects").select("*");

    setTasks(tasksData || []);
    setProjects(projectsData || []);
  }

  async function toggleTask(task: any) {
    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    loadData();
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const remaining = tasks.filter((t) => !t.done).length;
  const urgent = tasks.filter((t) => t.priority === "Urgent" && !t.done).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const upcoming = tasks
    .filter((t) => !t.done)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .slice(0, 4);

  const nextTask = upcoming[0];

  const chartData = useMemo(() => {
    const monday = startOfWeek(new Date());

    return weekDays.map((label, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      const key = dateKey(day);

      const planned = tasks.filter((t) => t.date === key).length;
      const done = tasks.filter((t) => t.date === key && t.done).length;

      return {
        day: label,
        prévues: planned,
        accomplies: done,
      };
    });
  }, [tasks]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex overflow-hidden">
      <Sidebar />

      <section className="flex-1 p-6 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
              Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Bonjour Raïs
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Vue d’ensemble de ta journée, tes tâches et tes projets.
            </p>
          </div>

          <Link
            href="/tasks"
            className="soft-button rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white backdrop-blur-2xl hover:bg-white/[0.09]"
          >
            + Nouvelle tâche
          </Link>
        </header>

        <div className="mb-6 grid grid-cols-4 gap-4">
          <ProgressCard progress={progress} completed={completed} total={total} />

          <GlassStat
            icon={<CalendarDays size={18} />}
            label="Prochaine tâche"
            value={nextTask?.name || "Aucune"}
            sub={
              nextTask
                ? `${nextTask.date || "Sans date"} · ${
                    nextTask.start_time || nextTask.hour || "--:--"
                  }`
                : "Planning libre"
            }
          />

          <GlassStat
            icon={<AlertTriangle size={18} />}
            label="Urgentes"
            value={urgent}
            sub="À traiter rapidement"
          />

          <GlassStat
            icon={<CheckCircle2 size={18} />}
            label="Terminées"
            value={completed}
            sub={`${remaining} restantes`}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <section className="glass-card rounded-[24px] p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Aperçu semaine</h2>
              <p className="text-xs text-white/40">
                Tâches prévues vs tâches accomplies
              </p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(255,255,255,0.35)"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.35)"
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(3,7,18,0.92)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 16,
                      color: "white",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="prévues"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accomplies"
                    stroke="rgba(255,255,255,0.32)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex gap-5 text-xs text-white/40">
              <span>● Prévues</span>
              <span>● Accomplies</span>
            </div>
          </section>

          <section className="glass-card rounded-[24px] p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Prochaines échéances</h2>
              <p className="text-xs text-white/40">
                Clique pour valider une tâche
              </p>
            </div>

            <div className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-white/35">Aucune tâche restante.</p>
              ) : (
                upcoming.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task)}
                    className="w-full rounded-2xl border border-white/8 bg-black/20 p-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <Circle size={18} className="text-white/35" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {task.name}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {task.date || "Sans date"} ·{" "}
                          {task.start_time || task.hour || "--:--"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="glass-card rounded-[24px] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Projets récents</h2>
                <p className="text-xs text-white/40">Avancement global</p>
              </div>

              <Link href="/projects">
                <ArrowUpRight size={18} className="text-white/35 hover:text-white" />
              </Link>
            </div>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-sm text-white/35">Aucun projet.</p>
              ) : (
                projects.slice(0, 4).map((project) => {
                  const projectTasks = tasks.filter(
                    (t) => t.project_id === project.id
                  );
                  const done = projectTasks.filter((t) => t.done).length;
                  const projectProgress =
                    projectTasks.length > 0
                      ? Math.round((done / projectTasks.length) * 100)
                      : 0;

                  return (
                    <div key={project.id} className="rounded-2xl bg-black/20 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderKanban size={15} className="text-white/45" />
                          <p className="text-sm font-semibold">{project.name}</p>
                        </div>
                        <span className="text-xs text-white/35">
                          {projectProgress}%
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-white/45"
                          style={{ width: `${projectProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function GlassStat({ icon, label, value, sub }: any) {
  return (
    <div className="glass-card rounded-[24px] p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
        {icon}
      </div>
      <p className="text-xs text-white/38">{label}</p>
      <h2 className="mt-2 truncate text-2xl font-semibold">{value}</h2>
      <p className="mt-2 text-xs text-white/32">{sub}</p>
    </div>
  );
}

function ProgressCard({ progress, completed, total }: any) {
  return (
    <div className="glass-card rounded-[24px] p-5">
      <p className="text-xs text-white/38">Progression</p>

      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(rgba(255,255,255,.7) ${
              progress * 3.6
            }deg, rgba(255,255,255,.08) 0deg)`,
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#030712]">
            <span className="text-lg font-semibold">{progress}%</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            {completed}/{total}
          </h2>
          <p className="mt-1 text-xs text-white/35">tâches terminées</p>
        </div>
      </div>
    </div>
  );
}