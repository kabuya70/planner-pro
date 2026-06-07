"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Clock3,
  CalendarClock,
  Flag,
  CheckCircle2,
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
    subtitle: "Tâches prévues demain ou après",
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
  if (!value) return "";
  const date = String(value).slice(0, 10);
  const parts = date.split("-");
  if (parts.length !== 3) return date;

  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
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
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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
      .order("created_at", { ascending: false });

    if (taskError) {
      alert(taskError.message);
      setLoading(false);
      return;
    }

    setProject(projectData);
    setTasks(taskData || []);
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
      date: dueDate || null,
      category: "Projet",
      type: "task",
      repeat_rule: "none",
      color: project?.color || "#64748b",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setDueDate("");
    await loadData();
  }

  async function moveTask(taskId: string, columnId: string) {
    if (!user) return;

    const task = tasks.find((t) => t.id === taskId);

    const payload: any = {};

    if (columnId === "todo") {
      payload.status = "todo";
      payload.done = false;
    }

    if (columnId === "today") {
      const today = getTodayKey();

      payload.status = "progress";
      payload.done = false;
      payload.date = today;
      payload.due_date = today;
    }

    if (columnId === "upcoming") {
      const tomorrow = getTomorrowKey();
      const currentDate = getTaskDate(task);

      payload.status = "todo";
      payload.done = false;

      if (!currentDate || currentDate <= getTodayKey()) {
        payload.date = tomorrow;
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
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...payload,
            }
          : task
      )
    );
  }

  async function deleteTask(taskId: string) {
    if (!user) return;

    const ok = confirm("Supprimer cette tâche ?");
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

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  function getColumnTasks(columnId: string) {
    const today = getTodayKey();

    return tasks.filter((task) => {
      const isDone = task.done === true || task.status === "done";
      const taskDate = getTaskDate(task);

      if (columnId === "done") {
        return isDone;
      }

      if (isDone) {
        return false;
      }

      if (columnId === "todo") {
        return true;
      }

      if (columnId === "today") {
        return taskDate === today;
      }

      if (columnId === "upcoming") {
        return taskDate !== null && taskDate > today;
      }

      return false;
    });
  }

  async function handleDrop(columnId: string) {
    if (!draggedTaskId) return;

    await moveTask(draggedTaskId, columnId);

    setDraggedTaskId(null);
    setDragOverColumn(null);
  }

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(
      (task) => task.done === true || task.status === "done"
    ).length;

    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, progress };
  }, [tasks]);

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
        <div className="mx-auto max-w-[1500px]">
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
                KANBAN PROJET — VERSION 4 COLONNES
              </p>

              <h1 className="mt-4 text-4xl font-semibold text-white">
                {project?.name || "Projet"}
              </h1>

              <p className="mt-3 max-w-3xl text-white/45">
                {project?.description || "Organise les tâches de ce projet."}
              </p>
            </div>

            <div className="w-[230px] rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-white/45">Progression</p>

              <p className="mt-3 text-4xl font-semibold">{stats.progress}%</p>

              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-white/35">
                {stats.done} / {stats.total} tâche(s) terminée(s)
              </p>
            </div>
          </header>

          <section className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nouvelle tâche du projet..."
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
                  className={`min-h-[560px] rounded-[32px] border p-6 transition ${
                    isOver
                      ? "border-white/35 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
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

                    {columnTasks.map((task) => (
                      <article
                        key={`${column.id}-${task.id}`}
                        draggable
                        onDragStart={() => setDraggedTaskId(task.id)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverColumn(null);
                        }}
                        className={`cursor-grab rounded-[24px] border border-white/10 bg-black/25 p-4 transition hover:bg-white/[0.06] ${
                          draggedTaskId === task.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <GripVertical
                              size={17}
                              className="mt-1 text-white/55"
                            />

                            <div>
                              <h3 className="font-semibold text-white">
                                {task.name || "Sans titre"}
                              </h3>

                              {task.description && (
                                <p className="mt-2 text-xs text-white/35">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-white hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {(task.date || task.due_date) && (
                          <p className="mb-4 text-xs text-white/45">
                            {formatDate(task.date || task.due_date)}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => moveTask(task.id, "todo")}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                          >
                            → À faire
                          </button>

                          <button
                            onClick={() => moveTask(task.id, "today")}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                          >
                            → En cours
                          </button>

                          <button
                            onClick={() => moveTask(task.id, "upcoming")}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                          >
                            → À venir
                          </button>

                          <button
                            onClick={() => moveTask(task.id, "done")}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20"
                          >
                            → Terminé
                          </button>
                        </div>
                      </article>
                    ))}
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