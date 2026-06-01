"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  ArrowUpRight,
  Circle,
  Repeat,
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function isRoutine(task: any) {
  return task.type === "routine" || task.category === "Routine";
}

function routineDone(task: any, logs: any[], key: string) {
  return logs.some(
    (log) => log.task_id === task.id && log.completed_date === key
  );
}

function taskColor(task: any, projects: any[]) {
  const project = projects.find((p) => p.id === task.project_id);
  return project?.color || task.color || "#64748b";
}

function projectName(task: any, projects: any[]) {
  return projects.find((p) => p.id === task.project_id)?.name || null;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [routineLogs, setRoutineLogs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: tasksData } = await supabase.from("tasks").select("*");
    const { data: projectsData } = await supabase.from("projects").select("*");
    const { data: logsData } = await supabase.from("routine_logs").select("*");

    setTasks(tasksData || []);
    setProjects(projectsData || []);
    setRoutineLogs(logsData || []);
  }

  async function toggleTask(task: any) {
    const today = dateKey(new Date());

    if (isRoutine(task)) {
      const existing = routineLogs.find(
        (log) => log.task_id === task.id && log.completed_date === today
      );

      if (existing) {
        await supabase.from("routine_logs").delete().eq("id", existing.id);
      } else {
        await supabase.from("routine_logs").insert({
          task_id: task.id,
          completed_date: today,
        });
      }

      loadData();
      return;
    }

    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    loadData();
  }

  const todayKey = dateKey(new Date());

  const routineTasks = tasks.filter(isRoutine);
  const normalTasks = tasks.filter((t) => !isRoutine(t));

  const todayTasks = tasks.filter((task) => {
    if (isRoutine(task)) return true;
    return task.date === todayKey;
  });

  const completedToday = todayTasks.filter((task) => {
    if (isRoutine(task)) return routineDone(task, routineLogs, todayKey);
    return task.done;
  }).length;

  const totalToday = todayTasks.length;
  const progressToday =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const urgent = todayTasks.filter((task) => {
    const done = isRoutine(task)
      ? routineDone(task, routineLogs, todayKey)
      : task.done;

    return task.priority === "Urgent" && !done;
  }).length;

 const chartData = useMemo(() => {
  const monday = startOfWeek(new Date());

  return weekDays.map((label, index) => {
    const day = addDays(monday, index);
    const key = dateKey(day);

    const dayTasks = tasks.filter(
      (task) =>
        !isRoutine(task) &&
        task.date === key
    );

    const dayRoutines = tasks.filter(isRoutine);

    const tasksPlanned = dayTasks.length;

    const tasksDone = dayTasks.filter(
      (task) => task.done
    ).length;

    const routinesDone = dayRoutines.filter(
      (task) =>
        routineDone(task, routineLogs, key)
    ).length;

    return {
      day: label,

      prévues: tasksPlanned,

      accomplies: tasksDone,

      routines: routinesDone,
    };
  });
}, [tasks, routineLogs]);

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
              Tâches, routines et projets sur une seule vue.
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
          <ProgressCard
            progress={progressToday}
            completed={completedToday}
            total={totalToday}
          />

          <GlassStat
            icon={<Repeat size={18} />}
            label="Routines"
            value={routineTasks.length}
            sub="répétées chaque jour"
          />

          <GlassStat
            icon={<AlertTriangle size={18} />}
            label="Urgentes aujourd’hui"
            value={urgent}
            sub="à traiter rapidement"
          />

          <GlassStat
            icon={<CheckCircle2 size={18} />}
            label="Tâches simples"
            value={normalTasks.length}
            sub="hors routines"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <section className="glass-card rounded-[24px] p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Aperçu semaine</h2>
              <p className="text-xs text-white/40">
                Prévu vs accompli, routines incluses
              </p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
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
  stroke="#ffffff"
  strokeWidth={2.5}
  dot={{ r: 4 }}
  activeDot={{ r: 6 }}
/>

<Line
  type="monotone"
  dataKey="accomplies"
  stroke="#03e42d"
  strokeWidth={2.5}
  dot={{ r: 4 }}
  activeDot={{ r: 6 }}
/>

<Line
  type="monotone"
  dataKey="routines"
  stroke="#1180b3"
  strokeWidth={2.5}
  dot={{ r: 4 }}
  activeDot={{ r: 6 }}
/>
                </LineChart>
              </ResponsiveContainer>
            </div>

           <div className="mt-3 flex gap-5 text-xs">
  <span className="text-white/70">
    ● Tâches prévues
  </span>

  <span className="text-green-400">
    ● Tâches accomplies
  </span>

  <span className="text-blue-400">
    ● Routines accomplies
  </span>
</div>
          </section>

          <section className="glass-card rounded-[24px] p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Aujourd’hui</h2>
              <p className="text-xs text-white/40">Clique pour valider</p>
            </div>

            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <p className="text-sm text-white/35">
                  Aucune tâche aujourd’hui.
                </p>
              ) : (
                todayTasks.slice(0, 6).map((task) => {
                  const color = taskColor(task, projects);
                  const pName = projectName(task, projects);
                  const done = isRoutine(task)
                    ? routineDone(task, routineLogs, todayKey)
                    : task.done;

                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task)}
                      className="w-full rounded-2xl border border-white/8 bg-black/20 p-3 text-left transition hover:bg-white/[0.06]"
                      style={{ boxShadow: `inset 4px 0 0 ${color}` }}
                    >
                      <div className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 size={18} className="text-green-400" />
                        ) : (
                          <Circle size={18} className="text-white/35" />
                        )}

                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold ${
                              done ? "line-through text-white/35" : ""
                            }`}
                          >
                            {task.name}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            {pName || task.category || "Sans catégorie"} ·{" "}
                            {task.start_time || "--:--"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
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
                <ArrowUpRight
                  size={18}
                  className="text-white/35 hover:text-white"
                />
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
                    <div
                      key={project.id}
                      className="rounded-2xl bg-black/20 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderKanban
                            size={15}
                            style={{ color: project.color || "#64748b" }}
                          />
                          <p className="text-sm font-semibold">
                            {project.name}
                          </p>
                        </div>
                        <span className="text-xs text-white/35">
                          {projectProgress}%
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${projectProgress}%`,
                            backgroundColor: project.color || "#64748b",
                          }}
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
      <p className="text-xs text-white/38">Progression du jour</p>

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
          <p className="mt-1 text-xs text-white/35">validées aujourd’hui</p>
        </div>
      </div>
    </div>
  );
}