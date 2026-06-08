"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
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
  const value = task.due_date || task.date || task.deadline;
  if (!value) return null;
  return String(value).slice(0, 10);
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

function hourFromSlot(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function normalizeColor(color: string | null | undefined) {
  if (!color) return "#64748b";

  const value = String(color).trim();

  const map: Record<string, string> = {
    red: "#ef4444",
    rouge: "#ef4444",
    blue: "#3b82f6",
    bleu: "#3b82f6",
    green: "#22c55e",
    vert: "#22c55e",
    yellow: "#eab308",
    jaune: "#eab308",
    orange: "#f97316",
    purple: "#8b5cf6",
    violet: "#8b5cf6",
    gray: "#64748b",
    gris: "#64748b",
    black: "#111827",
    noir: "#111827",
  };

  if (map[value.toLowerCase()]) return map[value.toLowerCase()];

  return value;
}

function getProject(task: any, projects: any[]) {
  return projects.find((p) => p.id === task.project_id) || null;
}

function getTaskColor(task: any, projects: any[]) {
  const project = getProject(task, projects);

  return normalizeColor(
    task.color ||
      task.color_hex ||
      task.task_color ||
      project?.color ||
      project?.color_hex ||
      project?.project_color ||
      "#64748b"
  );
}

function getProjectName(task: any, projects: any[]) {
  const project = getProject(task, projects);
  return project?.name || task.category || "Personnel";
}

function isDone(task: any) {
  return task.done === true || task.status === "done";
}

export default function CalendarPage() {
  const today = new Date();

  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState(today);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropMessage, setDropMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

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

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", currentUser.id);

    if (taskError) {
      alert(taskError.message);
    }

    if (projectError) {
      console.error(projectError.message);
    }

    setTasks(taskData || []);
    setProjects(projectData || []);
    setLoading(false);
  }

  async function moveTask(taskId: string, newDate: string, newHour?: string) {
    if (!user) return;

    const payload: any = {
      due_date: newDate,
      date: newDate,
    };

    if (newHour) {
      payload.hour = newHour;
      payload.start_time = newHour;
    }

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setDropMessage(
      newHour
        ? `Tâche déplacée au ${newDate} à ${newHour}.`
        : `Tâche déplacée au ${newDate}.`
    );

    setTimeout(() => setDropMessage(""), 2500);

    setDraggedTaskId(null);
    await loadData();
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(
    e: React.DragEvent,
    newDate: string,
    newHour?: string
  ) {
    e.preventDefault();

    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;

    if (!taskId) return;

    await moveTask(taskId, newDate, newHour);
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
  }, [view, currentDate, weekDates]);

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

          {dropMessage && (
            <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {dropMessage}
            </div>
          )}

          <section className="mb-6 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-white/45" />
              <h2 className="text-xl font-semibold capitalize">{title}</h2>
            </div>

            <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
              <ViewButton active={view === "week"} onClick={() => setView("week")}>
                Semaine
              </ViewButton>

              <ViewButton active={view === "month"} onClick={() => setView("month")}>
                Mois
              </ViewButton>

              <ViewButton active={view === "year"} onClick={() => setView("year")}>
                Année
              </ViewButton>
            </div>
          </section>

          {loading && (
            <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-12 text-center text-white/45">
              Chargement du calendrier...
            </section>
          )}

          {!loading && view === "week" && (
            <WeekView
              weekDates={weekDates}
              tasks={tasks}
              projects={projects}
              today={today}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          )}

          {!loading && view === "month" && (
            <MonthView
              currentDate={currentDate}
              tasks={tasks}
              projects={projects}
              today={today}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          )}

          {!loading && view === "year" && (
            <YearView
              currentDate={currentDate}
              tasks={tasks}
              projects={projects}
              today={today}
              onOpenMonth={(monthDate) => {
                setCurrentDate(monthDate);
                setView("month");
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-black"
          : "text-white/55 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function WeekView({
  weekDates,
  tasks,
  projects,
  today,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  weekDates: Date[];
  tasks: any[];
  projects: any[];
  today: Date;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newDate: string, newHour?: string) => void;
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
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, key, "08:00")}
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
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, key, hourFromSlot(hour))}
                  className="border-b border-white/5 transition hover:bg-white/[0.04]"
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
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    className={`absolute left-2 right-2 cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3 pl-5 shadow-xl shadow-black/30 transition active:cursor-grabbing hover:z-20 hover:scale-[1.025] hover:bg-white/[0.075] ${
                      isDone(task) ? "opacity-55" : ""
                    }`}
                    style={{
                      top,
                      height,
                    }}
                  >
                    <span
                      className="absolute left-0 top-0 z-20 h-full w-[6px] rounded-l-2xl"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 18px ${color}`,
                      }}
                    />

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
  onDragStart,
  onDragOver,
  onDrop,
}: {
  currentDate: Date;
  tasks: any[];
  projects: any[];
  today: Date;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newDate: string, newHour?: string) => void;
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
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, key, "08:00")}
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
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      className={`relative cursor-grab overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 pl-4 text-xs transition active:cursor-grabbing hover:bg-white/[0.075] ${
                        isDone(task) ? "opacity-55" : ""
                      }`}
                    >
                      <span
                        className="absolute left-0 top-0 z-20 h-full w-[5px]"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 14px ${color}`,
                        }}
                      />

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
  onOpenMonth,
}: {
  currentDate: Date;
  tasks: any[];
  projects: any[];
  today: Date;
  onOpenMonth: (monthDate: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const todayKey = dateKey(today);

  const months = Array.from({ length: 12 }, (_, month) => {
    const date = new Date(year, month, 1);

    return {
      date,
      month,
      label: date.toLocaleDateString("fr-FR", { month: "long" }),
    };
  });

  return (
    <section className="grid grid-cols-3 gap-5">
      {months.map((monthItem) => {
        const monthTasks = tasks.filter((task) => {
          const d = getTaskDate(task);
          if (!d) return false;

          const [taskYear, taskMonth] = d.split("-").map(Number);
          return taskYear === year && taskMonth === monthItem.month + 1;
        });

        const doneCount = monthTasks.filter(isDone).length;

        const progress =
          monthTasks.length > 0
            ? Math.round((doneCount / monthTasks.length) * 100)
            : 0;

        const colors = Array.from(
          new Set(monthTasks.map((task) => getTaskColor(task, projects)))
        ).slice(0, 8);

        return (
          <button
            key={monthItem.label}
            onClick={() => onOpenMonth(monthItem.date)}
            className="group rounded-[28px] border border-white/10 bg-white/[0.035] p-5 text-left shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.065]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="capitalize text-xl font-semibold">
                  {monthItem.label}
                </h3>

                <p className="mt-1 text-xs text-white/35">
                  {monthTasks.length} tâche(s) · {progress}% terminé
                </p>
              </div>

              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/45">
                Ouvrir
              </span>
            </div>

            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {colors.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {colors.map((color) => (
                  <span
                    key={color}
                    className="h-3 w-3 rounded-full ring-2 ring-white/10"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${color}`,
                    }}
                  />
                ))}
              </div>
            )}

            <div className="space-y-2">
              {monthTasks.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/30">
                  Aucun événement
                </p>
              )}

              {monthTasks.slice(0, 4).map((task) => {
                const color = getTaskColor(task, projects);
                const d = getTaskDate(task);

                return (
                  <div
                    key={task.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3 pl-5 text-sm transition group-hover:bg-white/[0.055]"
                  >
                    <span
                      className="absolute left-0 top-0 z-20 h-full w-[5px]"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 14px ${color}`,
                      }}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold">
                        {task.name || task.title || "Sans titre"}
                      </p>

                      <span
                        className={`shrink-0 text-xs ${
                          d === todayKey ? "text-green-300" : "text-white/35"
                        }`}
                      >
                        {d?.split("-").reverse().join("/")}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-white/35">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 10px ${color}`,
                        }}
                      />

                      <FolderKanban size={12} />

                      <span className="truncate">
                        {getProjectName(task, projects)}
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
          </button>
        );
      })}
    </section>
  );
}