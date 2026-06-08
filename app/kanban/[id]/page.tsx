"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Clock3,
  CalendarClock,
  Flag,
  CheckCircle2,
  Circle,
  X,
  ListChecks,
  CalendarDays,
  CheckSquare,
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

function getTaskHour(task: any) {
  if (task.hour) return String(task.hour).slice(0, 5);
  if (task.start_time) return String(task.start_time).slice(0, 5);
  return "";
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

function subtaskProgress(taskId: string, subtasks: any[]) {
  const list = subtasks.filter((subtask) => subtask.task_id === taskId);
  const done = list.filter((subtask) => subtask.done).length;
  const total = list.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return { list, done, total, progress };
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

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

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

    setSelectedTask((prev: any) => {
      if (!prev) return null;
      return currentTasks.find((task) => task.id === prev.id) || null;
    });

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

    await loadData();
  }

  async function toggleTaskDone(task: any) {
    if (!user) return;

    const nextDone = !isDone(task);

    const { error } = await supabase
      .from("tasks")
      .update({
        done: nextDone,
        status: nextDone ? "done" : "todo",
      })
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

    const ok = confirm("Supprimer cette tâche et toutes ses sous-tâches ?");
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

    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }

    await loadData();
  }

  async function addSubtask() {
    if (!user || !selectedTask || !newSubtaskTitle.trim()) return;

    const { error } = await supabase.from("subtasks").insert({
      user_id: user.id,
      task_id: selectedTask.id,
      title: newSubtaskTitle.trim(),
      done: false,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewSubtaskTitle("");
    await loadData();
  }

  async function toggleSubtask(subtask: any) {
    if (!user) return;

    const { error } = await supabase
      .from("subtasks")
      .update({
        done: !subtask.done,
      })
      .eq("id", subtask.id)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function deleteSubtask(subtaskId: string) {
    if (!user) return;

    const { error } = await supabase
      .from("subtasks")
      .delete()
      .eq("id", subtaskId)
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

      if (columnId === "done") {
        return done;
      }

      if (done) {
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
    const done = tasks.filter(isDone).length;
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
        <div className="mx-auto max-w-[1550px]">
          <button
            onClick={() => router.push("/projects")}
            className="mb-8 flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Retour aux projets
          </button>

          <header className="mb-7 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                Projet
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {project?.name || "Projet"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                {project?.description ||
                  "Organise les tâches, suis l’avancement et détaille chaque tâche avec des sous-tâches."}
              </p>
            </div>

            <div className="grid min-w-[240px] gap-3 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/45">Progression</span>
                <span className="font-semibold">{stats.progress}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              <p className="text-xs text-white/35">
                {stats.done}/{stats.total} tâche(s) terminée(s)
              </p>
            </div>
          </header>

          <section className="mb-7 rounded-[30px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <div className="grid grid-cols-[1fr_190px_auto] gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                placeholder="Créer une tâche principale dans ce projet..."
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              />

              <input
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                type="date"
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
              />

              <button
                onClick={addTask}
                className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                <Plus size={17} />
                Ajouter
              </button>
            </div>
          </section>

          <section
            className={`grid gap-5 ${
              selectedTask
                ? "grid-cols-[repeat(4,minmax(0,1fr))_380px]"
                : "grid-cols-4"
            }`}
          >
            {columns.map((column) => {
              const Icon = column.icon;
              const columnTasks = getColumnTasks(column.id);
              const activeDrop = dragOverColumn === column.id;

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColumn(column.id);
                  }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={() => handleDrop(column.id)}
                  className={`min-h-[650px] rounded-[30px] border p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl transition ${
                    activeDrop
                      ? "border-white/30 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/60">
                        <Icon size={18} />
                      </div>

                      <h2 className="text-lg font-semibold">{column.title}</h2>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        {column.subtitle}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/45">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnTasks.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">
                        Aucune tâche
                      </div>
                    )}

                    {columnTasks.map((task) => {
                      const progress = subtaskProgress(task.id, subtasks);
                      const done = isDone(task);
                      const active = selectedTask?.id === task.id;

                      return (
                        <div
                          key={`${column.id}-${task.id}`}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onClick={() => setSelectedTask(task)}
                          className={`group cursor-pointer rounded-2xl border p-4 transition hover:-translate-y-1 hover:bg-white/[0.07] ${
                            active
                              ? "border-white/35 bg-white/[0.08]"
                              : "border-white/10 bg-black/25"
                          } ${done ? "opacity-60" : ""}`}
                          style={{
                            boxShadow: `inset 4px 0 0 ${
                              task.color || project?.color || "#64748b"
                            }`,
                          }}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <GripVertical
                                size={16}
                                className="mt-0.5 shrink-0 text-white/25"
                              />

                              <div className="min-w-0">
                                <p
                                  className={`truncate text-sm font-semibold ${
                                    done
                                      ? "text-white/45 line-through"
                                      : "text-white"
                                  }`}
                                >
                                  {task.name || task.title || "Sans titre"}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/35">
                                  <span className="flex items-center gap-1">
                                    <CalendarDays size={12} />
                                    {formatDate(getTaskDate(task))}
                                  </span>

                                  {getTaskHour(task) && (
                                    <span className="flex items-center gap-1">
                                      <Clock3 size={12} />
                                      {getTaskHour(task)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              className="opacity-0 text-white/35 transition hover:text-red-300 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-[11px] text-white/35">
                              <span>Sous-tâches</span>
                              <span>
                                {progress.done}/{progress.total}
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-white transition-all"
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selectedTask && (
              <TaskDetailsPanel
                task={selectedTask}
                subtasks={subtasks.filter(
                  (subtask) => subtask.task_id === selectedTask.id
                )}
                newSubtaskTitle={newSubtaskTitle}
                setNewSubtaskTitle={setNewSubtaskTitle}
                onClose={() => setSelectedTask(null)}
                onAddSubtask={addSubtask}
                onToggleSubtask={toggleSubtask}
                onDeleteSubtask={deleteSubtask}
                onToggleTaskDone={() => toggleTaskDone(selectedTask)}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function TaskDetailsPanel({
  task,
  subtasks,
  newSubtaskTitle,
  setNewSubtaskTitle,
  onClose,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onToggleTaskDone,
}: {
  task: any;
  subtasks: any[];
  newSubtaskTitle: string;
  setNewSubtaskTitle: (value: string) => void;
  onClose: () => void;
  onAddSubtask: () => void;
  onToggleSubtask: (subtask: any) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onToggleTaskDone: () => void;
}) {
  const done = isDone(task);
  const progress = subtaskProgress(task.id, subtasks);

  return (
    <aside className="sticky top-8 h-fit rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
            Détails tâche
          </p>

          <h2 className="mt-3 text-xl font-semibold leading-tight">
            {task.name || task.title || "Sans titre"}
          </h2>

          <p className="mt-2 text-sm text-white/40">
            {formatDate(getTaskDate(task))}
            {getTaskHour(task) ? ` · ${getTaskHour(task)}` : ""}
          </p>
        </div>

        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/45 transition hover:bg-white/[0.07] hover:text-white"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-white/45">Progression sous-tâches</span>
          <span className="font-semibold">{progress.progress}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-white/35">
          {progress.done}/{progress.total} sous-tâche(s) validée(s)
        </p>
      </div>

      <button
        onClick={onToggleTaskDone}
        className={`mb-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
          done
            ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        <CheckSquare size={17} />
        {done ? "Tâche terminée" : "Valider la tâche"}
      </button>

      <div className="mb-4 flex items-center gap-2">
        <ListChecks size={18} className="text-white/45" />
        <h3 className="font-semibold">Sous-tâches</h3>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddSubtask();
            }
          }}
          placeholder="Ajouter une sous-tâche..."
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
        />

        <button
          onClick={onAddSubtask}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black transition hover:bg-white/90"
        >
          <Plus size={17} />
        </button>
      </div>

      <div className="space-y-2">
        {subtasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">
            Aucune sous-tâche pour le moment.
          </div>
        )}

        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3"
          >
            <button
              onClick={() => onToggleSubtask(subtask)}
              className="text-white/60 transition hover:text-white"
            >
              {subtask.done ? (
                <CheckCircle2 size={19} className="text-emerald-400" />
              ) : (
                <Circle size={19} />
              )}
            </button>

            <p
              className={`min-w-0 flex-1 truncate text-sm ${
                subtask.done ? "text-white/40 line-through" : "text-white/80"
              }`}
            >
              {subtask.title}
            </p>

            <button
              onClick={() => onDeleteSubtask(subtask.id)}
              className="opacity-0 text-white/30 transition hover:text-red-300 group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}