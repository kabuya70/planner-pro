"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Brain,
  Sparkles,
  CalendarDays,
  Clock3,
  Target,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Bot,
  User,
  BarChart3,
  Plus,
  Check,
  X,
  Loader2,
  Mic,
  Paperclip,
  MoreHorizontal,
  Rocket,
  TrendingUp,
  CircleAlert,
  Crown,
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ReportMode = "day" | "week" | "month";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PlannerAction = {
  type: "create_task";
  name: string;
  due_date: string | null;
  hour: string | null;
  end_time: string | null;
  priority: "Basse" | "Normale" | "Importante" | "Urgent";
  category: string;
  project_name: string | null;
  reason: string;
};

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
  return "--:--";
}

function isDone(task: any) {
  return task.done === true || task.status === "done";
}

function isRoutine(task: any) {
  return task.type === "routine" || task.category === "Routine";
}

function routineDone(task: any, logs: any[], key: string) {
  return logs.some(
    (log) => log.task_id === task.id && log.completed_date === key
  );
}

function getProjectName(task: any, projects: any[]) {
  return projects.find((project) => project.id === task.project_id)?.name || null;
}

function getProjectProgress(project: any, tasks: any[]) {
  const projectTasks = tasks.filter((task) => task.project_id === project.id);

  if (projectTasks.length === 0) return 0;

  const done = projectTasks.filter(isDone).length;

  return Math.round((done / projectTasks.length) * 100);
}

function priorityTone(priority: string) {
  if (priority === "Urgent") return "bg-red-500/15 text-red-300 border-red-400/20";
  if (priority === "Importante")
    return "bg-orange-500/15 text-orange-300 border-orange-400/20";
  if (priority === "Basse")
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";

  return "bg-yellow-500/15 text-yellow-300 border-yellow-400/20";
}

export default function StatsPage() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("Utilisateur");

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [routineLogs, setRoutineLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [reportMode, setReportMode] = useState<ReportMode>("day");
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [actions, setActions] = useState<PlannerAction[]>([]);
  const [actionMessage, setActionMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour. Je peux analyser ta journée, classer tes priorités, préparer un planning, t’aider sur tes projets ou discuter librement d’un autre sujet.",
    },
    {
      role: "user",
      content:
        "Peux-tu m’aider à planifier ma journée de travail pour être le plus efficace possible ?",
    },
    {
      role: "assistant",
      content:
        "Oui. Je te propose de commencer par le travail profond, puis les tâches courtes, puis la planification.\n\n• 09:00 – 11:00 : tâche la plus importante\n• 11:00 – 12:00 : tâches administratives\n• 14:00 – 15:30 : projet prioritaire\n• 16:00 – 17:00 : révision et organisation\n• 17:00 – 17:30 : planification de demain",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

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
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", currentUser.id)
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

    if (taskIds.length > 0) {
      const { data, error } = await supabase
        .from("routine_logs")
        .select("*")
        .in("task_id", taskIds);

      if (!error) {
        logsData = data || [];
      }
    }

    setTasks(currentTasks);
    setProjects((projectsData || []).filter((project) => !project.archived));
    setRoutineLogs(logsData);
    setLoading(false);
  }

  const analysis = useMemo(() => {
    const today = new Date();
    const todayKey = dateKey(today);

    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const normalTasks = tasks.filter((task) => !isRoutine(task));
    const routineTasks = tasks.filter(isRoutine);

    const todayTasks = tasks.filter((task) => {
      if (isRoutine(task)) return true;
      return getTaskDate(task) === todayKey;
    });

    const weekTasks = tasks.filter((task) => {
      if (isRoutine(task)) return true;

      const taskDate = getTaskDate(task);
      if (!taskDate) return false;

      return taskDate >= dateKey(weekStart) && taskDate <= dateKey(weekEnd);
    });

    const monthTasks = tasks.filter((task) => {
      if (isRoutine(task)) return true;

      const taskDate = getTaskDate(task);
      if (!taskDate) return false;

      return taskDate >= dateKey(monthStart) && taskDate <= dateKey(monthEnd);
    });

    const todayDone = todayTasks.filter((task) => {
      if (isRoutine(task)) return routineDone(task, routineLogs, todayKey);
      return isDone(task);
    });

    const weekDone = weekTasks.filter((task) => {
      if (isRoutine(task)) return routineDone(task, routineLogs, todayKey);
      return isDone(task);
    });

    const monthDone = monthTasks.filter((task) => {
      if (isRoutine(task)) return routineDone(task, routineLogs, todayKey);
      return isDone(task);
    });

    const lateTasks = normalTasks.filter((task) => {
      const taskDate = getTaskDate(task);
      return taskDate && taskDate < todayKey && !isDone(task);
    });

    const urgentTasks = todayTasks.filter((task) => {
      const done = isRoutine(task)
        ? routineDone(task, routineLogs, todayKey)
        : isDone(task);

      return task.priority === "Urgent" && !done;
    });

    const remainingToday = todayTasks.filter((task) => {
      if (isRoutine(task)) return !routineDone(task, routineLogs, todayKey);
      return !isDone(task);
    });

    const priorityTasks = [
      ...lateTasks.map((task) => ({ ...task, ai_reason: "En retard" })),
      ...urgentTasks.map((task) => ({
        ...task,
        ai_reason: "Urgent aujourd’hui",
      })),
      ...remainingToday.map((task) => ({
        ...task,
        ai_reason: "À faire aujourd’hui",
      })),
    ].filter(
      (task, index, arr) => arr.findIndex((item) => item.id === task.id) === index
    );

    const todayProgress =
      todayTasks.length > 0
        ? Math.round((todayDone.length / todayTasks.length) * 100)
        : 0;

    const weekProgress =
      weekTasks.length > 0
        ? Math.round((weekDone.length / weekTasks.length) * 100)
        : 0;

    const monthProgress =
      monthTasks.length > 0
        ? Math.round((monthDone.length / monthTasks.length) * 100)
        : 0;

    const routineDoneToday = routineTasks.filter((task) =>
      routineDone(task, routineLogs, todayKey)
    ).length;

    const routineScore =
      routineTasks.length > 0
        ? Math.round((routineDoneToday / routineTasks.length) * 100)
        : 0;

    const focusScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          todayProgress * 0.5 +
            routineScore * 0.25 +
            Math.max(0, 100 - lateTasks.length * 15) * 0.25
        )
      )
    );

    let diagnosis =
      "Vous êtes concentré et avancez régulièrement vers vos objectifs.";

    if (lateTasks.length >= 3) {
      diagnosis =
        "Tu as plusieurs retards. Il faut réduire la charge avant de créer de nouvelles tâches.";
    } else if (todayProgress >= 75) {
      diagnosis =
        "Très bonne journée. Tu avances régulièrement vers tes objectifs.";
    } else if (todayTasks.length === 0) {
      diagnosis =
        "Journée légère. C’est le bon moment pour planifier et clarifier tes projets.";
    } else if (todayProgress < 35) {
      diagnosis =
        "Démarrage lent. Lance une tâche simple pour créer de l’élan.";
    }

    return {
      todayKey,
      normalTasks,
      routineTasks,
      todayTasks,
      weekTasks,
      monthTasks,
      todayDone,
      weekDone,
      monthDone,
      lateTasks,
      urgentTasks,
      remainingToday,
      priorityTasks: priorityTasks.slice(0, 5),
      todayProgress,
      weekProgress,
      monthProgress,
      routineScore,
      focusScore,
      diagnosis,
      activeProjects: projects.length,
    };
  }, [tasks, projects, routineLogs]);

  const plannerContext = useMemo(() => {
    return {
      userName,
      today: analysis.todayKey,
      reports: {
        today: {
          progress: analysis.todayProgress,
          total: analysis.todayTasks.length,
          done: analysis.todayDone.length,
          remaining: analysis.remainingToday.length,
        },
        week: {
          progress: analysis.weekProgress,
          total: analysis.weekTasks.length,
          done: analysis.weekDone.length,
        },
        month: {
          progress: analysis.monthProgress,
          total: analysis.monthTasks.length,
          done: analysis.monthDone.length,
        },
      },
      focusScore: analysis.focusScore,
      routineScore: analysis.routineScore,
      lateTasks: analysis.lateTasks.map((task) => ({
        id: task.id,
        name: task.name || task.title,
        date: getTaskDate(task),
        hour: getTaskHour(task),
        priority: task.priority,
        project: getProjectName(task, projects),
      })),
      priorityTasks: analysis.priorityTasks.map((task) => ({
        id: task.id,
        name: task.name || task.title,
        date: getTaskDate(task),
        hour: getTaskHour(task),
        priority: task.priority,
        reason: task.ai_reason,
        project: getProjectName(task, projects),
      })),
      tasks: tasks.slice(0, 80).map((task) => ({
        id: task.id,
        name: task.name || task.title,
        date: getTaskDate(task),
        hour: getTaskHour(task),
        priority: task.priority,
        category: task.category,
        done: isDone(task),
        project: getProjectName(task, projects),
      })),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        due_date: project.due_date,
      })),
    };
  }, [userName, analysis, tasks, projects]);

  async function sendMessage(message?: string) {
    const text = (message || input).trim();

    if (!text || aiLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setAiLoading(true);
    setActions([]);
    setActionMessage("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: nextMessages,
          plannerContext,
        }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          data?.reply ||
          "Je n’ai pas réussi à répondre. Vérifie la configuration de l’assistant.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setActions(Array.isArray(data?.actions) ? data.actions : []);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error?.message ||
            "Erreur de connexion avec l’assistant IA. Vérifie /api/assistant.",
        },
      ]);
    }

    setAiLoading(false);
  }

  async function applyAction(action: PlannerAction, index: number) {
    if (!user) return;

    setActionMessage("");

    const project =
      action.project_name && action.project_name.trim()
        ? projects.find(
            (p) =>
              p.name?.toLowerCase().trim() ===
              action.project_name?.toLowerCase().trim()
          )
        : null;

    const payload: any = {
      user_id: user.id,
      name: action.name,
      due_date: action.due_date,
      hour: action.hour,
      end_time: action.end_time,
      priority: action.priority || "Normale",
      category: action.category || "Autre",
      done: false,
      status: "todo",
    };

    if (project?.id) {
      payload.project_id = project.id;
    }

    const { error } = await supabase.from("tasks").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setActions((prev) => prev.filter((_, i) => i !== index));
    setActionMessage("Tâche créée dans ton planner.");
    await loadData();
  }

  const report =
    reportMode === "day"
      ? {
          title: "Très bonne journée !",
          progress: analysis.todayProgress,
          total: analysis.todayTasks.length,
          done: analysis.todayDone.length,
          text: analysis.diagnosis,
          planned: "7h 30m",
          focus: "4h 32m",
        }
      : reportMode === "week"
      ? {
          title: "Rapport semaine",
          progress: analysis.weekProgress,
          total: analysis.weekTasks.length,
          done: analysis.weekDone.length,
          text:
            "Vue globale de ta semaine : tâches prévues, retards, routines et progression de tes projets.",
          planned: "34h",
          focus: "19h",
        }
      : {
          title: "Rapport mensuel",
          progress: analysis.monthProgress,
          total: analysis.monthTasks.length,
          done: analysis.monthDone.length,
          text:
            "Vue mensuelle : ton rythme global, les projets actifs et ce qui bloque ta productivité.",
          planned: "120h",
          focus: "74h",
        };

  return (
    <main className="min-h-screen bg-[#030712] text-white flex overflow-hidden">
      <Sidebar />

      <section className="flex-1 overflow-y-auto px-7 py-7">
        <div className="mx-auto max-w-[1580px]">
          <header className="mb-6 flex items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_35px_rgba(139,92,246,0.25)]">
                <Sparkles size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Espace IA
                </h1>

                <p className="mt-2 text-sm text-white/45">
                  Votre partenaire intelligent pour planifier, prioriser et progresser.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] hover:text-white">
                <Sparkles size={18} />
              </button>

              <button className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] hover:text-white">
                <CircleAlert size={18} />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-400" />
              </button>

              <Link
                href="/settings/profil"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 transition hover:bg-white/[0.08]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                  {userName.slice(0, 1).toUpperCase()}
                </div>

                <div className="hidden lg:block">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-[11px] text-white/35">Compte actif</p>
                </div>
              </Link>
            </div>
          </header>

          {loading && (
            <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-12 text-center text-white/45 shadow-2xl shadow-black/20 backdrop-blur-2xl">
              Chargement de l’assistant...
            </section>
          )}

          {!loading && (
            <section className="grid grid-cols-[1.35fr_1fr] gap-5">
              <div className="flex min-h-[760px] flex-col rounded-[26px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-2xl">
                <div className="flex items-start justify-between border-b border-white/10 p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_35px_rgba(139,92,246,0.3)]">
                      <Bot size={25} />
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-[#07111f]" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold">
                        Assistant personnel IA
                      </h2>

                      <p className="mt-1 text-sm text-white/40">
                        Posez une question, obtenez des réponses et des recommandations.
                      </p>
                    </div>
                  </div>

                  <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/45 transition hover:bg-white/[0.07] hover:text-white">
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_26px_rgba(139,92,246,0.3)]">
                          <Bot size={17} />
                        </div>
                      )}

                      <div
                        className={`max-w-[76%] whitespace-pre-line rounded-2xl border px-5 py-4 text-sm leading-6 shadow-xl shadow-black/20 ${
                          message.role === "user"
                            ? "border-blue-400/20 bg-blue-600/25 text-white"
                            : "border-white/10 bg-black/25 text-white/75"
                        }`}
                      >
                        {message.content}
                      </div>

                      {message.role === "user" && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black">
                          <User size={17} />
                        </div>
                      )}
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="flex items-center gap-3 text-sm text-white/40">
                      <Loader2 size={18} className="animate-spin" />
                      L’assistant réfléchit...
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div className="border-t border-white/10 p-5">
                  {actions.length > 0 && (
                    <div className="mb-4 rounded-[22px] border border-violet-400/20 bg-violet-500/10 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Actions proposées
                        </p>

                        <button
                          onClick={() => setActions([])}
                          className="text-white/35 transition hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {actions.map((action, index) => (
                          <div
                            key={`${action.name}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/25 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold">
                                  {action.name}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-white/40">
                                  {action.due_date || "Date à compléter"} ·{" "}
                                  {action.hour || "Heure à compléter"} ·{" "}
                                  {action.priority}
                                </p>

                                <p className="mt-2 text-xs leading-5 text-white/35">
                                  {action.reason}
                                </p>
                              </div>

                              <button
                                onClick={() => applyAction(action, index)}
                                className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90"
                              >
                                <Plus size={14} />
                                Créer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {actionMessage && (
                    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      <Check size={16} />
                      {actionMessage}
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-white/65">
                      Sujets rapides
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <QuickPrompt
                        icon={<CalendarDays size={13} />}
                        label="Planifier ma journée"
                        onClick={() =>
                          sendMessage("Planifie-moi ma journée efficacement")
                        }
                      />

                      <QuickPrompt
                        icon={<Target size={13} />}
                        label="Prioriser mes tâches"
                        onClick={() =>
                          sendMessage("Classe mes tâches par ordre de priorité")
                        }
                      />

                      <QuickPrompt
                        icon={<Sparkles size={13} />}
                        label="Préparer une réunion"
                        onClick={() =>
                          sendMessage("Aide-moi à préparer une réunion importante")
                        }
                      />

                      <QuickPrompt
                        icon={<BarChart3 size={13} />}
                        label="Analyser ma semaine"
                        onClick={() =>
                          sendMessage("Analyse ma semaine de productivité")
                        }
                      />

                      <QuickPrompt
                        icon={<CheckCircle2 size={13} />}
                        label="M’améliorer en productivité"
                        onClick={() =>
                          sendMessage("Comment améliorer ma productivité ?")
                        }
                      />

                      <QuickPrompt
                        icon={<Clock3 size={13} />}
                        label="Gérer mon énergie"
                        onClick={() =>
                          sendMessage("Aide-moi à mieux gérer mon énergie")
                        }
                      />

                      <QuickPrompt
                        icon={<FolderKanban size={13} />}
                        label="Faire le point sur mes projets"
                        onClick={() =>
                          sendMessage("Fais le point sur mes projets")
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-5 py-3">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            sendMessage();
                          }
                        }}
                        placeholder="Écrivez votre message..."
                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      />

                      <button className="text-white/35 transition hover:text-white">
                        <Paperclip size={18} />
                      </button>
                    </div>

                    <button className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/55 transition hover:bg-white/[0.08] hover:text-white">
                      <Mic size={18} />
                    </button>

                    <button
                      onClick={() => sendMessage()}
                      disabled={aiLoading}
                      className="flex h-[54px] w-[62px] items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.35)] transition hover:scale-105 disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <Loader2 size={19} className="animate-spin" />
                      ) : (
                        <Send size={19} />
                      )}
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] text-white/30">
                    L’IA peut se tromper. Vérifiez les informations importantes.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} className="text-violet-300" />
                      <h2 className="text-xl font-semibold">
                        Rapport de productivité
                      </h2>
                    </div>

                    <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-black/25 p-1">
                      <ReportButton
                        active={reportMode === "day"}
                        label="Jour"
                        onClick={() => setReportMode("day")}
                      />

                      <ReportButton
                        active={reportMode === "week"}
                        label="Semaine"
                        onClick={() => setReportMode("week")}
                      />

                      <ReportButton
                        active={reportMode === "month"}
                        label="Mois"
                        onClick={() => setReportMode("month")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[150px_1fr] gap-5">
                    <div className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(#f59e0b 0deg, #f59e0b ${
                            report.progress * 1.35
                          }deg, #60a5fa ${
                            report.progress * 1.35
                          }deg, #8b5cf6 ${report.progress * 2.7}deg, rgba(255,255,255,0.08) ${
                            report.progress * 3.6
                          }deg)`,
                        }}
                      />

                      <div className="absolute inset-4 rounded-full bg-[#07111f]" />

                      <div className="relative text-center">
                        <p className="text-4xl font-semibold">
                          {analysis.focusScore}
                        </p>
                        <p className="text-sm text-white/45">/100</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold">{report.title}</h3>

                      <p className="mt-2 text-sm leading-6 text-white/45">
                        {report.text}
                      </p>

                      <div className="mt-5 grid grid-cols-3 gap-4">
                        <ReportStat
                          label="Focus"
                          value={report.focus}
                          icon={<Clock3 size={13} />}
                        />

                        <ReportStat
                          label="Tâches terminées"
                          value={`${report.done} / ${report.total}`}
                          icon={<CheckCircle2 size={13} />}
                        />

                        <ReportStat
                          label="Temps planifié"
                          value={report.planned}
                          icon={<CalendarDays size={13} />}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-sky-400" />
                      <h2 className="text-xl font-semibold">
                        Ordre de tâches recommandé
                      </h2>
                    </div>

                    <Link
                      href="/tasks"
                      className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/45 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      Voir toutes
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {analysis.priorityTasks.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">
                        Aucune priorité critique détectée.
                      </div>
                    )}

                    {analysis.priorityTasks.map((task, index) => (
                      <div
                        key={`${task.id}-${index}`}
                        className="grid grid-cols-[26px_1fr_auto_auto] items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
                          {index + 1}
                        </div>

                        <p className="truncate text-sm font-medium">
                          {task.name || task.title || "Sans titre"}
                        </p>

                        <span
                          className={`rounded-lg border px-2 py-1 text-[10px] ${priorityTone(
                            task.priority || "Normale"
                          )}`}
                        >
                          {task.priority || "Normale"}
                        </span>

                        <span className="text-xs text-white/45">
                          {getTaskHour(task)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rocket size={18} className="text-blue-400" />
                      <h2 className="text-xl font-semibold">Aide projets</h2>
                    </div>

                    <Link
                      href="/projects"
                      className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/45 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      Voir tous
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {projects.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">
                        Aucun projet actif.
                      </div>
                    )}

                    {projects.slice(0, 2).map((project) => {
                      const progress = getProjectProgress(project, tasks);

                      return (
                        <div
                          key={project.id}
                          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-3"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
                            <Rocket size={20} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {project.name || "Projet sans nom"}
                            </p>

                            <p className="mt-1 text-xs text-white/35">
                              Avancement : {progress}% · Prochaine étape critique
                            </p>
                          </div>

                          <Link
                            href={`/projects/${project.id}`}
                            className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                          >
                            Voir suggestions
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <MiniCard
                    icon={<AlertTriangle size={18} />}
                    label="Retards"
                    value={analysis.lateTasks.length}
                    sub="à traiter"
                    tone="red"
                  />

                  <MiniCard
                    icon={<CheckCircle2 size={18} />}
                    label="Routines"
                    value={analysis.routineTasks.length}
                    sub={`${analysis.routineScore}%`}
                    tone="green"
                  />

                  <MiniCard
                    icon={<FolderKanban size={18} />}
                    label="Projets actifs"
                    value={analysis.activeProjects}
                    sub="stable"
                    tone="blue"
                  />

                  <MiniCard
                    icon={<Brain size={18} />}
                    label="Focus Score"
                    value={analysis.focusScore}
                    sub="points"
                    tone="violet"
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function QuickPrompt({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-xs text-white/60 transition hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}

function ReportButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30"
          : "text-white/45 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function ReportStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-l border-white/10 pl-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
        {icon}
        {label}
      </div>

      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  tone: "red" | "green" | "blue" | "violet";
}) {
  const color =
    tone === "red"
      ? "text-red-400"
      : tone === "green"
      ? "text-emerald-400"
      : tone === "blue"
      ? "text-blue-400"
      : "text-violet-400";

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <div className={`mb-4 ${color}`}>{icon}</div>

      <p className="text-3xl font-semibold">{value}</p>

      <p className="mt-1 text-sm text-white">{label}</p>

      <p className={`mt-2 text-xs ${color}`}>↗ {sub}</p>
    </div>
  );
}