"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SLOT_HEIGHT = 76;
const hours = Array.from({ length: 15 }, (_, i) => i + 7);

const weekLabels = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getMonthGrid(date: Date) {
  const start = startOfWeek(startOfMonth(date));
  const end = addDays(startOfWeek(endOfMonth(date)), 6);

  const days: Date[] = [];
  let current = new Date(start);

  while (current <= end) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }

  return days;
}

function formatShortDate(value: Date) {
  const d = String(value.getDate()).padStart(2, "0");
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const y = value.getFullYear();

  return `${d}/${m}/${y}`;
}

function getTaskDate(task: any) {
  const value = task?.due_date || task?.date || task?.deadline;
  if (!value) return "";

  return String(value).slice(0, 10);
}

function getTaskHour(task: any) {
  if (task?.hour) return String(task.hour).slice(0, 5);
  if (task?.start_time) return String(task.start_time).slice(0, 5);

  return "";
}

function getTaskEndHour(task: any) {
  if (task?.end_time) return String(task.end_time).slice(0, 5);

  const start = getTaskHour(task);
  if (!start) return "";

  const [h, m] = start.split(":").map(Number);

  const endDate = new Date();
  endDate.setHours(h + 1, m || 0, 0, 0);

  return `${String(endDate.getHours()).padStart(2, "0")}:${String(
    endDate.getMinutes()
  ).padStart(2, "0")}`;
}

function minutesFromStart(hour: string) {
  if (!hour) return 60;

  const [h, m] = hour.split(":").map(Number);

  return (h - 7) * SLOT_HEIGHT + ((m || 0) / 60) * SLOT_HEIGHT;
}

function hourFromSlot(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function normalizeColor(color: string | null | undefined) {
  if (!color) return "#64748b";

  const value = String(color).trim();

  if (value.startsWith("#")) return value;

  const namedColors: Record<string, string> = {
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    pink: "#ec4899",
    slate: "#64748b",
    gray: "#64748b",
  };

  return namedColors[value.toLowerCase()] || "#64748b";
}

function getProjectForTask(task: any, projects: any[]) {
  if (!task?.project_id) return null;

  return projects.find((project) => project.id === task.project_id) || null;
}

function getProjectName(task: any, projects: any[]) {
  const project = getProjectForTask(task, projects);

  return project?.name || null;
}

function getTaskColor(task: any, projects: any[]) {
  const project = getProjectForTask(task, projects);

  return normalizeColor(
    task?.color ||
      task?.color_hex ||
      task?.task_color ||
      project?.color ||
      project?.color_hex ||
      project?.project_color ||
      null
  );
}

function isDone(task: any) {
  return task?.done === true || task?.status === "done";
}

function taskTitle(task: any) {
  return task?.name || task?.title || "Sans titre";
}

function isSameMonth(date: Date, current: Date) {
  return (
    date.getFullYear() === current.getFullYear() &&
    date.getMonth() === current.getMonth()
  );
}

export default function CalendarPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"week" | "month" | "year">("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDates = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [currentDate]);

  const monthGrid = useMemo(() => {
    return getMonthGrid(currentDate);
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });

    if (tasksError) {
      alert(tasksError.message);
      setLoading(false);
      return;
    }

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (projectsError) {
      alert(projectsError.message);
      setLoading(false);
      return;
    }

    setTasks(tasksData || []);
    setProjects(projectsData || []);
    setLoading(false);
  }

  function openTaskFromCalendar(task: any) {
    if (!task) return;

    if (task.project_id) {
      router.push(`/projects/${task.project_id}/tasks/${task.id}`);
      return;
    }

    router.push("/tasks");
  }

  async function moveTask(taskId: string, newDate: string, newHour?: string) {
    const payload: any = {
      due_date: newDate,
      date: newDate,
      deadline: newDate,
    };

    if (newHour) {
      payload.hour = newHour;
      payload.start_time = newHour;
    }

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        return {
          ...task,
          ...payload,
        };
      })
    );
  }

  function goPrevious() {
    if (view === "week") {
      setCurrentDate(addDays(currentDate, -7));
      return;
    }

    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
      return;
    }

    setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
  }

  function goNext() {
    if (view === "week") {
      setCurrentDate(addDays(currentDate, 7));
      return;
    }

    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
      return;
    }

    setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function handleDrop(e: React.DragEvent, newDate: string, newHour?: string) {
    e.preventDefault();

    const taskId = e.dataTransfer.getData("taskId");

    if (!taskId) return;

    moveTask(taskId, newDate, newHour);
  }

  const currentTitle = useMemo(() => {
    if (view === "week") {
      return `${formatShortDate(weekDates[0])} - ${formatShortDate(
        weekDates[6]
      )}`;
    }

    if (view === "month") {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    return String(currentDate.getFullYear());
  }, [view, currentDate, weekDates]);

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#030712] text-white">
        <Sidebar />

        <section className="flex flex-1 items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-5 text-white/45">
            Chargement du calendrier...
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
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                CALENDRIER
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                {view === "year"
                  ? "Agenda annee"
                  : view === "month"
                  ? "Agenda mois"
                  : "Agenda semaine"}
              </h1>

              <p className="mt-3 text-base text-white/45">
                Taches, routines, projets et planning horaire.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={goToday}
                className="h-[52px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
              >
                Aujourd'hui
              </button>

              <button
                onClick={goPrevious}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={goNext}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </header>

          <section className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="text-white/45" />
                <h2 className="text-xl font-semibold">{currentTitle}</h2>
              </div>

              <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
                <button
                  onClick={() => setView("week")}
                  className={`rounded-xl px-5 py-2 text-sm transition ${
                    view === "week"
                      ? "bg-white text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Semaine
                </button>

                <button
                  onClick={() => setView("month")}
                  className={`rounded-xl px-5 py-2 text-sm transition ${
                    view === "month"
                      ? "bg-white text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Mois
                </button>

                <button
                  onClick={() => setView("year")}
                  className={`rounded-xl px-5 py-2 text-sm transition ${
                    view === "year"
                      ? "bg-white text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Annee
                </button>
              </div>
            </div>
          </section>

          {view === "week" && (
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="grid grid-cols-[90px_repeat(7,1fr)] border-b border-white/10">
                <div className="px-5 py-5 text-xs text-white/35">Heure</div>

                {weekDates.map((date, index) => (
                  <div
                    key={dateKey(date)}
                    className="border-l border-white/10 px-5 py-5 text-center"
                  >
                    <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                      {weekLabels[index]}
                    </p>

                    <p className="mt-3 text-2xl font-semibold">
                      {date.getDate()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[90px_repeat(7,1fr)]">
                <div>
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-[76px] border-b border-white/10 px-5 pt-4 text-xs text-white/35"
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {weekDates.map((date) => {
                  const key = dateKey(date);
                  const dayTasks = tasks.filter(
                    (task) => getTaskDate(task) === key
                  );

                  return (
                    <div
                      key={key}
                      className="relative border-l border-white/10"
                      style={{ height: hours.length * SLOT_HEIGHT }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          onDrop={(e) => handleDrop(e, key, hourFromSlot(hour))}
                          className="h-[76px] border-b border-white/10"
                        />
                      ))}

                      {dayTasks.map((task) => {
                        const start = getTaskHour(task) || "08:00";
                        const end = getTaskEndHour(task);
                        const color = getTaskColor(task, projects);
                        const projectName = getProjectName(task, projects);

                        return (
                          <div
                            key={task.id}
                            draggable
                            onClick={() => openTaskFromCalendar(task)}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("taskId", task.id);
                            }}
                            className={`absolute left-2 right-2 z-10 cursor-pointer overflow-hidden rounded-xl px-3 py-2 text-xs text-white shadow-md transition hover:scale-[1.01] hover:bg-white/[0.08] ${
                              isDone(task) ? "opacity-55" : ""
                            }`}
                            style={{
                              top: `${minutesFromStart(start)}px`,
                              minHeight: "48px",
                              background: "rgba(15, 23, 42, 0.72)",
                              borderLeft: `4px solid ${color}`,
                              borderTop: `2px solid ${color}`,
                              borderRight: "1px solid rgba(255,255,255,0.08)",
                              borderBottom:
                                "1px solid rgba(255,255,255,0.08)",
                              boxShadow: `0 0 12px ${color}35`,
                              backdropFilter: "blur(14px)",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold">
                                {taskTitle(task)}
                              </p>

                              {isDone(task) && <CheckCircle2 size={14} />}
                            </div>

                            <p className="mt-1 truncate text-[11px] text-white/75">
                              {start}
                              {end ? ` - ${end}` : ""}
                            </p>

                            {projectName && (
                              <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-white/65">
                                <FolderKanban size={11} />
                                {projectName}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {view === "month" && (
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="grid grid-cols-7 border-b border-white/10">
                {weekLabels.map((label) => (
                  <div
                    key={label}
                    className="border-l border-white/10 px-4 py-4 text-center text-xs uppercase tracking-[0.25em] text-white/35 first:border-l-0"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthGrid.map((date) => {
                  const key = dateKey(date);
                  const dayTasks = tasks
                    .filter((task) => getTaskDate(task) === key)
                    .sort((a, b) =>
                      getTaskHour(a).localeCompare(getTaskHour(b))
                    );

                  return (
                    <div
                      key={key}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, key)}
                      className={`min-h-[140px] border-l border-t border-white/10 p-3 first:border-l-0 ${
                        isSameMonth(date, currentDate)
                          ? "bg-white/[0.015]"
                          : "bg-black/20 opacity-50"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          {date.getDate()}
                        </p>

                        {dayTasks.length > 0 && (
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/50">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {dayTasks.slice(0, 3).map((task) => {
                          const color = getTaskColor(task, projects);

                          return (
                            <div
                              key={task.id}
                              draggable
                              onClick={() => openTaskFromCalendar(task)}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("taskId", task.id);
                              }}
                              className={`cursor-pointer truncate rounded-lg border border-white/10 px-2 py-1 text-xs text-white transition hover:scale-[1.01] hover:bg-white/[0.08] ${
                                isDone(task) ? "opacity-55" : ""
                              }`}
                              style={{
                                background: "rgba(15, 23, 42, 0.72)",
                                borderLeft: `3px solid ${color}`,
                                borderTop: `1px solid ${color}`,
                                boxShadow: `0 0 8px ${color}30`,
                                backdropFilter: "blur(10px)",
                              }}
                            >
                              {getTaskHour(task) || "--:--"} ·{" "}
                              {taskTitle(task)}
                            </div>
                          );
                        })}

                        {dayTasks.length > 3 && (
                          <p className="text-xs text-white/35">
                            +{dayTasks.length - 3} autre(s)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {view === "year" && (
            <section className="grid grid-cols-3 gap-5">
              {monthNames.map((month, monthIndex) => {
                const monthTasks = tasks.filter((task) => {
                  const value = getTaskDate(task);
                  if (!value) return false;

                  const d = new Date(value);

                  return (
                    d.getFullYear() === currentDate.getFullYear() &&
                    d.getMonth() === monthIndex
                  );
                });

                const doneCount = monthTasks.filter(isDone).length;

                const progress =
                  monthTasks.length > 0
                    ? Math.round((doneCount / monthTasks.length) * 100)
                    : 0;

                const colors = Array.from(
                  new Set(monthTasks.map((task) => getTaskColor(task, projects)))
                );

                return (
                  <div
                    key={month}
                    className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">{month}</h2>

                        <p className="mt-1 text-xs text-white/35">
                          {monthTasks.length} tache(s) · {progress}% termine
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setCurrentDate(
                            new Date(currentDate.getFullYear(), monthIndex, 1)
                          );
                          setView("month");
                        }}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50 transition hover:bg-white/20 hover:text-white"
                      >
                        Ouvrir
                      </button>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-4 flex gap-2">
                      {colors.slice(0, 6).map((color) => (
                        <span
                          key={color}
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: color,
                            boxShadow: `0 0 10px ${color}`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="mt-5 space-y-2">
                      {monthTasks.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">
                          Aucun evenement
                        </div>
                      )}

                      {monthTasks.slice(0, 4).map((task) => {
                        const color = getTaskColor(task, projects);

                        return (
                          <div
                            key={task.id}
                            onClick={() => openTaskFromCalendar(task)}
                            className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs transition hover:bg-white/[0.08]"
                            style={{
                              borderLeft: `3px solid ${color}`,
                              borderTop: `1px solid ${color}`,
                              boxShadow: `0 0 8px ${color}25`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor: color,
                                  boxShadow: `0 0 8px ${color}`,
                                }}
                              />

                              <span className="truncate text-white/80">
                                {taskTitle(task)}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {monthTasks.length > 4 && (
                        <p className="text-xs text-white/35">
                          +{monthTasks.length - 4} autre(s)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}