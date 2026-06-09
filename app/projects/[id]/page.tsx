"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Flag,
  GripVertical,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const columns = [
  {
    id: "todo",
    title: "A faire",
    subtitle: "Taches pas encore lancees",
    icon: ClipboardList,
  },
  {
    id: "progress",
    title: "En cours",
    subtitle: "Taches en progression",
    icon: Clock3,
  },
  {
    id: "upcoming",
    title: "A venir",
    subtitle: "Prevu demain ou plus tard",
    icon: CalendarClock,
  },
  {
    id: "done",
    title: "Termine",
    subtitle: "Taches finalisees",
    icon: CheckCircle2,
  },
];

const priorities = ["Faible", "Normale", "Importante", "Urgent"];

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function currentHourLocal() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";

  const date = String(value).slice(0, 10);
  const parts = date.split("-");

  if (parts.length !== 3) return date;

  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function isDone(task: any) {
  return task?.done === true || task?.status === "done";
}

function priorityClass(priority: string) {
  if (priority === "Urgent") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }

  if (priority === "Importante") {
    return "border-orange-500/25 bg-orange-500/10 text-orange-300";
  }

  if (priority === "Faible") {
    return "border-slate-500/25 bg-slate-500/10 text-slate-300";
  }

  return "border-white/15 bg-white/10 text-white/70";
}

function getTaskColumn(task: any) {
  if (isDone(task)) return "done";
  if (task.status === "progress") return "progress";
  if (task.status === "upcoming") return "upcoming";

  const today = todayLocal();
  const now = currentHourLocal();

  const taskDate = task.due_date ? String(task.due_date).slice(0, 10) : "";
  const taskHour = task.hour ? String(task.hour).slice(0, 5) : "";

  if (taskDate && taskDate > today) return "upcoming";
  if (taskDate && taskDate < today) return "progress";
  if (taskDate === today && taskHour && taskHour <= now) return "progress";

  return "todo";
}

function getTaskProgress(task: any, subtasks: any[], schedules: any[]) {
  const taskSchedules = schedules.filter((item) => item.task_id === task.id);

  if (taskSchedules.length > 0) {
    const done = taskSchedules.filter((item) => item.done).length;

    return {
      total: taskSchedules.length,
      done,
      percent: Math.round((done / taskSchedules.length) * 100),
      label: "case(s)",
    };
  }

  const taskSubtasks = subtasks.filter((item) => item.task_id === task.id);

  if (taskSubtasks.length > 0) {
    const done = taskSubtasks.filter((item) => item.done).length;

    return {
      total: taskSubtasks.length,
      done,
      percent: Math.round((done / taskSubtasks.length) * 100),
      label: "sous-tache(s)",
    };
  }

  return {
    total: 1,
    done: isDone(task) ? 1 : 0,
    percent: isDone(task) ? 100 : 0,
    label: "tache",
  };
}

function getProjectProgress(tasks: any[], subtasks: any[], schedules: any[]) {
  if (schedules.length > 0) {
    const done = schedules.filter((item) => item.done).length;

    return {
      total: schedules.length,
      done,
      percent: Math.round((done / schedules.length) * 100),
      label: "case(s) validee(s)",
    };
  }

  if (subtasks.length > 0) {
    const done = subtasks.filter((item) => item.done).length;

    return {
      total: subtasks.length,
      done,
      percent: Math.round((done / subtasks.length) * 100),
      label: "sous-tache(s) validee(s)",
    };
  }

  const done = tasks.filter(isDone).length;

  return {
    total: tasks.length,
    done,
    percent: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
    label: "tache(s) terminee(s)",
  };
}

function normalizeColor(value: string | null | undefined) {
  if (!value) return "#64748b";
  return String(value);
}

export default function ProjectKanbanPage() {
  const router = useRouter();
  const params = useParams();

  const projectId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0] || ""
      : "";

  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [priority, setPriority] = useState("Normale");
  const [dueDate, setDueDate] = useState("");
  const [hour, setHour] = useState("");

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const projectColor = normalizeColor(project?.color || "#64748b");

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    setUser(authData.user || null);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      alert(projectError.message);
      setLoading(false);
      return;
    }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (taskError) {
      alert(taskError.message);
      setLoading(false);
      return;
    }

    const currentTasks = taskData || [];
    const taskIds = currentTasks.map((task) => task.id);

    let subtaskData: any[] = [];
    let scheduleData: any[] = [];

    if (taskIds.length > 0) {
      const { data: subtasksResult } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });

      subtaskData = subtasksResult || [];

      const { data: schedulesResult } = await supabase
        .from("subtask_schedule")
        .select("*")
        .eq("project_id", projectId)
        .order("planned_date", { ascending: true });

      scheduleData = schedulesResult || [];
    }

    setProject(projectData);
    setTasks(currentTasks);
    setSubtasks(subtaskData);
    setSchedules(scheduleData);
    setLoading(false);
  }

  async function addTask() {
    if (!name.trim()) return;

    setCreating(true);

    const finalDate = dueDate || null;
    const finalHour = hour || null;

    const payload: any = {
      name: name.trim(),
      project_id: projectId,

      status: "todo",
      done: false,

      priority,

      due_date: finalDate,
      date: finalDate,

      hour: finalHour,
      start_time: finalHour,

      color: projectColor,
    };

    if (user?.id) {
      payload.user_id = user.id;
    }

    const { error } = await supabase.from("tasks").insert(payload);

    if (error) {
      alert(error.message);
      setCreating(false);
      return;
    }

    setName("");
    setPriority("Normale");
    setDueDate("");
    setHour("");

    await loadData();
    setCreating(false);
  }

  async function updateTaskColumn(taskId: string, columnId: string) {
    const currentTask = tasks.find((task) => task.id === taskId);

    const payload: any = {};

    if (columnId === "todo") {
      payload.status = "todo";
      payload.done = false;
    }

    if (columnId === "progress") {
      payload.status = "progress";
      payload.done = false;

      if (!currentTask?.due_date) {
        const today = todayLocal();
        payload.due_date = today;
        payload.date = today;
      }
    }

    if (columnId === "upcoming") {
      payload.status = "upcoming";
      payload.done = false;

      if (!currentTask?.due_date) {
        const tomorrow = tomorrowLocal();
        payload.due_date = tomorrow;
        payload.date = tomorrow;
      }
    }

    if (columnId === "done") {
      payload.status = "done";
      payload.done = true;
    }

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function deleteTask(taskId: string) {
    const ok = confirm("Supprimer cette tache et ses sous-taches ?");
    if (!ok) return;

    await supabase.from("subtask_schedule").delete().eq("task_id", taskId);
    await supabase.from("subtasks").delete().eq("task_id", taskId);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function handleDrop(columnId: string) {
    if (!draggedTaskId) return;

    await updateTaskColumn(draggedTaskId, columnId);

    setDraggedTaskId(null);
    setDragOverColumn(null);
  }

  const projectProgress = useMemo(() => {
    return getProjectProgress(tasks, subtasks, schedules);
  }, [tasks, subtasks, schedules]);

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#030712] text-white">
        <Sidebar />

        <section className="flex flex-1 items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-5 text-white/45">
            Chargement du projet...
          </div>
        </section>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen bg-[#030712] text-white">
        <Sidebar />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-[520px] rounded-[34px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <h1 className="text-2xl font-semibold">Projet introuvable</h1>

            <p className="mt-3 text-sm text-white/45">
              Ce projet n existe plus ou son identifiant est invalide.
            </p>

            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="mt-7 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black"
            >
              Retour aux projets
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#030712] text-white">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mx-auto max-w-[1440px]">
          <header className="mb-8 flex items-start justify-between gap-8">
            <div>
              <button
                type="button"
                onClick={() => router.push("/projects")}
                className="mb-7 flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
              >
                <ArrowLeft size={16} />
                Retour aux projets
              </button>

              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                KANBAN PROJET
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                {project.name || "Projet"}
              </h1>

              <p className="mt-3 max-w-2xl text-base text-white/45">
                {project.description || "Organise les taches de ce projet."}
              </p>
            </div>

            <div className="w-[270px] rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <p className="text-sm text-white/45">Avancement reel</p>

              <p className="mt-3 text-4xl font-semibold">
                {projectProgress.percent}%
              </p>

              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${projectProgress.percent}%`,
                    backgroundColor: projectColor,
                    boxShadow: `0 0 14px ${projectColor}`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-white/35">
                {projectProgress.done} / {projectProgress.total}{" "}
                {projectProgress.label}
              </p>
            </div>
          </header>

          <section className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                placeholder="Nouvelle tache du projet..."
                className="h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none placeholder:text-white/35"
              />

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-[52px] w-[165px] rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none"
              >
                {priorities.map((p) => (
                  <option key={p} value={p} className="bg-[#030712]">
                    {p}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-[52px] w-[180px] rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none [color-scheme:dark]"
              />

              <input
                type="time"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="h-[52px] w-[150px] rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none [color-scheme:dark]"
              />

              <button
                type="button"
                onClick={addTask}
                disabled={creating}
                className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                <Plus size={18} />
                {creating ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-5">
            {columns.map((column) => {
              const Icon = column.icon;

              const columnTasks = tasks.filter(
                (task) => getTaskColumn(task) === column.id
              );

              const isOver = dragOverColumn === column.id;

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColumn(column.id);
                  }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={() => handleDrop(column.id)}
                  className={`min-h-[520px] rounded-[28px] border p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition ${
                    isOver
                      ? "border-white/35 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{column.title}</h2>

                      <p className="mt-1 text-sm text-white/35">
                        {column.subtitle}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnTasks.length === 0 && (
                      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-black/15 p-6 text-center">
                        <Icon size={42} className="mb-4 text-white/20" />
                        <p className="text-sm text-white/40">Aucune tache</p>
                      </div>
                    )}

                    {columnTasks.map((task) => {
                      const taskProgress = getTaskProgress(
                        task,
                        subtasks,
                        schedules
                      );

                      const taskColor = normalizeColor(
                        task.color || projectColor
                      );

                      return (
                        <article
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className={`rounded-[24px] border border-white/10 bg-black/25 p-4 transition hover:-translate-y-1 hover:bg-white/[0.06] ${
                            draggedTaskId === task.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <GripVertical
                                size={16}
                                className="mt-1 shrink-0 text-white/25"
                              />

                              <div className="min-w-0">
                                <h3 className="truncate font-semibold">
                                  {task.name || "Sans titre"}
                                </h3>

                                {task.description && (
                                  <p className="mt-2 line-clamp-2 text-xs text-white/35">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="shrink-0 text-white/25 transition hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${priorityClass(
                                task.priority || "Normale"
                              )}`}
                            >
                              <Flag size={12} />
                              {task.priority || "Normale"}
                            </span>

                            {task.due_date && (
                              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/45">
                                <CalendarDays size={12} />
                                {formatDate(task.due_date)}
                              </span>
                            )}

                            {task.hour && (
                              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/45">
                                <Clock3 size={12} />
                                {String(task.hour).slice(0, 5)}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-white/45">
                                <ListChecks size={13} />
                                Progression reelle
                              </div>

                              <span className="text-xs font-semibold text-white/70">
                                {taskProgress.percent}%
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${taskProgress.percent}%`,
                                  backgroundColor: taskColor,
                                  boxShadow: `0 0 12px ${taskColor}`,
                                }}
                              />
                            </div>

                            <p className="mt-2 text-[11px] text-white/30">
                              {taskProgress.done}/{taskProgress.total}{" "}
                              {taskProgress.label}
                            </p>
                          </div>

                          <a
                            href={`/projects/${projectId}/tasks/${task.id}`}
                            draggable={false}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.14] hover:text-white"
                          >
                            Gerer les sous-taches
                            <ArrowUpRight size={13} />
                          </a>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateTaskColumn(task.id, "todo")}
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/55 hover:bg-white/20 hover:text-white"
                            >
                              A faire
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateTaskColumn(task.id, "progress")
                              }
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/55 hover:bg-green-500/20 hover:text-green-300"
                            >
                              En cours
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateTaskColumn(task.id, "upcoming")
                              }
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/55 hover:bg-blue-500/20 hover:text-blue-300"
                            >
                              A venir
                            </button>

                            <button
                              type="button"
                              onClick={() => updateTaskColumn(task.id, "done")}
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/55 hover:bg-violet-500/20 hover:text-violet-300"
                            >
                              Termine
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