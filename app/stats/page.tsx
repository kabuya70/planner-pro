"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  Mic,
  MoreHorizontal,
  Paperclip,
  Send,
  Sparkles,
  Target,
  User,
  Zap,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Message = {
  role: "user" | "assistant";
  content: string;
};

const quickPrompts = [
  "Planifier ma journée",
  "Prioriser mes tâches",
  "Préparer une réunion",
  "Analyser ma semaine",
  "M’améliorer en productivité",
  "Gérer mon énergie",
  "Faire le point sur mes projets",
];

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function getTaskDate(task: any) {
  const value = task?.due_date || task?.date;
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getTaskHour(task: any) {
  if (task?.hour) return String(task.hour).slice(0, 5);
  if (task?.start_time) return String(task.start_time).slice(0, 5);
  return "--:--";
}

function isDone(task: any) {
  return task?.done === true || task?.status === "done";
}

function isRoutine(task: any) {
  return task?.type === "routine" || task?.category === "Routine";
}

function isUrgent(task: any) {
  const priority = String(task?.priority || "").toLowerCase();
  return priority.includes("urgent") || priority.includes("important");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sans date";

  const clean = String(value).slice(0, 10);
  const parts = clean.split("-");

  if (parts.length !== 3) return clean;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function buildAnswer(message: string, stats: any) {
  const text = message.toLowerCase();

  if (text.includes("journée") || text.includes("planifier")) {
    return `Oui. Je te propose de commencer par le travail profond, puis les tâches courtes, puis la planification.

• 09:00 – 11:00 : tâche la plus importante
• 11:00 – 12:00 : tâches administratives
• 14:00 – 15:30 : projet prioritaire
• 16:00 – 17:00 : révision et organisation
• 17:00 – 17:30 : planification de demain`;
  }

  if (text.includes("prioriser") || text.includes("priorité")) {
    if (stats.urgentTasks.length === 0 && stats.lateTasks.length === 0) {
      return "Aucune priorité critique détectée. Je te conseille donc de choisir une tâche importante liée à ton projet principal et de bloquer un vrai créneau pour l’avancer.";
    }

    const list = [...stats.urgentTasks, ...stats.lateTasks]
      .slice(0, 5)
      .map((task: any, index: number) => {
        return `${index + 1}. ${task.name || "Tâche sans nom"} — ${formatDate(
          getTaskDate(task)
        )} ${getTaskHour(task)}`;
      })
      .join("\n");

    return `Voici l’ordre recommandé :\n\n${list}`;
  }

  if (text.includes("projet")) {
    if (stats.activeProjects.length === 0) {
      return "Aucun projet actif détecté. Crée un projet, puis ajoute des tâches et des sous-tâches pour que je puisse mieux t’aider.";
    }

    const list = stats.activeProjects
      .slice(0, 5)
      .map((project: any, index: number) => {
        return `${index + 1}. ${project.name || "Projet sans nom"}`;
      })
      .join("\n");

    return `Voici les projets à suivre en priorité :\n\n${list}\n\nConseil : choisis un seul projet principal aujourd’hui et fais avancer au moins une action concrète.`;
  }

  if (text.includes("semaine")) {
    return `Pour ta semaine, je te conseille cette structure :

• 1 objectif principal
• 2 projets secondaires maximum
• 3 tâches importantes par jour
• 1 créneau de planification chaque soir
• 1 moment de récupération pour éviter la surcharge`;
  }

  return `J’ai analysé ton espace.

Aujourd’hui :
• ${stats.totalToday} tâche(s) prévue(s)
• ${stats.doneToday} tâche(s) terminée(s)
• ${stats.lateTasks.length} retard(s)
• ${stats.activeProjects.length} projet(s) actif(s)

Ma recommandation :
commence par une tâche importante, puis avance ton projet principal avant de traiter les petites tâches.`;
}

export default function AssistantPage() {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [period, setPeriod] = useState("Jour");
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

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

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${currentUser.id},user_id.is.null`)
      .order("created_at", { ascending: false });

    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .or(`user_id.eq.${currentUser.id},user_id.is.null`)
      .order("created_at", { ascending: false });

    const currentTasks = tasksData || [];
    const taskIds = currentTasks.map((task) => task.id);

    let subtasksData: any[] = [];
    let schedulesData: any[] = [];

    if (taskIds.length > 0) {
      const { data: subtaskResult } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds);

      subtasksData = subtaskResult || [];

      const { data: scheduleResult } = await supabase
        .from("subtask_schedule")
        .select("*")
        .in("task_id", taskIds);

      schedulesData = scheduleResult || [];
    }

    setTasks(currentTasks);
    setProjects((projectsData || []).filter((project) => !project.archived));
    setSubtasks(subtasksData);
    setSchedules(schedulesData);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const today = todayLocal();

    const todayTasks = tasks.filter((task) => {
      if (isRoutine(task)) return true;
      return getTaskDate(task) === today;
    });

    const doneToday = todayTasks.filter(isDone).length;

    const lateTasks = tasks.filter((task) => {
      const date = getTaskDate(task);
      return date && date < today && !isDone(task);
    });

    const urgentTasks = tasks.filter((task) => isUrgent(task) && !isDone(task));

    const routines = tasks.filter(isRoutine);
    const doneRoutines = routines.filter(isDone);

    const activeProjects = projects.filter(
      (project) => project.status !== "Terminé"
    );

    const focusScore = Math.min(
      100,
      Math.max(
        0,
        25 +
          doneToday * 12 +
          activeProjects.length * 5 -
          lateTasks.length * 8 -
          urgentTasks.length * 4
      )
    );

    return {
      todayTasks,
      totalToday: todayTasks.length,
      doneToday,
      lateTasks,
      urgentTasks,
      routines,
      doneRoutines,
      activeProjects,
      focusScore,
    };
  }, [tasks, projects]);

  async function sendMessage(messageOverride?: string) {
    const content = (messageOverride || input).trim();

    if (!content || sending) return;

    const userMessage: Message = {
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    setTimeout(() => {
      const answer = buildAnswer(content, stats);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
        },
      ]);

      setSending(false);
    }, 450);
  }

  const reportText = useMemo(() => {
    if (stats.lateTasks.length > 0) {
      return {
        title: "Attention aux retards",
        text: "Certaines tâches doivent être traitées rapidement pour éviter l’accumulation.",
      };
    }

    if (stats.totalToday === 0) {
      return {
        title: "Très bonne journée !",
        text: "Journée légère. C’est le bon moment pour planifier et clarifier tes projets.",
      };
    }

    return {
      title: "Journée productive",
      text: "Tu as des tâches prévues. Concentre-toi sur la plus importante avant le reste.",
    };
  }, [stats]);

  return (
    <main className="flex min-h-screen bg-[#030712] text-white">
      <Sidebar />

      <section className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/30">
                <Sparkles size={25} className="text-violet-300" />
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Espace IA
                </h1>

                <p className="mt-2 text-sm text-white/40">
                  Votre partenaire intelligent pour planifier, prioriser et
                  progresser.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Sparkles size={18} />
              </button>

              <button className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60">
                <CircleDot size={18} />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-400" />
              </button>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                  {String(
                    user?.user_metadata?.name ||
                      user?.email?.split("@")[0] ||
                      "R"
                  )
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {user?.user_metadata?.name ||
                      user?.email?.split("@")[0] ||
                      "Rais"}
                  </p>
                  <p className="text-xs text-white/35">Compte actif</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-[1.35fr_1fr] gap-6">
            <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#0a101c]/90 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                    <Bot size={24} className="text-violet-300" />
                    <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#0a101c] bg-emerald-400" />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold">
                      Assistant personnel IA
                    </h2>

                    <p className="mt-1 text-sm text-white/40">
                      Posez une question, obtenez des réponses et des
                      recommandations.
                    </p>
                  </div>
                </div>

                <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/50">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="h-[530px] overflow-y-auto p-5">
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-4 ${
                        message.role === "user" ? "justify-end" : ""
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-violet-300">
                          <Bot size={18} />
                        </div>
                      )}

                      <div
                        className={`max-w-[78%] whitespace-pre-line rounded-2xl border px-5 py-4 text-sm leading-7 shadow-xl shadow-black/20 ${
                          message.role === "user"
                            ? "border-white/10 bg-black/25 text-white"
                            : "border-white/10 bg-white/[0.035] text-white/75"
                        }`}
                      >
                        {message.content}
                      </div>

                      {message.role === "user" && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black">
                          <User size={18} />
                        </div>
                      )}
                    </div>
                  ))}

                  {sending && (
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-violet-300">
                        <Bot size={18} />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm text-white/45">
                        Analyse en cours...
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-white/10 p-5">
                <p className="mb-3 text-xs text-white/45">Sujets rapides</p>

                <div className="mb-4 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <CalendarDays size={14} />
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                      }}
                      placeholder="Écrivez votre message..."
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                    />

                    <Paperclip size={18} className="text-white/35" />
                  </div>

                  <button className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/60">
                    <Mic size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={sending}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-2xl shadow-violet-500/25 transition hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>

                <p className="mt-3 text-xs text-white/30">
                  L’IA peut se tromper. Vérifiez les informations importantes.
                </p>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={19} className="text-violet-300" />
                    <h2 className="text-xl font-semibold">
                      Rapport de productivité
                    </h2>
                  </div>

                  <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
                    {["Jour", "Semaine", "Mois"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPeriod(item)}
                        className={`rounded-xl px-5 py-2 text-sm transition ${
                          period === item
                            ? "bg-blue-500/25 text-white"
                            : "text-white/40 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <div
                      className="absolute inset-3 rounded-full"
                      style={{
                        background: `conic-gradient(#0ea5e9 ${stats.focusScore}%, rgba(255,255,255,0.08) 0)`,
                      }}
                    />
                    <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#06101f]">
                      <p className="text-4xl font-semibold">
                        {stats.focusScore}
                      </p>
                      <p className="text-xs text-white/45">/100</p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {reportText.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/45">
                      {reportText.text}
                    </p>

                    <div className="mt-5 grid grid-cols-3 divide-x divide-white/10">
                      <ReportMini label="Focus" value="4h 32m" />
                      <ReportMini
                        label="Tâches terminées"
                        value={`${stats.doneToday} / ${stats.totalToday}`}
                      />
                      <ReportMini label="Temps planifié" value="7h 30m" />
                    </div>
                  </div>
                </div>
              </section>

              <RightPanel
                icon={<CheckCircle2 size={18} className="text-sky-400" />}
                title="Ordre de tâches recommandé"
                button="Voir toutes"
              >
                {stats.urgentTasks.length === 0 && stats.lateTasks.length === 0 ? (
                  <EmptyBox text="Aucune priorité critique détectée." />
                ) : (
                  <div className="space-y-3">
                    {[...stats.urgentTasks, ...stats.lateTasks]
                      .slice(0, 4)
                      .map((task: any) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <p className="text-sm font-semibold text-white/75">
                            {task.name || "Tâche sans nom"}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            {formatDate(getTaskDate(task))} · {getTaskHour(task)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </RightPanel>

              <RightPanel
                icon={<Zap size={18} className="text-sky-400" />}
                title="Aide projets"
                button="Voir tous"
              >
                {stats.activeProjects.length === 0 ? (
                  <EmptyBox text="Aucun projet actif." />
                ) : (
                  <div className="space-y-3">
                    {stats.activeProjects.slice(0, 4).map((project: any) => (
                      <a
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.07]"
                      >
                        <p className="text-sm font-semibold text-white/75">
                          {project.name || "Projet sans nom"}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          Ouvrir le projet
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </RightPanel>

              <section className="grid grid-cols-4 gap-4">
                <SmallStat
                  icon={<AlertTriangle size={18} />}
                  color="text-red-400"
                  value={stats.lateTasks.length}
                  label="Retards"
                  sub="à traiter"
                />

                <SmallStat
                  icon={<CheckCircle2 size={18} />}
                  color="text-emerald-400"
                  value={stats.doneRoutines.length}
                  label="Routines"
                  sub={`${stats.routines.length} total`}
                />

                <SmallStat
                  icon={<Briefcase size={18} />}
                  color="text-blue-400"
                  value={stats.activeProjects.length}
                  label="Projets actifs"
                  sub="stable"
                />

                <SmallStat
                  icon={<Activity size={18} />}
                  color="text-violet-400"
                  value={stats.focusScore}
                  label="Focus Score"
                  sub="points"
                />
              </section>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}

function ReportMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function RightPanel({
  icon,
  title,
  button,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  button: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>

        <button className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-xs text-white/70">
          {button}
        </button>
      </div>

      {children}
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-7 text-center text-sm text-white/35">
      {text}
    </div>
  );
}

function SmallStat({
  icon,
  color,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  color: string;
  value: string | number;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className={color}>{icon}</div>

      <p className="mt-6 text-3xl font-semibold text-white">{value}</p>

      <p className="mt-2 text-sm font-semibold text-white/80">{label}</p>

      <p className="mt-2 text-xs text-white/35">{sub}</p>
    </div>
  );
}