"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 82;

const hours = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i
);

const daysLabel = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date) {
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

function formatTime(t?: string) {
  return t ? String(t).slice(0, 5) : "--:--";
}

function timeToMinutes(time?: string) {
  if (!time) return START_HOUR * 60;
  const [h, m] = String(time).slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function taskTop(start?: string) {
  const minutes = timeToMinutes(start);
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function taskHeight(start?: string, end?: string) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end || start);
  const duration = Math.max(e - s, 30);
  return Math.max((duration / 60) * HOUR_HEIGHT, 42);
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [draggedTask, setDraggedTask] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: tasksData } = await supabase.from("tasks").select("*");
    const { data: projectsData } = await supabase.from("projects").select("*");

    setTasks(tasksData || []);
    setProjects(projectsData || []);
  }

  function getProject(task: any) {
    return projects.find((p) => p.id === task.project_id);
  }

  function getTaskColor(task: any) {
    const project = getProject(task);
    return project?.color || task.color || "#64748b";
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  const weekTitle = `${weekDays[0].toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })} - ${weekDays[6].toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;

  function tasksForDay(date: Date) {
    const key = toKey(date);

    return tasks.filter((task) => {
      if (task.type === "routine" || task.category === "Routine") {
        return true;
      }

      return task.date === key;
    });
  }

  async function moveTask(task: any, date: Date, hour: number) {
    const startMinutes = hour * 60;

    const oldStart = timeToMinutes(task.start_time);
    const oldEnd = timeToMinutes(task.end_time || task.start_time);
    const duration = Math.max(oldEnd - oldStart, 30);

    const newStart = minutesToTime(startMinutes);
    const newEnd = minutesToTime(
      Math.min(startMinutes + duration, END_HOUR * 60)
    );

    const updatePayload: any = {
      start_time: newStart,
      end_time: newEnd,
    };

    if (!(task.type === "routine" || task.category === "Routine")) {
      updatePayload.date = toKey(date);
    }

    const { error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", task.id);

    if (!error) {
      setDraggedTask(null);
      loadData();
    }
  }

  async function toggleDone(task: any) {
    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    setSelectedTask(null);
    loadData();
  }

  async function deleteTask(task: any) {
    await supabase.from("tasks").delete().eq("id", task.id);
    setSelectedTask(null);
    loadData();
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white flex overflow-hidden">
      <Sidebar />

      <section className="flex-1 p-6 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
              Calendrier
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Agenda semaine
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Tâches, routines, projets et planning horaire.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentWeek(getMonday(new Date()))}
              className="soft-button rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm"
            >
              Aujourd’hui
            </button>

            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              className="soft-button rounded-2xl border border-white/10 bg-white/[0.05] p-2"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              className="soft-button rounded-2xl border border-white/10 bg-white/[0.05] p-2"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        <section className="glass-card rounded-[28px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-white/45" />
              <p className="font-semibold">{weekTitle}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
              Vue semaine 
            </div>
          </div>

          <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-white/10 bg-white/[0.02]">
            <div />
            {weekDays.map((date, i) => {
              const today = toKey(date) === toKey(new Date());

              return (
                <div
                  key={toKey(date)}
                  className={`border-l border-white/[0.06] px-3 py-4 text-center ${
                    today ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <p className="text-xs uppercase tracking-widest text-white/35">
                    {daysLabel[i]}
                  </p>
                  <p className="mt-1 text-xl font-semibold">{date.getDate()}</p>
                </div>
              );
            })}
          </div>

          <div className="max-h-[64vh] overflow-y-auto">
            <div
              className="grid grid-cols-[72px_repeat(7,1fr)]"
              style={{ height: hours.length * HOUR_HEIGHT }}
            >
              <div className="relative border-r border-white/[0.06]">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-white/[0.04] px-3 pt-2 text-xs text-white/30"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {weekDays.map((date) => (
                <div
                  key={toKey(date)}
                  className="relative border-r border-white/[0.04]"
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedTask) {
                          moveTask(draggedTask, date, hour);
                        }
                      }}
                      className={`border-b border-white/[0.035] transition ${
                        draggedTask ? "hover:bg-white/[0.06]" : ""
                      }`}
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}

                  {tasksForDay(date).map((task) => {
                    const project = getProject(task);
                    const color = getTaskColor(task);
                    const isRoutine =
                      task.type === "routine" || task.category === "Routine";

                    return (
                      <div
                        key={`${task.id}-${toKey(date)}`}
                        draggable
                        onDragStart={() => setDraggedTask(task)}
                        onDragEnd={() => setDraggedTask(null)}
                        onClick={() =>
                          setSelectedTask({
                            ...task,
                            currentDate: toKey(date),
                            projectName: project?.name || null,
                            color,
                            isRoutine,
                          })
                        }
                        className="absolute left-2 right-2 z-30 cursor-grab rounded-2xl border border-white/10 bg-white/[0.075] p-3 text-left shadow-xl backdrop-blur-xl transition active:cursor-grabbing hover:scale-[1.015] hover:bg-white/[0.11]"
                        style={{
                          top: taskTop(task.start_time),
                          height: taskHeight(task.start_time, task.end_time),
                          boxShadow: `inset 4px 0 0 ${color}, 0 18px 45px rgba(0,0,0,.22)`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {task.name || "Sans titre"}
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask({
                                ...task,
                                currentDate: toKey(date),
                                projectName: project?.name || null,
                                color,
                                isRoutine,
                              });
                            }}
                            className="text-white/45 hover:text-white"
                          >
                            ⋯
                          </button>
                        </div>

                        <p className="mt-1 text-xs text-white/45">
                          {formatTime(task.start_time)} -{" "}
                          {formatTime(task.end_time)}
                        </p>

                        <p className="mt-1 truncate text-[11px] text-white/30">
                          {project?.name ||
                            task.category ||
                            "Sans catégorie"}
                        </p>

                        
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="glass-card w-full max-w-lg rounded-[28px] p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                  {selectedTask.isRoutine ? "Routine" : "Détail tâche"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedTask.name}
                </h2>
              </div>

              <button onClick={() => setSelectedTask(null)}>
                <X className="text-white/45 hover:text-white" />
              </button>
            </div>

            <div className="space-y-3">
              <Info
                label="Type"
                value={
                  selectedTask.isRoutine
                    ? "Routine quotidienne"
                    : selectedTask.projectName
                    ? "Tâche de projet"
                    : "Tâche simple"
                }
              />

              <Info
                label="Projet / catégorie"
                value={
                  selectedTask.projectName ||
                  selectedTask.category ||
                  "Sans catégorie"
                }
              />

              <Info
                label="Date"
                value={
                  selectedTask.isRoutine
                    ? `Tous les jours · affichée le ${selectedTask.currentDate}`
                    : selectedTask.date || "Sans date"
                }
              />

              <Info
                label="Horaire"
                value={`${formatTime(selectedTask.start_time)} - ${formatTime(
                  selectedTask.end_time
                )}`}
              />

              <Info
                label="Priorité"
                value={selectedTask.priority || "Normal"}
              />

              <Info
                label="Description"
                value={selectedTask.description || "Aucune description"}
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => toggleDone(selectedTask)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold hover:bg-white/[0.12]"
              >
                {selectedTask.done ? "Réouvrir" : "Terminer"}
              </button>

              <button
                onClick={() => {
                  window.location.href = "/tasks";
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold hover:bg-white/[0.12]"
              >
                Modifier
              </button>

              <button
                onClick={() => deleteTask(selectedTask)}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}