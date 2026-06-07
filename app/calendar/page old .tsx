"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CalendarView = "week" | "month" | "year";

const weekDays = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const hours = Array.from({ length: 15 }, (_, i) => i + 7);
const SLOT_HEIGHT = 92;

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

function getTaskDate(task: any) {
  if (task.due_date) return task.due_date;
  if (task.date) return task.date;
  if (task.deadline) return task.deadline;
  return null;
}

function getTaskHour(task: any) {
  if (task.hour) return String(task.hour).slice(0, 5);
  if (task.start_time) return String(task.start_time).slice(0, 5);
  return "";
}

function getTaskEndHour(task: any) {
  if (task.end_time) return String(task.end_time).slice(0, 5);

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
  return (h - 7) * 60 + (m || 0);
}

function durationMinutes(task: any) {
  const start = getTaskHour(task);
  const end = getTaskEndHour(task);

  if (!start || !end) return 60;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const duration = eh * 60 + em - (sh * 60 + sm);
  return Math.max(duration, 40);
}

function getProject(task: any, projects: any[]) {
  return projects.find((p) => p.id === task.project_id) || null;
}

function getTaskColor(task: any, projects: any[]) {
  const project = getProject(task, projects);
  return project?.color || task.color || "#64748b";
}

function getProjectName(task: any, projects: any[]) {
  const project = getProject(task, projects);
  return project?.name || task.category || "Personnel";
}

export default function CalendarPage() {
  const today = new Date();

  const [view, setView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState(today);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: projectData } = await supabase.from("projects").select("*");

    setTasks(taskData || []);
    setProjects(projectData || []);
  }

  function goPrevious() {
    if (view === "week") {
      setCurrentDate(addDays(currentDate, -7));
    }

    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    }

    if (view === "year") {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
    }
  }

  function goNext() {
    if (view === "week") {
      setCurrentDate(addDays(currentDate, 7));
    }

    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    }

    if (view === "year") {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    }
  }

  const weekStart = startOfWeek(currentDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const title = useMemo(() => {
    if (view === "week") {
      const start = weekDates[0].toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      });

      const end = weekDates[6].toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return `${start} - ${end}`;
    }

    if (view === "month") {
      return currentDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
    }

    return String(currentDate.getFullYear());
  }, [view, currentDate]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-7 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                Calendrier
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {view === "week" && "Agenda semaine"}
                {view === "month" && "Agenda mois"}
                {view === "year" && "Agenda année"}
              </h1>

              <p className="mt-2 text-white/45">
                Tâches, routines, projets et planning horaire.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.07]"
              >
                Aujourd’hui
              </button>

              <button
                onClick={goPrevious}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] transition hover:bg-white/[0.07]"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={goNext}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] transition hover:bg-white/[0.07]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </header>

          <section className="mb-6 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-white/45" />
              <h2 className="text-xl font-semibold capitalize">{title}</h2>
            </div>

            <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
              <button
                onClick={() => setView("week")}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                  view === "week"
                    ? "bg-white text-black"
                    : "text-white/55 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                Semaine
              </button>

              <button
                onClick={() => setView("month")}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                  view === "month"
                    ? "bg-white text-black"
                    : "text-white/55 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                Mois
              </button>

              <button
                onClick={() => setView("year")}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                  view === "year"
                    ? "bg-white text-black"
                    : "text-white/55 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                Année
              </button>
            </div>
          </section>

          {view === "week" && (
            <WeekView
              weekDates={weekDates}
              tasks={tasks}
              projects={projects}
              today={today}
            />
          )}

          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              tasks={tasks}
              projects={projects}
              today={today}
            />
          )}

          {view === "year" && (
            <YearView
              currentDate={currentDate}
              tasks={tasks}
              projects={projects}
              today={today}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function WeekView({
  weekDates,
  tasks,
  projects,
  today,
}: {
  weekDates: Date[];
  tasks: any[];
  projects: any[];
  today: Date;
}) {
  const todayKey = dateKey(today);

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20">
      <div className="grid grid-cols-[78px_repeat(7,1fr)] border-b border-white/10">
        <div className="border-r border-white/10 p-4 text-xs text-white/35">
          Heure
        </div>

        {weekDates.map((date, index) => {
          const key = dateKey(date);
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`border-r border-white/10 p-4 text-center last:border-r-0 ${
                isToday ? "bg-white/[0.06]" : ""
              }`}
            >
              <p className="text-[11px] tracking-[0.25em] text-white/35">
                {weekDays[index]}
              </p>

              <p className="mt-2 text-2xl font-semibold">{date.getDate()}</p>
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-[78px_repeat(7,1fr)] overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 315px)" }}
      >
        <div>
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b border-white/5 pr-3 pt-3 text-right text-xs text-white/35"
              style={{ height: SLOT_HEIGHT }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {weekDates.map((date) => {
          const key = dateKey(date);
          const dayTasks = tasks.filter((task) => getTaskDate(task) === key);

          return (
            <div
              key={key}
              className="relative border-l border-white/5"
              style={{ height: hours.length * SLOT_HEIGHT }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-white/5"
                  style={{ height: SLOT_HEIGHT }}
                />
              ))}

              {dayTasks.map((task) => {
                const start = getTaskHour(task) || "08:00";
                const top = (minutesFromStart(start) / 60) * SLOT_HEIGHT;

                const height = Math.max(
                  (durationMinutes(task) / 60) * SLOT_HEIGHT,
                  58
                );

                const color = getTaskColor(task, projects);
                const projectName = getProjectName(task, projects);

                return (
                  <div
                    key={task.id}
                    className="absolute left-2 right-2 rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-xl shadow-black/30 transition hover:z-20 hover:scale-[1.025] hover:bg-white/[0.075]"
                    style={{
                      top,
                      height,
                      boxShadow: `inset 4px 0 0 ${color}, 0 20px 50px rgba(0,0,0,.35)`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {task.name || task.title || "Sans titre"}
                      </p>

                      <MoreHorizontal size={16} className="text-white/35" />
                    </div>

                    <p className="mt-2 text-xs text-white/55">
                      {start}
                      {getTaskEndHour(task) ? ` - ${getTaskEndHour(task)}` : ""}
                    </p>

                    <p className="mt-1 truncate text-xs text-white/35">
                      {projectName}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MonthView({
  currentDate,
  tasks,
  projects,
  today,
}: {
  currentDate: Date;
  tasks: any[];
  projects: any[];
  today: Date;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startDay);

  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayKey = dateKey(today);

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20">
      <div className="grid grid-cols-7 border-b border-white/10">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-4 text-center text-[11px] font-medium tracking-[0.25em] text-white/35"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = dateKey(date);
          const isToday = key === todayKey;
          const isCurrentMonth = date.getMonth() === month;

          const dayTasks = tasks
            .filter((task) => getTaskDate(task) === key)
            .sort((a, b) => getTaskHour(a).localeCompare(getTaskHour(b)));

          return (
            <div
              key={key}
              className={`min-h-[155px] border border-white/5 p-3 transition hover:bg-white/[0.055] ${
                !isCurrentMonth ? "opacity-35" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-white text-black" : "text-white/80"
                  }`}
                >
                  {date.getDate()}
                </p>

                {dayTasks.length > 0 && (
                  <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-white/40">
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
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-xs transition hover:bg-white/[0.075]"
                      style={{
                        boxShadow: `inset 3px 0 0 ${color}`,
                      }}
                    >
                      <p className="truncate font-semibold">
                        {task.name || task.title || "Sans titre"}
                      </p>

                      <div className="mt-1 flex items-center gap-1 text-[10px] text-white/35">
                        <Clock3 size={10} />
                        {getTaskHour(task) || "--:--"}
                      </div>
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
  );
}

function YearView({
  currentDate,
  tasks,
  projects,
  today,
}: {
  currentDate: Date;
  tasks: any[];
  projects: any[];
  today: Date;
}) {
  const year = currentDate.getFullYear();
  const todayKey = dateKey(today);

  const months = Array.from({ length: 12 }, (_, month) => {
    const date = new Date(year, month, 1);

    return {
      date,
      label: date.toLocaleDateString("fr-FR", { month: "long" }),
    };
  });

  return (
    <section className="grid grid-cols-3 gap-5">
      {months.map((monthItem) => {
        const month = monthItem.date.getMonth();

        const monthTasks = tasks.filter((task) => {
          const d = getTaskDate(task);
          if (!d) return false;

          const [taskYear, taskMonth] = d.split("-").map(Number);

          return taskYear === year && taskMonth === month + 1;
        });

        return (
          <div
            key={monthItem.label}
            className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 transition hover:bg-white/[0.065]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="capitalize text-xl font-semibold">
                {monthItem.label}
              </h3>

              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/40">
                {monthTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {monthTasks.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/30">
                  Aucun événement
                </p>
              )}

              {monthTasks.slice(0, 5).map((task) => {
                const color = getTaskColor(task, projects);
                const d = getTaskDate(task);

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm transition hover:bg-white/[0.075]"
                    style={{
                      boxShadow: `inset 4px 0 0 ${color}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold">
                        {task.name || task.title || "Sans titre"}
                      </p>

                      <span
                        className={`text-xs ${
                          d === todayKey ? "text-green-300" : "text-white/35"
                        }`}
                      >
                        {d?.split("-").reverse().join("/")}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-white/35">
                      <FolderKanban size={12} />
                      {getProjectName(task, projects)}
                    </div>
                  </div>
                );
              })}

              {monthTasks.length > 5 && (
                <p className="text-xs text-white/35">
                  +{monthTasks.length - 5} autre(s)
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}