"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  ArrowUpRight,
  Circle,
  Repeat,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type WeekDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const jsDayToWeekDay: WeekDayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

function getWeekDayKey(dateString: string): WeekDayKey {
  const date = new Date(`${dateString}T12:00:00`);
  return jsDayToWeekDay[date.getDay()];
}

function normalizeDayKey(day: any): WeekDayKey | null {
  const value = String(day || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const map: Record<string, WeekDayKey> = {
    mon: "mon",
    monday: "mon",
    lundi: "mon",
    lun: "mon",
    tue: "tue",
    tuesday: "tue",
    mardi: "tue",
    mar: "tue",
    wed: "wed",
    wednesday: "wed",
    mercredi: "wed",
    mer: "wed",
    thu: "thu",
    thursday: "thu",
    jeudi: "thu",
    jeu: "thu",
    fri: "fri",
    friday: "fri",
    vendredi: "fri",
    ven: "fri",
    sat: "sat",
    saturday: "sat",
    samedi: "sat",
    sam: "sat",
    sun: "sun",
    sunday: "sun",
    dimanche: "sun",
    dim: "sun",
  };

  return map[value] || null;
}

function getRoutineRepeatDays(task: any): WeekDayKey[] {
  const raw =
    task.repeat_days ??
    task.repeatDays ??
    task.routine_days ??
    task.week_days ??
    task.days;

  if (!raw) return [];

  let values: any[] = [];

  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      values = Array.isArray(parsed) ? parsed : raw.split(",");
    } catch {
      values = raw.split(",");
    }
  }

  return values.map(normalizeDayKey).filter(Boolean) as WeekDayKey[];
}

function routineRunsOnDate(task: any, key: string) {
  if (!isRoutine(task)) return false;

  const repeatDays = getRoutineRepeatDays(task);

  // Compatibilité avec tes anciennes routines : si aucun jour n'est encore choisi,
  // elles restent quotidiennes au lieu de disparaître.
  if (repeatDays.length === 0) return true;

  return repeatDays.includes(getWeekDayKey(key));
}

function isProjectScheduleItem(task: any) {
  return task?.__kind === "project_schedule";
}

function getTaskEndHour(task: any) {
  const value =
    task.__endTime ||
    task.end_time ||
    task.endTime ||
    task.finish_time ||
    task.finishTime;

  if (!value) return null;
  return String(value).slice(0, 5);
}

function getTaskTimeLabel(task: any) {
  const start = getTaskHour(task);
  const end = getTaskEndHour(task);

  if (end && start !== "--:--") return `${start} - ${end}`;
  return start;
}

function getScheduleDate(schedule: any) {
  const value =
    schedule.scheduled_date ||
    schedule.schedule_date ||
    schedule.planned_date ||
    schedule.date ||
    schedule.due_date ||
    schedule.day;

  if (!value) return null;
  return String(value).slice(0, 10);
}

function getScheduleStartHour(schedule: any) {
  const value =
    schedule.start_time || schedule.startTime || schedule.hour || schedule.time;

  if (!value) return "--:--";
  return String(value).slice(0, 5);
}

function getScheduleEndHour(schedule: any) {
  const value =
    schedule.end_time ||
    schedule.endTime ||
    schedule.finish_time ||
    schedule.finishTime;

  if (!value) return null;
  return String(value).slice(0, 5);
}

function scheduleToPlanningTask(
  schedule: any,
  tasks: any[],
  subtasks: any[],
  projects: any[],
) {
  const subtask = subtasks.find((item) => item.id === schedule.subtask_id);
  const parentTask = tasks.find(
    (task) => task.id === (schedule.task_id || subtask?.task_id),
  );

  if (!parentTask) return null;

  const project = projects.find((item) => item.id === parentTask.project_id);
  const scheduleDate = getScheduleDate(schedule);

  if (!scheduleDate) return null;

  return {
    ...parentTask,
    id: `schedule-${schedule.id}`,
    __kind: "project_schedule",
    __scheduleId: schedule.id,
    __subtaskId: subtask?.id || schedule.subtask_id,
    __parentTaskId: parentTask.id,
    __projectName: project?.name || "Projet",
    __color: project?.color || parentTask.color || "#3b82f6",
    __startTime: getScheduleStartHour(schedule),
    __endTime: getScheduleEndHour(schedule),
    name:
      subtask?.name ||
      subtask?.title ||
      schedule.name ||
      schedule.title ||
      parentTask.name ||
      parentTask.title ||
      "Sous-tâche programmée",
    title:
      subtask?.name ||
      subtask?.title ||
      schedule.name ||
      schedule.title ||
      parentTask.name ||
      parentTask.title ||
      "Sous-tâche programmée",
    date: scheduleDate,
    due_date: scheduleDate,
    hour: getScheduleStartHour(schedule),
    start_time: getScheduleStartHour(schedule),
    end_time: getScheduleEndHour(schedule),
    done: schedule.done === true,
    status: schedule.done ? "done" : "todo",
    project_id: parentTask.project_id,
  };
}

function sortPlanningItems(a: any, b: any) {
  return getTaskHour(a).localeCompare(getTaskHour(b));
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
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

function getTaskDate(task: any) {
  const value = task.due_date || task.date;
  if (!value) return null;
  return String(value).slice(0, 10);
}

function getTaskHour(task: any) {
  if (task.__startTime) return String(task.__startTime).slice(0, 5);
  if (task.hour) return String(task.hour).slice(0, 5);
  if (task.start_time) return String(task.start_time).slice(0, 5);
  if (task.startTime) return String(task.startTime).slice(0, 5);
  return "--:--";
}

function isRoutine(task: any) {
  return task.type === "routine" || task.category === "Routine";
}

function isDone(task: any) {
  return task?.done === true || task?.status === "done";
}

function routineDone(task: any, logs: any[], key: string) {
  return logs.some(
    (log) => log.task_id === task.id && log.completed_date === key,
  );
}

function taskColor(task: any, projects: any[]) {
  if (task.__color) return task.__color;

  const project = projects.find((p) => p.id === task.project_id);
  return project?.color || task.color || "#64748b";
}

function projectName(task: any, projects: any[]) {
  if (task.__projectName) return task.__projectName;

  return projects.find((p) => p.id === task.project_id)?.name || null;
}

function getProjectRealProgress(
  projectId: string,
  tasks: any[],
  subtasks: any[],
  schedules: any[],
) {
  const projectTasks = tasks.filter((task) => task.project_id === projectId);
  const taskIds = projectTasks.map((task) => task.id);
  const projectSubtaskIds = subtasks
    .filter((subtask) => taskIds.includes(subtask.task_id))
    .map((subtask) => subtask.id);

  const projectSchedules = schedules.filter(
    (schedule) =>
      taskIds.includes(schedule.task_id) ||
      projectSubtaskIds.includes(schedule.subtask_id),
  );

  if (projectSchedules.length > 0) {
    const done = projectSchedules.filter((schedule) => schedule.done).length;

    return {
      total: projectSchedules.length,
      done,
      percent: Math.round((done / projectSchedules.length) * 100),
      label: "case(s)",
      source: "planning",
    };
  }

  const projectSubtasks = subtasks.filter((subtask) =>
    taskIds.includes(subtask.task_id),
  );

  if (projectSubtasks.length > 0) {
    const done = projectSubtasks.filter((subtask) => subtask.done).length;

    return {
      total: projectSubtasks.length,
      done,
      percent: Math.round((done / projectSubtasks.length) * 100),
      label: "sous-tâche(s)",
      source: "sous-tâches",
    };
  }

  if (projectTasks.length > 0) {
    const done = projectTasks.filter(isDone).length;

    return {
      total: projectTasks.length,
      done,
      percent: Math.round((done / projectTasks.length) * 100),
      label: "tâche(s)",
      source: "tâches",
    };
  }

  return {
    total: 0,
    done: 0,
    percent: 0,
    label: "élément(s)",
    source: "vide",
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("Utilisateur");

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [routineLogs, setRoutineLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
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

    const displayName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "Utilisateur";

    setUserName(displayName);

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${currentUser.id},user_id.is.null`)
      .order("created_at", { ascending: false });

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .or(`user_id.eq.${currentUser.id},user_id.is.null`)
      .order("created_at", { ascending: false });

    if (tasksError) {
      alert(tasksError.message);
      setLoading(false);
      return;
    }

    if (projectsError) {
      console.error(projectsError.message);
    }

    const currentTasks = tasksData || [];
    const taskIds = currentTasks.map((task) => task.id);

    let logsData: any[] = [];
    let subtasksData: any[] = [];
    let schedulesData: any[] = [];

    if (taskIds.length > 0) {
      const { data: logsResult } = await supabase
        .from("routine_logs")
        .select("*")
        .in("task_id", taskIds);

      logsData = logsResult || [];

      const { data: subtasksResult, error: subtasksError } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds);

      if (subtasksError) {
        console.error(subtasksError.message);
      } else {
        subtasksData = subtasksResult || [];
      }

      const scheduleRows: any[] = [];

      const { data: schedulesByTask, error: schedulesByTaskError } =
        await supabase
          .from("subtask_schedule")
          .select("*")
          .in("task_id", taskIds);

      if (schedulesByTaskError) {
        console.error(schedulesByTaskError.message);
      } else {
        scheduleRows.push(...(schedulesByTask || []));
      }

      const subtaskIds = subtasksData.map((subtask) => subtask.id);

      if (subtaskIds.length > 0) {
        const { data: schedulesBySubtask, error: schedulesBySubtaskError } =
          await supabase
            .from("subtask_schedule")
            .select("*")
            .in("subtask_id", subtaskIds);

        if (!schedulesBySubtaskError) {
          scheduleRows.push(...(schedulesBySubtask || []));
        }
      }

      schedulesData = Array.from(
        new Map(
          scheduleRows.map((schedule, index) => [
            schedule.id ||
              `${schedule.task_id}-${schedule.subtask_id}-${index}`,
            schedule,
          ]),
        ).values(),
      );
    }

    setTasks(currentTasks);
    setProjects((projectsData || []).filter((project) => !project.archived));
    setSubtasks(subtasksData);
    setSchedules(schedulesData);
    setRoutineLogs(logsData);
    setLoading(false);
  }

  async function toggleTask(task: any) {
    if (!user) return;

    const today = dateKey(new Date());

    if (isProjectScheduleItem(task)) {
      const nextDone = !isDone(task);

      await supabase
        .from("subtask_schedule")
        .update({ done: nextDone })
        .eq("id", task.__scheduleId);

      await loadData();
      return;
    }

    if (isRoutine(task)) {
      const existing = routineLogs.find(
        (log) => log.task_id === task.id && log.completed_date === today,
      );

      if (existing) {
        await supabase.from("routine_logs").delete().eq("id", existing.id);
      } else {
        await supabase.from("routine_logs").insert({
          task_id: task.id,
          completed_date: today,
        });
      }

      await loadData();
      return;
    }

    const nextDone = !isDone(task);

    await supabase
      .from("tasks")
      .update({
        done: nextDone,
        status: nextDone ? "done" : "todo",
      })
      .eq("id", task.id);

    await loadData();
  }

  const todayKey = dateKey(new Date());

  const allRoutineTasks = tasks.filter(isRoutine);
  const routineTasks = allRoutineTasks.filter((task) =>
    routineRunsOnDate(task, todayKey),
  );
  const normalTasks = tasks.filter((task) => !isRoutine(task));

  const scheduledProjectTasks = useMemo(() => {
    return schedules
      .map((schedule) =>
        scheduleToPlanningTask(schedule, tasks, subtasks, projects),
      )
      .filter(Boolean) as any[];
  }, [schedules, tasks, subtasks, projects]);

  const todayTasks = [
    ...normalTasks.filter((task) => getTaskDate(task) === todayKey),
    ...routineTasks,
    ...scheduledProjectTasks.filter((task) => getTaskDate(task) === todayKey),
  ].sort(sortPlanningItems);

  const completedToday = todayTasks.filter((task) => {
    if (isRoutine(task)) return routineDone(task, routineLogs, todayKey);
    return isDone(task);
  }).length;

  const totalToday = todayTasks.length;

  const progressToday =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const urgent = todayTasks.filter((task) => {
    const done = isRoutine(task)
      ? routineDone(task, routineLogs, todayKey)
      : isDone(task);

    return task.priority === "Urgent" && !done;
  }).length;

  const chartData = useMemo(() => {
    const monday = startOfWeek(new Date());

    return weekDays.map((label, index) => {
      const day = addDays(monday, index);
      const key = dateKey(day);

      const dayNormalTasks = normalTasks.filter(
        (task) => getTaskDate(task) === key,
      );

      const dayScheduledProjectTasks = scheduledProjectTasks.filter(
        (task) => getTaskDate(task) === key,
      );

      const dayRoutineTasks = allRoutineTasks.filter((task) =>
        routineRunsOnDate(task, key),
      );

      const planned =
        dayNormalTasks.length +
        dayScheduledProjectTasks.length +
        dayRoutineTasks.length;

      const done =
        dayNormalTasks.filter(isDone).length +
        dayScheduledProjectTasks.filter(isDone).length +
        dayRoutineTasks.filter((task) => routineDone(task, routineLogs, key))
          .length;

      const routinesDone = dayRoutineTasks.filter((task) =>
        routineDone(task, routineLogs, key),
      ).length;

      return {
        day: label,
        prévues: planned,
        accomplies: done,
        routines: routinesDone,
      };
    });
  }, [normalTasks, scheduledProjectTasks, allRoutineTasks, routineLogs]);

  const recentTodayTasks = todayTasks.slice(0, 6);
  const recentProjects = projects.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex overflow-hidden">
      <Sidebar />

      <section className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-[1540px]">
          <header className="mb-8 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                Bonjour {userName}
              </h1>

              <p className="mt-3 text-sm text-white/45">
                Tâches, routines et projets sur une seule vue.
              </p>
            </div>

            <Link
              href="/tasks"
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.08]"
            >
              + Nouvelle tâche
            </Link>
          </header>

          {loading && (
            <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-12 text-center text-white/45 shadow-2xl shadow-black/20 backdrop-blur-2xl">
              Chargement du dashboard...
            </section>
          )}

          {!loading && (
            <>
              <section className="mb-7 grid grid-cols-4 gap-5">
                <ProgressCard
                  progress={progressToday}
                  completed={completedToday}
                  total={totalToday}
                />

                <GlassStat
                  icon={<Repeat size={18} />}
                  label="Routines"
                  value={routineTasks.length}
                  sub="selon les jours choisis"
                />

                <GlassStat
                  icon={<AlertTriangle size={18} />}
                  label="Urgentes aujourd'hui"
                  value={urgent}
                  sub="à traiter rapidement"
                />

                <GlassStat
                  icon={<CheckCircle2 size={18} />}
                  label="Tâches simples"
                  value={normalTasks.length}
                  sub="hors routines"
                />
              </section>

              <section className="grid grid-cols-[1.25fr_1fr_1fr] gap-5">
                <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold">Aperçu semaine</h2>

                    <p className="mt-1 text-sm text-white/40">
                      Prévu vs accompli, routines incluses
                    </p>
                  </div>

                  <div className="h-[310px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 18, left: -15, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                        />

                        <XAxis
                          dataKey="day"
                          stroke="rgba(255,255,255,0.35)"
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                        />

                        <YAxis
                          stroke="rgba(255,255,255,0.35)"
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          fontSize={12}
                        />

                        <Tooltip
                          contentStyle={{
                            background: "rgba(3,7,18,0.94)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 16,
                            color: "white",
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="prévues"
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />

                        <Line
                          type="monotone"
                          dataKey="accomplies"
                          stroke="rgba(34,197,94,0.95)"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />

                        <Line
                          type="monotone"
                          dataKey="routines"
                          stroke="rgba(14,165,233,0.95)"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                    <LegendItem color="bg-white" label="Tâches prévues" />
                    <LegendItem
                      color="bg-emerald-400"
                      label="Tâches accomplies"
                    />
                    <LegendItem
                      color="bg-sky-400"
                      label="Routines accomplies"
                    />
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Aujourd'hui</h2>

                    <p className="mt-1 text-sm text-white/40">
                      Clique pour valider
                    </p>
                  </div>

                  <div className="space-y-3">
                    {recentTodayTasks.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
                        Rien de prévu aujourd'hui.
                      </div>
                    )}

                    {recentTodayTasks.map((task) => {
                      const done = isRoutine(task)
                        ? routineDone(task, routineLogs, todayKey)
                        : isDone(task);

                      const color = taskColor(task, projects);
                      const linkedProject = projectName(task, projects);
                      const projectItem =
                        isProjectScheduleItem(task) || !!linkedProject;

                      return (
                        <button
                          key={task.id}
                          onClick={() => toggleTask(task)}
                          className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
                          style={{
                            boxShadow: `inset 4px 0 0 ${color}`,
                          }}
                        >
                          <div className="text-white/65">
                            {done ? (
                              <CheckCircle2
                                size={22}
                                className="text-green-400"
                              />
                            ) : (
                              <Circle size={22} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
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
                              {projectItem && linkedProject && (
                                <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-sky-300">
                                  Projet · {linkedProject}
                                </span>
                              )}

                              {isRoutine(task) && (
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
                                  Routine
                                </span>
                              )}

                              {!projectItem && !isRoutine(task) && (
                                <span>{task.category || "Personnel"}</span>
                              )}

                              <span>·</span>
                              <span>{getTaskTimeLabel(task)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold">
                        Projets récents
                      </h2>

                      <p className="mt-1 text-sm text-white/40">
                        Avancement réel
                      </p>
                    </div>

                    <Link
                      href="/projects"
                      className="text-white/40 transition hover:text-white"
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {recentProjects.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
                        Aucun projet.
                      </div>
                    )}

                    {recentProjects.map((project) => {
                      const progress = getProjectRealProgress(
                        project.id,
                        tasks,
                        subtasks,
                        schedules,
                      );

                      const color = project.color || "#64748b";

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <FolderKanban
                                size={16}
                                style={{
                                  color,
                                }}
                              />

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold uppercase tracking-wide">
                                  {project.name || "Projet sans nom"}
                                </p>

                                <p className="mt-1 text-[11px] text-white/30">
                                  {progress.done}/{progress.total}{" "}
                                  {progress.label}
                                </p>
                              </div>
                            </div>

                            <span className="text-xs text-white/35">
                              {progress.percent}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress.percent}%`,
                                backgroundColor: color,
                                boxShadow: `0 0 14px ${color}`,
                              }}
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ProgressCard({
  progress,
  completed,
  total,
}: {
  progress: number;
  completed: number;
  total: number;
}) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <p className="text-sm text-white/45">Progression du jour</p>

      <div className="mt-6 flex items-center gap-6">
        <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white/10">
          <div className="absolute inset-3 rounded-full bg-black/70" />

          <p className="relative z-10 text-xl font-semibold">{progress}%</p>
        </div>

        <div>
          <p className="text-3xl font-semibold">
            {completed}/{total}
          </p>

          <p className="mt-2 text-sm text-white/35">validées aujourd'hui</p>
        </div>
      </div>
    </div>
  );
}

function GlassStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white/70">
        {icon}
      </div>

      <p className="text-sm text-white/40">{label}</p>

      <p className="mt-3 text-3xl font-semibold">{value}</p>

      <p className="mt-3 text-sm text-white/35">{sub}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-white/50">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
