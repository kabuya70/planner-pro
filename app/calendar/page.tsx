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
  return date.toISOString().split("T")[0];
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
  return t ? t.slice(0, 5) : "--:--";
}

function timeToMinutes(time?: string) {
  if (!time) return START_HOUR * 60;
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
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
    return tasks.filter((task) => task.date === key);
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
              Les tâches occupent maintenant leur vraie durée.
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
                      className="border-b border-white/[0.035]"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}

                  {tasksForDay(date).map((task) => {
                    const project = getProject(task);
                    const color = project?.color || "#6b7280";

                    return (
                      <button
                        key={task.id}
                        onClick={() =>
                          setSelectedTask({
                            ...task,
                            projectName: project?.name || "Sans projet",
                            color,
                          })
                        }
                        className="absolute left-2 right-2 z-10 rounded-2xl border border-white/10 bg-white/[0.075] p-3 text-left shadow-xl backdrop-blur-xl transition hover:scale-[1.015] hover:bg-white/[0.11]"
                        style={{
                          top: taskTop(task.start_time),
                          height: taskHeight(task.start_time, task.end_time),
                          boxShadow: `inset 4px 0 0 ${color}, 0 18px 45px rgba(0,0,0,.22)`,
                        }}
                      >
                        <p className="truncate text-sm font-semibold">
                          {task.name || "Sans titre"}
                        </p>

                        <p className="mt-1 text-xs text-white/45">
                          {formatTime(task.start_time)} -{" "}
                          {formatTime(task.end_time)}
                        </p>

                        <p className="mt-1 truncate text-[11px] text-white/30">
                          {project?.name || "Sans projet"}
                        </p>
                      </button>
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
                  Détail tâche
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
              <Info label="Projet" value={selectedTask.projectName} />
              <Info label="Date" value={selectedTask.date || "Sans date"} />
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