"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FolderKanban,
  Trash2,
  CheckCircle2,
  ListTodo,
  Target,
  ArrowUpRight,
  X,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const projectColors = [
  "#38bdf8",
  "#22c55e",
  "#8b5cf6",
  "#f97316",
  "#ef4444",
  "#eab308",
];

function isDone(task: any) {
  return task?.done === true || task?.status === "done";
}

function getProjectRealProgress(
  projectId: string,
  tasks: any[],
  subtasks: any[],
  schedules: any[]
) {
  const projectTasks = tasks.filter((task) => task.project_id === projectId);
  const taskIds = projectTasks.map((task) => task.id);

  const projectSchedules = schedules.filter((schedule) =>
    taskIds.includes(schedule.task_id)
  );

  if (projectSchedules.length > 0) {
    const done = projectSchedules.filter((schedule) => schedule.done).length;

    return {
      total: projectSchedules.length,
      done,
      progress: Math.round((done / projectSchedules.length) * 100),
      source: "planning",
      label: "case(s)",
    };
  }

  const projectSubtasks = subtasks.filter((subtask) =>
    taskIds.includes(subtask.task_id)
  );

  if (projectSubtasks.length > 0) {
    const done = projectSubtasks.filter((subtask) => subtask.done).length;

    return {
      total: projectSubtasks.length,
      done,
      progress: Math.round((done / projectSubtasks.length) * 100),
      source: "sous-taches",
      label: "sous-tache(s)",
    };
  }

  if (projectTasks.length > 0) {
    const done = projectTasks.filter(isDone).length;

    return {
      total: projectTasks.length,
      done,
      progress: Math.round((done / projectTasks.length) * 100),
      source: "taches",
      label: "tache(s)",
    };
  }

  return {
    total: 0,
    done: 0,
    progress: 0,
    source: "vide",
    label: "element(s)",
  };
}

export default function ProjectsPage() {
  const [user, setUser] = useState<any>(null);

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState(projectColors[0]);

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

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .or(`user_id.eq.${currentUser.id},user_id.is.null`)
      .order("created_at", { ascending: false });

    if (projectsError) {
      alert(projectsError.message);
      setLoading(false);
      return;
    }

    const projectList = (projectsData || []).filter(
      (project) => !project.archived
    );

    const projectIds = projectList.map((project) => project.id);

    let tasksData: any[] = [];
    let subtasksData: any[] = [];
    let schedulesData: any[] = [];

    if (projectIds.length > 0) {
      const { data: taskResult, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("project_id", projectIds);

      if (tasksError) {
        alert(tasksError.message);
        setLoading(false);
        return;
      }

      tasksData = taskResult || [];

      const taskIds = tasksData.map((task) => task.id);

      if (taskIds.length > 0) {
        const { data: subtaskResult, error: subtasksError } = await supabase
          .from("subtasks")
          .select("*")
          .in("task_id", taskIds);

        if (subtasksError) {
          alert(subtasksError.message);
          setLoading(false);
          return;
        }

        subtasksData = subtaskResult || [];

        const { data: scheduleResult, error: schedulesError } = await supabase
          .from("subtask_schedule")
          .select("*")
          .in("task_id", taskIds);

        if (schedulesError) {
          alert(schedulesError.message);
          setLoading(false);
          return;
        }

        schedulesData = scheduleResult || [];
      }
    }

    setProjects(projectList);
    setTasks(tasksData);
    setSubtasks(subtasksData);
    setSchedules(schedulesData);
    setLoading(false);
  }

  async function createProject() {
    if (!user) {
      alert("Utilisateur non connecté.");
      return;
    }

    if (!projectName.trim()) {
      alert("Ajoute un nom de projet.");
      return;
    }

    setCreating(true);

    const payload: any = {
      user_id: user.id,
      name: projectName.trim(),
      description: projectDescription.trim() || null,
      color: projectColor,
    };

    const { error } = await supabase.from("projects").insert(payload);

    if (error) {
      alert(error.message);
      setCreating(false);
      return;
    }

    setProjectName("");
    setProjectDescription("");
    setProjectColor(projectColors[0]);
    setShowModal(false);

    await loadData();

    setCreating(false);
  }

  async function deleteProject(projectId: string) {
    const ok = confirm(
      "Supprimer ce projet ? Les tâches, sous-tâches et planifications liées seront aussi supprimées."
    );

    if (!ok) return;

    const projectTasks = tasks.filter((task) => task.project_id === projectId);
    const taskIds = projectTasks.map((task) => task.id);

    if (taskIds.length > 0) {
      await supabase.from("subtask_schedule").delete().in("task_id", taskIds);
      await supabase.from("subtasks").delete().in("task_id", taskIds);
      await supabase.from("tasks").delete().in("id", taskIds);
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return projects;

    return projects.filter((project) => {
      const name = String(project.name || "").toLowerCase();
      const description = String(project.description || "").toLowerCase();

      return name.includes(q) || description.includes(q);
    });
  }, [projects, search]);

  const stats = useMemo(() => {
    const realProgressList = projects.map((project) =>
      getProjectRealProgress(project.id, tasks, subtasks, schedules)
    );

    const totalUnits = realProgressList.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const doneUnits = realProgressList.reduce(
      (sum, item) => sum + item.done,
      0
    );

    const globalProgress =
      totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

    return {
      activeProjects: projects.length,
      linkedTasks: tasks.length,
      doneUnits,
      totalUnits,
      globalProgress,
    };
  }, [projects, tasks, subtasks, schedules]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-8 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                Projets
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                Mes projets
              </h1>

              <p className="mt-3 text-white/45">
                Suis tes projets, leurs tâches, leurs échéances et leur
                avancement.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <Plus size={18} />
              Nouveau projet
            </button>
          </header>

          <section className="mb-7 grid grid-cols-4 gap-5">
            <StatCard label="Projets actifs" value={stats.activeProjects} />
            <StatCard label="Tâches liées" value={stats.linkedTasks} />
            <StatCard
              label="Éléments validés"
              value={`${stats.doneUnits}/${stats.totalUnits}`}
            />
            <StatCard
              label="Avancement global"
              value={`${stats.globalProgress}%`}
            />
          </section>

          <section className="mb-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
            <Search size={18} className="text-white/35" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </section>

          {loading && (
            <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-14 text-center text-white/40">
              Chargement des projets...
            </section>
          )}

          {!loading && filteredProjects.length === 0 && (
            <section className="rounded-[34px] border border-dashed border-white/10 bg-white/[0.025] p-16 text-center shadow-2xl shadow-black/20">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-white/35">
                <FolderKanban size={30} />
              </div>

              <h2 className="text-2xl font-semibold text-white">
                Aucun projet
              </h2>

              <p className="mt-3 text-sm text-white/40">
                Crée ton premier projet pour organiser tes tâches.
              </p>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="mt-8 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Créer un projet
              </button>
            </section>
          )}

          {!loading && filteredProjects.length > 0 && (
            <section className="grid grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const progress = getProjectRealProgress(
                  project.id,
                  tasks,
                  subtasks,
                  schedules
                );

                const color = project.color || "#64748b";

                return (
                  <article
                    key={project.id}
                    className="group rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.06]"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-4 flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25"
                            style={{
                              boxShadow: `0 0 22px ${color}33`,
                            }}
                          >
                            <FolderKanban size={19} style={{ color }} />
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold text-white">
                              {project.name || "Projet sans nom"}
                            </h2>

                            <p className="mt-1 text-xs text-white/35">
                              Basé sur : {progress.label}
                            </p>
                          </div>
                        </div>

                        <p className="line-clamp-2 min-h-[40px] text-sm leading-5 text-white/40">
                          {project.description || "Aucune description."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteProject(project.id)}
                        className="rounded-2xl border border-white/10 bg-black/20 p-2 text-white/35 opacity-0 transition hover:text-red-300 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mb-5 grid grid-cols-3 gap-3">
                      <MiniStat
                        icon={<ListTodo size={15} />}
                        label="Total"
                        value={progress.total}
                      />

                      <MiniStat
                        icon={<CheckCircle2 size={15} />}
                        label="Faits"
                        value={progress.done}
                      />

                      <MiniStat
                        icon={<Target size={15} />}
                        label="Progression"
                        value={`${progress.progress}%`}
                      />
                    </div>

                    <div className="mb-5">
                      <div className="mb-2 flex items-center justify-between text-xs text-white/35">
                        <span>Avancement réel</span>
                        <span>{progress.progress}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress.progress}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 18px ${color}`,
                          }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/projects/${project.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.14] hover:text-white"
                    >
                      Ouvrir le projet
                      <ArrowUpRight size={15} />
                    </Link>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[34px] border border-white/10 bg-[#060b14]/95 p-6 shadow-2xl shadow-black">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                  Nouveau projet
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Créer un projet
                </h2>

                <p className="mt-2 text-sm text-white/40">
                  Donne un nom, une description et une couleur à ton projet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/45 hover:bg-white/[0.07] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <p className="mb-2 text-sm text-white/45">Nom du projet</p>

                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex : Créer une association"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>

              <label className="block">
                <p className="mb-2 text-sm text-white/45">Description</p>

                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Décris rapidement l’objectif du projet..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>

              <div>
                <p className="mb-2 text-sm text-white/45">Couleur</p>

                <div className="flex flex-wrap gap-3">
                  {projectColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProjectColor(color)}
                      className={`h-10 w-10 rounded-2xl border transition ${
                        projectColor === color
                          ? "border-white scale-110"
                          : "border-white/10"
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow:
                          projectColor === color
                            ? `0 0 24px ${color}`
                            : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={createProject}
                disabled={creating}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
              >
                {creating ? "Création..." : "Créer le projet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20">
      <p className="text-sm text-white/40">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="mb-2 text-white/35">{icon}</div>
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-white/35">{label}</p>
    </div>
  );
}