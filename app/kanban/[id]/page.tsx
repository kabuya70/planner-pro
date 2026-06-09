"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock3,
  CalendarClock,
  Flag,
  CheckCircle2,
  CalendarDays,
  FolderKanban,
  Repeat,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const columns = [
  {
    id: "todo",
    title: "À faire",
    subtitle: "Toutes les tâches non terminées",
    icon: Flag,
  },
  {
    id: "today",
    title: "En cours",
    subtitle: "Tâches prévues aujourd’hui",
    icon: Clock3,
  },
  {
    id: "upcoming",
    title: "À venir",
    subtitle: "Tâches futures",
    icon: CalendarClock,
  },
  {
    id: "done",
    title: "Terminé",
    subtitle: "Tâches terminées",
    icon: CheckCircle2,
  },
];

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTaskDate(task: any) {
  const value = task.due_date || task.date || task.deadline;
  if (!value) return null;
  return String(value).slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sans date";
  const date = String(value).slice(0, 10);
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function isDone(task: any) {
  return task.done === true || task.status === "done";
}

function isRoutine(task: any) {
  const type = String(task.type || "").toLowerCase();
  const category = String(task.category || "").toLowerCase();
  return type === "routine" || category === "routine";
}

function getSubtasksForTask(taskId: string, subtasks: any[]) {
  return subtasks.filter((subtask) => subtask.task_id === taskId);
}

function getTaskProgress(task: any, subtasks: any[]) {
  const list = getSubtasksForTask(task.id, subtasks);

  if (list.length === 0) {
    return {
      total: 0,
      done: isDone(task) ? 1 : 0,
      progress: isDone(task) ? 100 : 0,
    };
  }

  const done = list.filter((subtask) => subtask.done).length;

  return {
    total: list.length,
    done,
    progress: Math.round((done / list.length) * 100),
  };
}

function getProjectProgress(tasks: any[], subtasks: any[]) {
  const projectSubtasks = subtasks.filter((subtask) =>
    tasks.some((task) => task.id === subtask.task_id)
  );

  if (projectSubtasks.length > 0) {
    const done = projectSubtasks.filter((subtask) => subtask.done).length;

    return {
      total: projectSubtasks.length,
      done,
      progress: Math.round((done / projectSubtasks.length) * 100),
      label: "sous-tâche(s)",
    };
  }

  const doneTasks = tasks.filter(isDone).length;

  return {
    total: tasks.length,
    done: doneTasks,
    progress: tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
    label: "tâche(s)",
  };
}

function buildDonutData(tasks: any[]) {
  const today = getTodayKey();

  const daily = tasks.filter((task) => {
    const taskDate = getTaskDate(task);
    return taskDate === today && !isRoutine(task);
  }).length;

  const routines = tasks.filter(isRoutine).length;
  const projectTasks = tasks.filter((task) => !isRoutine(task)).length;

  const total = daily + routines + projectTasks;
  const safeTotal = total > 0 ? total : 1;

  return [
    {
      id: "daily",
      label: "Tâches quotidiennes programmées",
      shortLabel: "Quotidiennes",
      value: daily,
      percent: Math.round((daily / safeTotal) * 100),
      color: "#38bdf8",
      icon: CalendarCheck,
    },
    {
      id: "routine",
      label: "Tâches routine",
      shortLabel: "Routines",
      value: routines,
      percent: Math.round((routines / safeTotal) * 100),
      color: "#22c55e",
      icon: Repeat,
    },
    {
      id: "project",
      label: "Tâches par projet",
      shortLabel: "Projet",
      value: projectTasks,
      percent: Math.round((projectTasks / safeTotal) * 100),
      color: "#8b5cf6",
      icon: FolderKanban,
    },
  ];
}

function donutBackground(data: any[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return "conic-gradient(rgba(255,255,255,0.10) 0deg 360deg)";
  }

  let current = 0;

  const parts = data.map((item) => {
    const start = current;
    const end = current + (item.value / total) * 360;
    current = end;
    return `${item.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

export default function ProjectKanbanPage() {
  const router = useRouter();
  const params = useParams();

  const projectId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      window.location.href = "/login";
      return null;
    }

    return data.user;
  }

  async function loadData() {
    setLoading(true);

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (projectError) {
      alert(projectError.message);
      setLoading(false);
      return;
    }

    if (!projectData) {
      alert("Projet introuvable.");
      router.push("/projects");
      setLoading(false);
      return;
    }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (taskError) {
      alert(taskError.message);
      setLoading(false);
      return;
    }

    const currentTasks = taskData || [];
    const taskIds = currentTasks.map((task) => task.id);

    let subtaskData: any[] = [];

    if (taskIds.length > 0) {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("user_id", currentUser.id)
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });

      if (error) {
        alert(error.message);
      } else {
        subtaskData = data || [];
      }
    }

    setProject(projectData);
    setTasks(currentTasks);
    setSubtasks(subtaskData);
    setLoading(false);
  }

  async function addTask() {
    if (!name.trim() || !user) return;

    const { error } = await supabase.from("tasks").insert({
      name: name.trim(),
      project_id: projectId,
      user_id: user.id,
      status: "todo",
      done: false,
      priority: "Normale",
      due_date: dueDate || null,
      category: "Projet",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setDueDate("");
    await loadData();
  }

  async function moveTask(task: any, columnId: string) {
    if (!user) return;

    const payload: any = {};

    if (columnId === "todo") {
      payload.status = "todo";
      payload.done = false;
    }

    if (columnId === "today") {
      const today = getTodayKey();
      payload.status = "progress";
      payload.done = false;
      payload.due_date = today;
    }

    if (columnId === "upcoming") {
      const tomorrow = getTomorrowKey();
      const currentDate = getTaskDate(task);

      payload.status = "todo";
      payload.done = false;

      if (!currentDate || currentDate <= getTodayKey()) {
        payload.due_date = tomorrow;
      }
    }

    if (columnId === "done") {
      payload.status = "done";
      payload.done = true;
    }

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", task.id)
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function deleteTask(taskId: string) {
    if (!user) return;

    const ok = confirm("Supprimer cette tâche et ses sous-tâches ?");
    if (!ok) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  function getColumnTasks(columnId: string) {
    const today = getTodayKey();

    return tasks.filter((task) => {
      const done = isDone(task);
      const taskDate = getTaskDate(task);

      if (columnId === "done") return done;
      if (done) return false;
      if (columnId === "todo") return true;
      if (columnId === "today") return taskDate === today;
      if (columnId === "upcoming") return taskDate !== null && taskDate > today;

      return false;
    });
  }

  const projectProgress = useMemo(() => {
    return getProjectProgress(tasks, subtasks);
  }, [tasks, subtasks]);

  const donutData = useMemo(() => {
    return buildDonutData(tasks);
  }, [tasks]);

  const donutTitle = donutData
    .map((item) => `${item.label} : ${item.value} (${item.percent}%)`)
    .join("\n");

  if (loading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white flex">
        <Sidebar />
        <section className="flex-1 flex items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-5 text-white/45">
            Chargement du projet...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mx-auto max-w-[1550px]">
          <button
            onClick={() => router.push("/projects")}
            className="mb-8 flex items-center gap-2 text-sm text-white/45 hover:text-white"
          >
            <ArrowLeft size={16} />
            Retour aux projets
          </button>

          <header className="mb-8 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                KANBAN PROJET
              </p>

              <h1 className="mt-4 text-4xl font-semibold text-white">
                {project?.name || "Projet"}
              </h1>

              <p className="mt-3 max-w-3xl text-white/45">
                {project?.description ||
                  "Organise les tâches de ce projet et suis la progression par sous-tâches."}
              </p>
            </div>

            <div className="w-[310px] rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-5">
                <div
                  title={donutTitle}
                  className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: donutBackground(donutData) }}
                >
                  <div className="absolute inset-[11px] rounded-full bg-[#030712]" />

                  <div className="relative text-center">
                    <p className="text-2xl font-bold">
                      {projectProgress.progress}%
                    </p>
                    <p className="text-[10px] text-white/35">projet</p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/45">Progression</p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {projectProgress.done} / {projectProgress.total}{" "}
                    {projectProgress.label}
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${projectProgress.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {donutData.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      title={`${item.label} : ${item.value} (${item.percent}%)`}
                      className="group relative flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />

                        <Icon size={13} className="text-white/40" />

                        <span className="text-xs text-white/50">
                          {item.shortLabel}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-white/70">
                        {item.value}
                      </span>

                      <div className="pointer-events-none absolute -top-10 right-0 z-30 hidden rounded-xl border border-white/10 bg-black/90 px-3 py-2 text-[11px] text-white shadow-2xl group-hover:block">
                        {item.label} : {item.value} ({item.percent}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </header>

          <section className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                placeholder="Nouvelle tâche principale du projet..."
                className="h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-sm text-white outline-none placeholder:text-white/35"
              />

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-[52px] w-[220px] rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-sm text-white outline-none [color-scheme:dark]"
              />

              <button
                onClick={addTask}
                className="flex h-[46px] items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-black hover:bg-white/90"
              >
                <Plus size={18} />
                Ajouter
              </button>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-6">
            {columns.map((column) => {
              const Icon = column.icon;
              const columnTasks = getColumnTasks(column.id);

              return (
                <div
                  key={column.id}
                  className="min-h-[560px] rounded-[32px] border border-white/10 bg-white/[0.035] p-6"
                >
                  <div className="mb-7 flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {column.title}
                      </h2>

                      <p className="mt-2 text-sm text-white/35">
                        {column.subtitle}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/55">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {columnTasks.length === 0 && (
                      <div className="flex min-h-[210px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-black/15 p-6 text-center">
                        <Icon size={42} className="mb-4 text-white/80" />
                        <p className="text-sm text-white/40">Aucune tâche</p>
                      </div>
                    )}

                    {columnTasks.map((task) => {
                      const taskProgress = getTaskProgress(task, subtasks);

                      return (
                        <article
                          key={`${column.id}-${task.id}`}
                          className="rounded-[24px] border border-white/10 bg-black/25 p-4 transition hover:-translate-y-1 hover:bg-white/[0.06]"
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-white">
                                {task.name || "Sans titre"}
                              </h3>

                              {(task.date || task.due_date) && (
                                <p className="mt-2 flex items-center gap-2 text-xs text-white/45">
                                  <CalendarDays size={12} />
                                  {formatDate(task.date || task.due_date)}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="text-white/45 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mb-4">
                            <div className="mb-1 flex items-center justify-between text-[11px] text-white/35">
                              <span>Sous-tâches</span>
                              <span>
                                {taskProgress.done}/{taskProgress.total}
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-white transition-all"
                                style={{ width: `${taskProgress.progress}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            href={`/projects/${projectId}/tasks/${task.id}`}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.14] hover:text-white"
                          >
                            Gérer les sous-tâches
                            <ArrowUpRight size={13} />
                          </Link>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => moveTask(task, "todo")}
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                            >
                              → À faire
                            </button>

                            <button
                              type="button"
                              onClick={() => moveTask(task, "today")}
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                            >
                              → En cours
                            </button>

                            <button
                              type="button"
                              onClick={() => moveTask(task, "upcoming")}
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                            >
                              → À venir
                            </button>

                            <button
                              type="button"
                              onClick={() => moveTask(task, "done")}
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                            >
                              → Terminé
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </section>
    </main>
  );
}