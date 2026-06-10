"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  Circle,
  Save,
  Trash2,
  X,
  Repeat,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SLOT_HEIGHT = 76;
const START_HOUR = 4;
const END_HOUR = 24;
const hours = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i
);

function formatCalendarHour(hour: number) {
  if (hour === 24) return "00:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

const weekLabels = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const priorityOptions = ["Basse", "Normale", "Importante", "Urgente"];

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Sans date";

  const clean = String(value).slice(0, 10);
  const parts = clean.split("-");

  if (parts.length !== 3) return clean;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function todayLocal() {
  return dateKey(new Date());
}

function getTaskDate(task: any) {
  const value = task?.due_date || task?.date;
  if (!value) return "";

  return String(value).slice(0, 10);
}

function getTaskHour(task: any) {
  if (task?.__startTime) return String(task.__startTime).slice(0, 5);
  if (task?.hour) return String(task.hour).slice(0, 5);
  if (task?.start_time) return String(task.start_time).slice(0, 5);
  if (task?.startTime) return String(task.startTime).slice(0, 5);

  return "08:00";
}

function addMinutes(hour: string, minutes: number) {
  const [h, m] = hour.split(":").map(Number);

  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  d.setMinutes(d.getMinutes() + minutes);

  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function getTaskEndHour(task: any) {
  if (task?.__endTime) return String(task.__endTime).slice(0, 5);
  if (task?.end_time) return String(task.end_time).slice(0, 5);
  if (task?.endTime) return String(task.endTime).slice(0, 5);

  const start = getTaskHour(task);
  if (!start) return "09:00";

  return addMinutes(start, 60);
}

function hourToMinutes(hour: string) {
  let [h, m] = hour.split(":").map(Number);

  // Pour l'affichage 04:00 → 00:00, les heures après minuit
  // sont traitées comme la fin de la journée.
  if (h < START_HOUR) h += 24;

  return (h || 0) * 60 + (m || 0);
}

function getTaskDurationMinutes(task: any) {
  const start = getTaskHour(task);
  const end = getTaskEndHour(task);

  const startMinutes = hourToMinutes(start);
  const endMinutes = hourToMinutes(end);

  if (endMinutes <= startMinutes) return 60;

  return endMinutes - startMinutes;
}

function minutesFromStart(hour: string) {
  if (!hour) return SLOT_HEIGHT;

  let [h, m] = hour.split(":").map(Number);

  // Dans ce calendrier, 00:00 représente minuit en fin de journée,
  // donc on le place après 23:00 et pas tout en haut.
  if (h < START_HOUR) h += 24;

  return (h - START_HOUR) * SLOT_HEIGHT + ((m || 0) / 60) * SLOT_HEIGHT;
}

function getTaskHeight(task: any) {
  const duration = getTaskDurationMinutes(task);

  return Math.max(48, (duration / 60) * SLOT_HEIGHT - 8);
}

function hourFromSlot(hour: number) {
  if (hour >= 24) return "00:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

function minutesToHour(totalMinutes: number) {
  if (totalMinutes >= 24 * 60) return "00:00";

  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function roundMinutes(totalMinutes: number, step = 15) {
  return Math.round(totalMinutes / step) * step;
}

function getDropHourFromColumn(e: DragEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
  const minutesAfterStart = roundMinutes((y / SLOT_HEIGHT) * 60, 15);
  const startLimit = START_HOUR * 60;
  const endLimit = END_HOUR * 60;

  return minutesToHour(
    Math.max(startLimit, Math.min(startLimit + minutesAfterStart, endLimit))
  );
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
  if (task?.__projectName) return task.__projectName;

  const project = getProjectForTask(task, projects);

  return project?.name || null;
}

function getTaskColor(task: any, projects: any[]) {
  if (task?.__color) return normalizeColor(task.__color);

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

function isRoutine(task: any) {
  return (
    task?.type === "routine" ||
    task?.repeat_rule === "daily" ||
    task?.category === "Routine"
  );
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

function routineDoneForDate(taskId: string, day: string, routineLogs: any[]) {
  return routineLogs.some(
    (log) =>
      log.task_id === taskId &&
      String(log.completed_date || log.date || "").slice(0, 10) === day
  );
}

const jsDayToRoutineDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function normalizeRoutineDay(day: any) {
  const value = String(day || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const map: Record<string, string> = {
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

function getRoutineRepeatDays(task: any) {
  const raw =
    task?.repeat_days ??
    task?.repeatDays ??
    task?.routine_days ??
    task?.week_days ??
    task?.days;

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

  return values.map(normalizeRoutineDay).filter(Boolean);
}

function getWeekDayKeyFromDate(day: string) {
  const date = new Date(`${day}T12:00:00`);
  return jsDayToRoutineDay[date.getDay()];
}

function shouldShowRoutineOnDate(task: any, day: string) {
  const start = getTaskDate(task);
  if (start && start > day) return false;

  const repeatDays = getRoutineRepeatDays(task);

  // Compatibilité avec les anciennes routines : si aucun jour n'est encore choisi,
  // elles restent visibles tous les jours au lieu de disparaître.
  if (repeatDays.length === 0) return true;

  return repeatDays.includes(getWeekDayKeyFromDate(day));
}

function isProjectScheduleItem(task: any) {
  return task?.__kind === "project_schedule";
}

function looksLikeDateValue(value: any) {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}/.test(String(value));
}

const scheduleDateColumnPriority = [
  "scheduled_date",
  "schedule_date",
  "planned_date",
  "date",
  "due_date",
  "day",
  "scheduled_day",
  "scheduled_for",
  "planned_for",
];

function getScheduleDateColumn(schedule: any) {
  if (!schedule) return null;

  for (const key of scheduleDateColumnPriority) {
    if (Object.prototype.hasOwnProperty.call(schedule, key) && looksLikeDateValue(schedule[key])) {
      return key;
    }
  }

  return (
    Object.keys(schedule).find((key) => {
      const cleanKey = key.toLowerCase();
      const canBeDate =
        cleanKey.includes("date") ||
        cleanKey.includes("day") ||
        cleanKey.includes("scheduled") ||
        cleanKey.includes("planned") ||
        cleanKey.includes("due");

      return canBeDate && looksLikeDateValue(schedule[key]);
    }) || null
  );
}

function getScheduleWritableDateColumn(schedule: any) {
  if (!schedule) return null;

  for (const key of scheduleDateColumnPriority) {
    if (Object.prototype.hasOwnProperty.call(schedule, key)) {
      return key;
    }
  }

  return (
    Object.keys(schedule).find((key) => {
      const cleanKey = key.toLowerCase();
      return (
        cleanKey.includes("date") ||
        cleanKey.includes("day") ||
        cleanKey.includes("scheduled") ||
        cleanKey.includes("planned") ||
        cleanKey.includes("due")
      );
    }) || null
  );
}

function getScheduleDate(schedule: any) {
  const dateColumn = getScheduleDateColumn(schedule);
  const value = dateColumn ? schedule?.[dateColumn] : null;

  if (!value) return null;
  return String(value).slice(0, 10);
}

function getScheduleStartHour(schedule: any) {
  const value =
    schedule?.start_time || schedule?.startTime || schedule?.hour || schedule?.time;

  if (!value) return "08:00";
  return String(value).slice(0, 5);
}

function getScheduleEndHour(schedule: any) {
  const value =
    schedule?.end_time ||
    schedule?.endTime ||
    schedule?.finish_time ||
    schedule?.finishTime;

  if (!value) return null;
  return String(value).slice(0, 5);
}

function scheduleToCalendarTask(
  schedule: any,
  tasks: any[],
  subtasks: any[],
  projects: any[]
) {
  const subtask = subtasks.find((item) => item.id === schedule.subtask_id);
  const parentTask = tasks.find(
    (task) => task.id === (schedule.task_id || subtask?.task_id)
  );

  if (!parentTask && !subtask) return null;

  const project = projects.find(
    (item) => item.id === (parentTask?.project_id || subtask?.project_id)
  );
  const scheduleDate = getScheduleDate(schedule);

  if (!scheduleDate) return null;

  const start = getScheduleStartHour(schedule);
  const end = getScheduleEndHour(schedule) || addMinutes(start, 60);
  const title =
    subtask?.name ||
    subtask?.title ||
    schedule?.name ||
    schedule?.title ||
    "Sous-tâche programmée";

  return {
    ...(parentTask || {}),
    id: `schedule-${schedule.id}`,
    __kind: "project_schedule",
    __scheduleId: schedule.id,
    __subtaskId: subtask?.id || schedule.subtask_id,
    __parentTaskId: parentTask?.id || schedule.task_id,
    __projectName: project?.name || parentTask?.project_name || "Projet",
    __color: project?.color || parentTask?.color || "#3b82f6",
    __startTime: start,
    __endTime: end,
    name: title,
    title,
    date: scheduleDate,
    due_date: scheduleDate,
    hour: start,
    start_time: start,
    end_time: end,
    done: schedule.done === true || subtask?.done === true,
    status: schedule.done || subtask?.done ? "done" : "todo",
    project_id: parentTask?.project_id || subtask?.project_id || null,
    calendar_date: scheduleDate,
    category: "Projet",
    type: "project_subtask",
  };
}

function getVisibleTasksForDate(
  tasks: any[],
  day: string,
  routineLogs: any[],
  subtasks: any[] = [],
  schedules: any[] = [],
  projects: any[] = []
) {
  const classicTasks = tasks
    .filter((task) => {
      if (isRoutine(task)) return shouldShowRoutineOnDate(task, day);

      return getTaskDate(task) === day;
    })
    .map((task) => {
      if (!isRoutine(task)) return task;

      return {
        ...task,
        calendar_date: day,
        routine_done_today: routineDoneForDate(task.id, day, routineLogs),
      };
    });

  const projectScheduleTasks = schedules
    .map((schedule) => scheduleToCalendarTask(schedule, tasks, subtasks, projects))
    .filter(Boolean)
    .filter((task: any) => getTaskDate(task) === day);

  return [...classicTasks, ...projectScheduleTasks].sort((a: any, b: any) =>
    getTaskHour(a).localeCompare(getTaskHour(b))
  );
}

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [routineLogs, setRoutineLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"week" | "month" | "year">("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("08:00");
  const [editEnd, setEditEnd] = useState("09:00");
  const [editPriority, setEditPriority] = useState("Normale");
  const [editStatus, setEditStatus] = useState("todo");
  const [saving, setSaving] = useState(false);

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

  async function getCurrentUser() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      return sessionData.session.user;
    }

    const { data: userData } = await supabase.auth.getUser();

    return userData.user || null;
  }

  async function loadData() {
    setLoading(true);

    const currentUser = await getCurrentUser();
    setUser(currentUser);

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

    const currentTasks = tasksData || [];
    const taskIds = currentTasks.map((task) => task.id);
    let logsData: any[] = [];
    let subtasksData: any[] = [];
    let schedulesData: any[] = [];

    if (taskIds.length > 0) {
      const { data: logs } = await supabase
        .from("routine_logs")
        .select("*")
        .in("task_id", taskIds);

      logsData = logs || [];

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

        if (schedulesBySubtaskError) {
          console.error(schedulesBySubtaskError.message);
        } else {
          scheduleRows.push(...(schedulesBySubtask || []));
        }
      }

      schedulesData = Array.from(
        new Map(
          scheduleRows.map((schedule, index) => [
            schedule.id || `${schedule.task_id}-${schedule.subtask_id}-${index}`,
            schedule,
          ])
        ).values()
      );
    }

    setTasks(currentTasks);
    setProjects(projectsData || []);
    setSubtasks(subtasksData);
    setSchedules(schedulesData);
    setRoutineLogs(logsData);
    setLoading(false);
  }

  function openTaskFromCalendar(task: any) {
    const day = task.calendar_date || getTaskDate(task) || todayLocal();

    setSelectedTask(task);
    setEditName(taskTitle(task));
    setEditDescription(task.description || "");
    setEditDate(day);
    setEditStart(getTaskHour(task));
    setEditEnd(getTaskEndHour(task));
    setEditPriority(task.priority || "Normale");
    setEditStatus(task.status || (isDone(task) ? "done" : "todo"));
  }

  function closeTaskModal() {
    setSelectedTask(null);
    setEditName("");
    setEditDescription("");
    setEditDate("");
    setEditStart("08:00");
    setEditEnd("09:00");
    setEditPriority("Normale");
    setEditStatus("todo");
  }

  async function saveTaskFromModal() {
    if (!selectedTask) return;

    if (!editName.trim()) {
      alert("Ajoute un nom de tâche.");
      return;
    }

    if (editEnd <= editStart) {
      alert("L'heure de fin doit être après l'heure de début.");
      return;
    }

    setSaving(true);

    if (isProjectScheduleItem(selectedTask)) {
      const nextDone = editStatus === "done";
      const error = await updateProjectScheduleDateTime(
        selectedTask.__scheduleId,
        editDate,
        editStart,
        editEnd,
        { done: nextDone }
      );

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      if (selectedTask.__subtaskId) {
        await supabase
          .from("subtasks")
          .update({ done: nextDone })
          .eq("id", selectedTask.__subtaskId);
      }

      await loadData();
      setSaving(false);
      closeTaskModal();
      return;
    }

    const payload: any = {
      name: editName.trim(),
      description: editDescription.trim() || null,
      due_date: editDate,
      date: editDate,
      hour: editStart,
      start_time: editStart,
      end_time: editEnd,
      priority: editPriority,
      status: editStatus,
      done: editStatus === "done",
    };

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", selectedTask.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== selectedTask.id) return task;

        return {
          ...task,
          ...payload,
        };
      })
    );

    setSaving(false);
    closeTaskModal();
  }

  async function deleteSelectedTask() {
    if (!selectedTask) return;

    if (isProjectScheduleItem(selectedTask)) {
      const okSchedule = confirm("Retirer cette sous-tâche du calendrier ?");
      if (!okSchedule) return;

      const { error } = await supabase
        .from("subtask_schedule")
        .delete()
        .eq("id", selectedTask.__scheduleId);

      if (error) {
        alert(error.message);
        return;
      }

      await loadData();
      closeTaskModal();
      return;
    }

    const ok = confirm("Supprimer cette tâche ?");
    if (!ok) return;

    await supabase.from("routine_logs").delete().eq("task_id", selectedTask.id);
    await supabase.from("subtask_schedule").delete().eq("task_id", selectedTask.id);
    await supabase.from("subtasks").delete().eq("task_id", selectedTask.id);

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", selectedTask.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== selectedTask.id));
    setRoutineLogs((prev) =>
      prev.filter((log) => log.task_id !== selectedTask.id)
    );
    closeTaskModal();
  }

  async function toggleTaskDone(task: any, day?: string) {
    if (isProjectScheduleItem(task)) {
      const nextDone = !isDone(task);

      const { error } = await supabase
        .from("subtask_schedule")
        .update({ done: nextDone })
        .eq("id", task.__scheduleId);

      if (error) {
        alert(error.message);
        return;
      }

      if (task.__subtaskId) {
        await supabase
          .from("subtasks")
          .update({ done: nextDone })
          .eq("id", task.__subtaskId);
      }

      await loadData();
      return;
    }

    if (isRoutine(task)) {
      const currentDay = day || task.calendar_date || todayLocal();

      const existing = routineLogs.find(
        (log) =>
          log.task_id === task.id &&
          String(log.completed_date || log.date || "").slice(0, 10) ===
            currentDay
      );

      if (existing) {
        const { error } = await supabase
          .from("routine_logs")
          .delete()
          .eq("id", existing.id);

        if (error) {
          alert(error.message);
          return;
        }

        setRoutineLogs((prev) => prev.filter((log) => log.id !== existing.id));
        return;
      }

      const { data, error } = await supabase
        .from("routine_logs")
        .insert({
          task_id: task.id,
          completed_date: currentDay,
        })
        .select()
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      if (data) {
        setRoutineLogs((prev) => [...prev, data]);
      }

      return;
    }

    const nextDone = !isDone(task);
    const payload = {
      done: nextDone,
      status: nextDone ? "done" : "todo",
    };

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== task.id) return item;

        return {
          ...item,
          ...payload,
        };
      })
    );
  }

  async function updateProjectScheduleDateTime(
    scheduleId: string,
    newDate: string,
    start: string,
    end: string,
    extraPayload: Record<string, any> = {}
  ) {
    const schedule = schedules.find((item) => String(item.id) === String(scheduleId));
    const dateColumn = getScheduleWritableDateColumn(schedule);

    const basePayload: any = {
      ...extraPayload,
      start_time: start,
      end_time: end,
    };

    // Cas propre : on a détecté la vraie colonne date existante dans ta table.
    if (dateColumn) {
      const { error } = await supabase
        .from("subtask_schedule")
        .update({
          ...basePayload,
          [dateColumn]: newDate,
        })
        .eq("id", scheduleId);

      return error || null;
    }

    // Sécurité : si ta table n'a vraiment aucune colonne de date détectable,
    // on déplace au moins l'heure sans envoyer une colonne inexistante à Supabase.
    const { error } = await supabase
      .from("subtask_schedule")
      .update(basePayload)
      .eq("id", scheduleId);

    if (error) return error;

    const oldDate = schedule ? getScheduleDate(schedule) : null;

    if (oldDate && oldDate !== newDate) {
      return {
        message:
          "L'heure a été déplacée, mais le changement de jour demande une vraie colonne date dans subtask_schedule.",
      };
    }

    return null;
  }

  async function moveProjectSchedule(scheduleId: string, newDate: string, newHour?: string) {
    const schedule = schedules.find((item) => String(item.id) === String(scheduleId));
    if (!schedule) return;

    const calendarTask = scheduleToCalendarTask(schedule, tasks, subtasks, projects);
    const start = newHour || getScheduleStartHour(schedule);
    const duration = calendarTask ? getTaskDurationMinutes(calendarTask) : 60;
    const end = addMinutes(start, duration);

    const error = await updateProjectScheduleDateTime(
      scheduleId,
      newDate,
      start,
      end
    );

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function moveTask(taskId: string, newDate: string, newHour?: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const start = newHour || getTaskHour(task);
    const duration = getTaskDurationMinutes(task);
    const end = addMinutes(start, duration);

    const payload: any = {
      due_date: newDate,
      date: newDate,
      hour: start,
      start_time: start,
      end_time: end,
    };

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

  function handleDrop(e: DragEvent, newDate: string, newHour?: string) {
    e.preventDefault();
    e.stopPropagation();

    const raw = e.dataTransfer.getData("text/plain");
    const customScheduleId = e.dataTransfer.getData("scheduleId");
    const customTaskId = e.dataTransfer.getData("taskId");

    const scheduleId =
      customScheduleId ||
      (raw.startsWith("schedule:") ? raw.replace("schedule:", "") : "");

    if (scheduleId) {
      moveProjectSchedule(scheduleId, newDate, newHour);
      return;
    }

    const taskId =
      customTaskId ||
      (raw.startsWith("task:") ? raw.replace("task:", "") : raw);

    if (!taskId) return;

    moveTask(taskId, newDate, newHour);
  }

  function handleColumnDrop(e: DragEvent<HTMLElement>, newDate: string) {
    const newHour = getDropHourFromColumn(e);
    handleDrop(e, newDate, newHour);
  }

  function handleDragStart(e: DragEvent<HTMLElement>, task: any) {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";

    if (isProjectScheduleItem(task)) {
      const id = String(task.__scheduleId);
      e.dataTransfer.setData("scheduleId", id);
      e.dataTransfer.setData("text/plain", `schedule:${id}`);
      return;
    }

    const id = String(task.id);
    e.dataTransfer.setData("taskId", id);
    e.dataTransfer.setData("text/plain", `task:${id}`);
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
                  ? "Agenda année"
                  : view === "month"
                  ? "Agenda mois"
                  : "Agenda semaine"}
              </h1>

              <p className="mt-3 text-base text-white/45">
                Tâches, routines, projets et planning horaire.
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
                  Année
                </button>
              </div>
            </div>
          </section>

          {view === "week" && (
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="max-h-[calc(100vh-330px)] overflow-y-auto overflow-x-hidden">
                <div className="sticky top-0 z-30 grid grid-cols-[90px_repeat(7,1fr)] border-b border-white/10 bg-[#111827]/95 shadow-xl shadow-black/30 backdrop-blur-xl">
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
                        {formatCalendarHour(hour)}
                      </div>
                    ))}
                  </div>

                  {weekDates.map((date) => {
                    const key = dateKey(date);
                    const dayTasks = getVisibleTasksForDate(
                      tasks,
                      key,
                      routineLogs,
                      subtasks,
                      schedules,
                      projects
                    );

                    return (
                      <div
                        key={key}
                        className="relative border-l border-white/10"
                        style={{ height: hours.length * SLOT_HEIGHT }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => handleColumnDrop(e, key)}
                      >
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="h-[76px] border-b border-white/10"
                          />
                        ))}

                        {dayTasks.map((task) => {
                          const start = getTaskHour(task) || "08:00";
                          const end = getTaskEndHour(task);
                          const color = getTaskColor(task, projects);
                          const projectName = getProjectName(task, projects);
                          const done = isRoutine(task)
                            ? task.routine_done_today
                            : isDone(task);

                          return (
                            <div
                              key={`${task.id}-${key}`}
                              draggable
                              onClick={() => openTaskFromCalendar(task)}
                              onDragStart={(e) => handleDragStart(e, task)}
                              className={`absolute left-2 right-2 z-10 cursor-pointer overflow-hidden rounded-xl px-3 py-2 text-xs text-white shadow-md transition hover:scale-[1.01] hover:bg-white/[0.08] ${
                                done ? "opacity-55" : ""
                              }`}
                              style={{
                                top: `${minutesFromStart(start)}px`,
                                height: `${getTaskHeight(task)}px`,
                                background: "rgba(15, 23, 42, 0.72)",
                                borderLeft: `4px solid ${color}`,
                                borderTop: `2px solid ${color}`,
                                borderRight: "1px solid rgba(255,255,255,0.08)",
                                borderBottom: "1px solid rgba(255,255,255,0.08)",
                                boxShadow: `0 0 12px ${color}35`,
                                backdropFilter: "blur(14px)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p
                                    className={`truncate font-semibold ${
                                      done ? "line-through text-white/45" : ""
                                    }`}
                                  >
                                    {isRoutine(task) && (
                                      <Repeat size={12} className="mr-1 inline" />
                                    )}
                                    {taskTitle(task)}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskDone(task, key);
                                  }}
                                  className="shrink-0 text-white/70 hover:text-white"
                                >
                                  {done ? (
                                    <CheckCircle2 size={15} />
                                  ) : (
                                    <Circle size={15} />
                                  )}
                                </button>
                              </div>

                              <p className="mt-1 truncate text-[11px] text-white/75">
                                {start}
                                {end ? ` - ${end}` : ""}
                              </p>

                              {projectName && (
                                <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-white/65">
                                  <FolderKanban size={11} />
                                  {isProjectScheduleItem(task)
                                    ? `Projet · ${projectName}`
                                    : projectName}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
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
                  const dayTasks = getVisibleTasksForDate(
                    tasks,
                    key,
                    routineLogs,
                    subtasks,
                    schedules,
                    projects
                  ).sort((a, b) => getTaskHour(a).localeCompare(getTaskHour(b)));

                  return (
                    <div
                      key={key}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => handleDrop(e, key)}
                      className={`min-h-[140px] border-l border-t border-white/10 p-3 first:border-l-0 ${
                        isSameMonth(date, currentDate)
                          ? "bg-white/[0.015]"
                          : "bg-black/20 opacity-50"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">{date.getDate()}</p>

                        {dayTasks.length > 0 && (
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/50">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {dayTasks.slice(0, 3).map((task) => {
                          const color = getTaskColor(task, projects);
                          const done = isRoutine(task)
                            ? task.routine_done_today
                            : isDone(task);

                          return (
                            <div
                              key={`${task.id}-${key}`}
                              draggable
                              onClick={() => openTaskFromCalendar(task)}
                              onDragStart={(e) => handleDragStart(e, task)}
                              className={`cursor-pointer truncate rounded-lg border border-white/10 px-2 py-1 text-xs text-white transition hover:scale-[1.01] hover:bg-white/[0.08] ${
                                done ? "opacity-55" : ""
                              }`}
                              style={{
                                background: "rgba(15, 23, 42, 0.72)",
                                borderLeft: `3px solid ${color}`,
                                borderTop: `1px solid ${color}`,
                                boxShadow: `0 0 8px ${color}30`,
                                backdropFilter: "blur(10px)",
                              }}
                            >
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskDone(task, key);
                                }}
                                className="mr-1 inline-block text-white/60"
                              >
                                {done ? "✓" : "○"}
                              </span>
                              {isRoutine(task) ? "↻ " : ""}
                              {isProjectScheduleItem(task) ? "▣ " : ""}
                              {getTaskHour(task) || "--:--"} · {taskTitle(task)}
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
                  if (isRoutine(task)) return true;

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
                          {monthTasks.length} tâche(s) · {progress}% terminé
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
                          Aucun événement
                        </div>
                      )}

                      {monthTasks.slice(0, 4).map((task) => {
                        const color = getTaskColor(task, projects);

                        return (
                          <div
                            key={`${task.id}-${monthIndex}`}
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
                                {isRoutine(task) ? "↻ " : ""}
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

      {selectedTask && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[680px] rounded-[34px] border border-white/10 bg-[#060b14]/95 p-6 shadow-2xl shadow-black">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                  Modifier depuis le calendrier
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {taskTitle(selectedTask)}
                </h2>

                <p className="mt-2 text-sm text-white/40">
                  Modifie la date, les heures, le statut ou les détails.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTaskModal}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/45 hover:bg-white/[0.07] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <p className="mb-2 text-sm text-white/45">Nom</p>

                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="field"
                />
              </label>

              <label className="block">
                <p className="mb-2 text-sm text-white/45">Description</p>

                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="modal-field resize-none"
                />
              </label>

              <div className="grid grid-cols-3 gap-4">
                <label className="block">
                  <p className="mb-2 text-sm text-white/45">Date</p>

                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="field [color-scheme:dark]"
                  />
                </label>

                <label className="block">
                  <p className="mb-2 text-sm text-white/45">Début</p>

                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="field [color-scheme:dark]"
                  />
                </label>

                <label className="block">
                  <p className="mb-2 text-sm text-white/45">Fin</p>

                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="field [color-scheme:dark]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <p className="mb-2 text-sm text-white/45">Priorité</p>

                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="field"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <p className="mb-2 text-sm text-white/45">Statut</p>

                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="field"
                  >
                    <option value="todo">À faire</option>
                    <option value="progress">En cours</option>
                    <option value="upcoming">À venir</option>
                    <option value="done">Terminé</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-7 flex justify-between gap-3">
              <button
                type="button"
                onClick={deleteSelectedTask}
                className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20"
              >
                <Trash2 size={16} />
                Supprimer
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleTaskDone(selectedTask, selectedTask.calendar_date || editDate)
                  }
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white"
                >
                  <CheckCircle2 size={16} />
                  Valider
                </button>

                <button
                  type="button"
                  onClick={saveTaskFromModal}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field {
          height: 52px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.25);
          padding: 0 16px;
          font-size: 14px;
          color: white;
          outline: none;
        }

        .modal-field {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.25);
          padding: 16px;
          font-size: 14px;
          color: white;
          outline: none;
        }

        .field:focus,
        .modal-field:focus {
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.06);
        }

        .field option {
          background: #030712;
          color: white;
        }
      `}</style>
    </main>
  );
}
