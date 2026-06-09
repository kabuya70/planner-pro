"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  FolderKanban,
  ListChecks,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const weekLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sans date";

  const date = String(value).slice(0, 10);
  const parts = date.split("-");

  if (parts.length !== 3) return date;

  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function getTaskDate(task: any) {
  const value = task?.due_date || task?.date || task?.deadline;
  if (!value) return null;
  return String(value).slice(0, 10);
}

function getTaskHour(task: any) {
  if (task?.hour) return String(task.hour).slice(0, 5);
  if (task?.start_time) return String(task.start_time).slice(0, 5);
  return "";
}

function isDone(task: any) {
  return task?.done === true || task?.status === "done";
}

function getScheduleForSubtask(
  subtaskId: string,
  date: string,
  schedules: any[]
) {
  return schedules.find(
    (item) =>
      item.subtask_id === subtaskId &&
      String(item.planned_date).slice(0, 10) === date
  );
}

function getGlobalProgress(schedules: any[], subtasks: any[]) {
  if (schedules.length > 0) {
    const done = schedules.filter((item) => item.done).length;

    return {
      total: schedules.length,
      done,
      percent: Math.round((done / schedules.length) * 100),
      label: "case(s) validée(s)",
    };
  }

  if (subtasks.length > 0) {
    const done = subtasks.filter((item) => item.done).length;

    return {
      total: subtasks.length,
      done,
      percent: Math.round((done / subtasks.length) * 100),
      label: "sous-tâche(s) validée(s)",
    };
  }

  return {
    total: 0,
    done: 0,
    percent: 0,
    label: "élément(s) validé(s)",
  };
}

function getSubtaskWeekProgress(
  subtask: any,
  schedules: any[],
  weekDates: Date[]
) {
  const weekKeys = weekDates.map(dateKey);

  const rows = schedules.filter(
    (item) =>
      item.subtask_id === subtask.id &&
      weekKeys.includes(String(item.planned_date).slice(0, 10))
  );

  const total = rows.length;
  const done = rows.filter((item) => item.done).length;

  return {
    total,
    done,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export default function TaskSubtasksPage() {
  const router = useRouter();
  const params = useParams();

  const urlProjectId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0] || ""
      : "";

  const taskId =
    typeof params.taskId === "string"
      ? params.taskId
      : Array.isArray(params.taskId)
      ? params.taskId[0] || ""
      : "";

  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(currentWeek, index));
  }, [currentWeek]);

  const weekStartLabel = formatDate(dateKey(weekDates[0]));
  const weekEndLabel = formatDate(dateKey(weekDates[6]));

  const realProjectId = task?.project_id || urlProjectId;

  useEffect(() => {
    loadData();
  }, [urlProjectId, taskId]);

  async function loadData() {
    setLoading(true);
    setNotFound(false);

    if (!isValidUuid(urlProjectId) || !isValidUuid(taskId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    setUser(authData.user || null);

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      alert(taskError.message);
      setLoading(false);
      return;
    }

    if (!taskData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const projectId = taskData.project_id || urlProjectId;

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
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: subtaskData, error: subtaskError } = await supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (subtaskError) {
      alert(subtaskError.message);
      setLoading(false);
      return;
    }

    const { data: scheduleData, error: scheduleError } = await supabase
      .from("subtask_schedule")
      .select("*")
      .eq("task_id", taskId)
      .order("planned_date", { ascending: true });

    if (scheduleError) {
      alert(scheduleError.message);
      setLoading(false);
      return;
    }

    setTask(taskData);
    setProject(projectData);
    setSubtasks(subtaskData || []);
    setSchedules(scheduleData || []);
    setLoading(false);
  }

  async function syncTaskStatus(nextSchedules: any[]) {
    if (!task?.id) return;

    if (nextSchedules.length === 0) return;

    const done = nextSchedules.filter((item) => item.done).length;
    const percent = Math.round((done / nextSchedules.length) * 100);

    const shouldBeDone = percent === 100;

    if (shouldBeDone === isDone(task)) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        done: shouldBeDone,
        status: shouldBeDone ? "done" : "todo",
      })
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTask((prev: any) => ({
      ...prev,
      done: shouldBeDone,
      status: shouldBeDone ? "done" : "todo",
    }));
  }

  async function addSubtask() {
    if (!title.trim() || !task?.id) return;

    const payload: any = {
      task_id: task.id,
      title: title.trim(),
      done: false,
    };

    if (user?.id) payload.user_id = user.id;

    const { error } = await supabase.from("subtasks").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    await loadData();
  }

  async function deleteSubtask(subtaskId: string) {
    const ok = confirm("Supprimer cette sous-tâche et sa planification ?");
    if (!ok) return;

    await supabase
      .from("subtask_schedule")
      .delete()
      .eq("subtask_id", subtaskId);

    const { error } = await supabase
      .from("subtasks")
      .delete()
      .eq("id", subtaskId);

    if (error) {
      alert(error.message);
      return;
    }

    const nextSubtasks = subtasks.filter((item) => item.id !== subtaskId);
    const nextSchedules = schedules.filter(
      (item) => item.subtask_id !== subtaskId
    );

    setSubtasks(nextSubtasks);
    setSchedules(nextSchedules);

    await syncTaskStatus(nextSchedules);
  }

  async function toggleScheduleCell(subtask: any, plannedDate: string) {
    if (!task?.id || !realProjectId) return;

    const existing = getScheduleForSubtask(
      subtask.id,
      plannedDate,
      schedules
    );

    if (existing) {
      const nextDone = !existing.done;

      const { error } = await supabase
        .from("subtask_schedule")
        .update({
          done: nextDone,
        })
        .eq("id", existing.id);

      if (error) {
        alert(error.message);
        return;
      }

      const nextSchedules = schedules.map((item) =>
        item.id === existing.id ? { ...item, done: nextDone } : item
      );

      setSchedules(nextSchedules);
      await syncTaskStatus(nextSchedules);

      return;
    }

    const payload: any = {
      subtask_id: subtask.id,
      task_id: task.id,
      project_id: realProjectId,
      planned_date: plannedDate,
      done: true,
    };

    if (user?.id) payload.user_id = user.id;

    const { data, error } = await supabase
      .from("subtask_schedule")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const nextSchedules = [...schedules, data];

    setSchedules(nextSchedules);
    await syncTaskStatus(nextSchedules);
  }

  async function clearScheduleCell(subtask: any, plannedDate: string) {
    const existing = getScheduleForSubtask(
      subtask.id,
      plannedDate,
      schedules
    );

    if (!existing) return;

    const { error } = await supabase
      .from("subtask_schedule")
      .delete()
      .eq("id", existing.id);

    if (error) {
      alert(error.message);
      return;
    }

    const nextSchedules = schedules.filter((item) => item.id !== existing.id);

    setSchedules(nextSchedules);
    await syncTaskStatus(nextSchedules);
  }

  async function toggleTaskDone() {
    if (!task?.id) return;

    const nextDone = !isDone(task);

    const { error } = await supabase
      .from("tasks")
      .update({
        done: nextDone,
        status: nextDone ? "done" : "todo",
      })
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTask((prev: any) => ({
      ...prev,
      done: nextDone,
      status: nextDone ? "done" : "todo",
    }));
  }

  const progress = useMemo(() => {
    return getGlobalProgress(schedules, subtasks);
  }, [schedules, subtasks]);

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#030712] text-white">
        <Sidebar />

        <section className="flex flex-1 items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-5 text-white/45">
            Chargement des sous-tâches...
          </div>
        </section>
      </main>
    );
  }

  if (notFound || !task) {
    return (
      <main className="flex min-h-screen bg-[#030712] text-white">
        <Sidebar />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-[520px] rounded-[34px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <h1 className="text-2xl font-semibold">Tâche introuvable</h1>

            <p className="mt-3 text-sm text-white/45">
              Cette tâche n’existe plus ou son identifiant est invalide.
            </p>

            <button
              onClick={() => router.push(`/projects/${urlProjectId}`)}
              className="mt-7 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black"
            >
              Retour au projet
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
        <div className="mx-auto max-w-[1340px]">
          <button
            onClick={() => router.push(`/projects/${realProjectId}`)}
            className="mb-8 flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Retour au Kanban
          </button>

          <header className="mb-8 grid grid-cols-[1fr_340px] gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                Planification des sous-tâches
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {task.name || "Tâche"}
              </h1>

              <p className="mt-3 flex items-center gap-2 text-sm text-white/45">
                <FolderKanban size={15} />
                Projet : {project?.name || "Projet"}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/40">
                <span className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2">
                  <CalendarDays size={15} />
                  {formatDate(getTaskDate(task))}
                </span>

                {getTaskHour(task) && (
                  <span className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2">
                    <Clock3 size={15} />
                    {getTaskHour(task)}
                  </span>
                )}

                <span
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2 ${
                    isDone(task)
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.035] text-white/40"
                  }`}
                >
                  <CheckSquare size={15} />
                  {isDone(task) ? "Tâche terminée" : "Tâche active"}
                </span>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/45">Progression</p>
                  <p className="mt-1 text-xs text-white/30">
                    {progress.label}
                  </p>
                </div>

                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#22c55e ${
                        progress.percent * 3.6
                      }deg, rgba(255,255,255,0.10) 0deg)`,
                    }}
                  />

                  <div className="absolute inset-[9px] rounded-full bg-[#030712]" />

                  <div className="relative text-center">
                    <p className="text-xl font-bold text-white">
                      {progress.percent}%
                    </p>
                    <p className="text-[10px] text-white/35">validé</p>
                  </div>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-white/35">
                {progress.done}/{progress.total} élément(s) validé(s)
              </p>

              <button
                onClick={toggleTaskDone}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                  isDone(task)
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                <CheckSquare size={17} />
                {isDone(task) ? "Tâche terminée" : "Marquer la tâche terminée"}
              </button>
            </div>
          </header>

          <section className="mb-8 rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex gap-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSubtask();
                }}
                placeholder="Ajouter une nouvelle sous-tâche..."
                className="h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-sm text-white outline-none placeholder:text-white/35"
              />

              <button
                onClick={addSubtask}
                className="flex h-[52px] items-center gap-2 rounded-2xl bg-white px-6 text-sm font-semibold text-black hover:bg-white/90"
              >
                <Plus size={18} />
                Ajouter
              </button>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ListChecks size={22} className="text-white/45" />

                <div>
                  <h2 className="text-2xl font-semibold">
                    Tableau de planification
                  </h2>

                  <p className="mt-1 text-sm text-white/35">
                    Clique sur une case pour programmer et valider une sous-tâche.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/50"
                >
                  <ChevronLeft size={17} />
                </button>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/45">
                  {weekStartLabel} - {weekEndLabel}
                </div>

                <button
                  onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/50"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            {subtasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">
                Aucune sous-tâche. Ajoute les étapes de cette tâche.
              </div>
            )}

            {subtasks.length > 0 && (
              <div className="overflow-hidden rounded-[28px] border border-white/10">
                <div className="grid grid-cols-[minmax(280px,1.4fr)_repeat(7,minmax(84px,1fr))_120px] border-b border-white/10 bg-white/[0.045]">
                  <div className="px-5 py-4 text-sm font-semibold text-white/70">
                    Sous-tâche
                  </div>

                  {weekDates.map((date, index) => (
                    <div
                      key={dateKey(date)}
                      className="border-l border-white/10 px-3 py-4 text-center"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        {weekLabels[index]}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {date.getDate()}
                      </p>
                    </div>
                  ))}

                  <div className="border-l border-white/10 px-4 py-4 text-center text-sm font-semibold text-white/70">
                    Progression
                  </div>
                </div>

                {subtasks.map((subtask, index) => {
                  const subProgress = getSubtaskWeekProgress(
                    subtask,
                    schedules,
                    weekDates
                  );

                  return (
                    <div
                      key={subtask.id}
                      className="grid grid-cols-[minmax(280px,1.4fr)_repeat(7,minmax(84px,1fr))_120px] border-b border-white/10 bg-black/20 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-4 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white/60">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {subtask.title}
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            {subProgress.done}/{subProgress.total} jour(s)
                            validé(s)
                          </p>
                        </div>

                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className="ml-auto text-white/25 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {weekDates.map((date) => {
                        const key = dateKey(date);

                        const schedule = getScheduleForSubtask(
                          subtask.id,
                          key,
                          schedules
                        );

                        const checked = schedule?.done === true;
                        const planned = Boolean(schedule);

                        return (
                          <div
                            key={`${subtask.id}-${key}`}
                            className="flex items-center justify-center border-l border-white/10 px-3 py-4"
                          >
                            <button
                              onClick={() => toggleScheduleCell(subtask, key)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                clearScheduleCell(subtask, key);
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:scale-105 ${
                                checked
                                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                                  : planned
                                  ? "border-sky-400/35 bg-sky-500/10 text-sky-300"
                                  : "border-white/10 bg-white/[0.035] text-white/25"
                              }`}
                            >
                              {checked ? (
                                <CheckCircle2 size={20} />
                              ) : planned ? (
                                <Circle size={20} />
                              ) : (
                                <Plus size={15} />
                              )}
                            </button>
                          </div>
                        );
                      })}

                      <div className="flex items-center justify-center border-l border-white/10 px-4 py-4">
                        <div className="w-full">
                          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold">
                            <Target size={14} className="text-white/35" />
                            {subProgress.percent}%
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${subProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {subtasks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/35">
                <span>Non planifié : +</span>
                <span>Programmé : cercle bleu</span>
                <span>Validé : coche verte</span>
                <span>Clic droit : retirer la programmation</span>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}