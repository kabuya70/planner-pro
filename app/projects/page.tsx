"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Search,
  MoreVertical,
  CalendarDays,
  CheckCircle2,
  Archive,
  Trash2,
  Loader2,
  Eye,
  Pencil,
  X,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const colors = ["#64748b", "#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

export default function ProjectsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [color, setColor] = useState(colors[0]);

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

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", currentUser.id);

    if (projectError) {
      alert(projectError.message);
    }

    if (taskError) {
      console.error(taskError.message);
    }

    setProjects((projectData || []).filter((project) => !project.archived));
    setTasks(taskData || []);
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setColor(colors[0]);
    setEditingProject(null);
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(project: any) {
    setEditingProject(project);
    setName(project.name || "");
    setDescription(project.description || "");
    setStartDate(project.start_date || "");
    setEndDate(project.end_date || "");
    setColor(project.color || colors[0]);
    setOpenMenuId(null);
    setModalOpen(true);
  }

  async function saveProject() {
    if (!name.trim()) return;

    const currentUser = user || (await getCurrentUser());

    if (!currentUser) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      color,
      archived: false,
      status: "active",
    };

    if (editingProject) {
      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editingProject.id)
        .eq("user_id", currentUser.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projects").insert({
        ...payload,
        user_id: currentUser.id,
      });

      if (error) {
        alert(error.message);
        return;
      }
    }

    resetForm();
    setModalOpen(false);
    loadData();
  }

  async function archiveProject(id: string) {
    if (!user) return;

    const { error } = await supabase
      .from("projects")
      .update({ archived: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setOpenMenuId(null);
    loadData();
  }

  async function deleteProject(id: string) {
    if (!user) return;

    const confirmDelete = confirm(
      "Tu veux vraiment supprimer ce projet ? Les tâches liées ne seront pas supprimées automatiquement."
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setOpenMenuId(null);
    loadData();
  }

  function projectTasks(projectId: string) {
    return tasks.filter((task) => task.project_id === projectId);
  }

  function progress(projectId: string) {
    const list = projectTasks(projectId);

    if (list.length === 0) return 0;

    const done = list.filter((task) => task.done || task.status === "done").length;

    return Math.round((done / list.length) * 100);
  }

  function projectStatus(project: any, remaining: number) {
    if (!project.end_date) {
      return { label: "En cours", color: "text-slate-400" };
    }

    const today = new Date();
    const end = new Date(project.end_date);

    const diff = Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff < 0 && remaining > 0) {
      return { label: "En retard", color: "text-red-400" };
    }

    if (diff <= 7 && remaining > 0) {
      return { label: "À surveiller", color: "text-yellow-400" };
    }

    return { label: "En avance", color: "text-green-400" };
  }

  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const linkedTasks = tasks.filter((task) => task.project_id);
    const done = linkedTasks.filter((task) => task.done || task.status === "done").length;

    const global =
      linkedTasks.length > 0 ? Math.round((done / linkedTasks.length) * 100) : 0;

    return {
      active: projects.length,
      linked: linkedTasks.length,
      done,
      global,
    };
  }, [projects, tasks]);

  return (
    <main className="min-h-screen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8 text-white">
        <header className="mb-8 flex items-center justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              Projets
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">Mes projets</h1>

            <p className="mt-2 text-slate-400">
              Suis tes projets, leurs tâches, leurs échéances et leur avancement.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
          >
            <Plus size={18} />
            Nouveau projet
          </button>
        </header>

        <div className="mb-6 grid grid-cols-4 gap-4">
          <Stat label="Projets actifs" value={stats.active} />
          <Stat label="Tâches liées" value={stats.linked} />
          <Stat label="Terminées" value={stats.done} />
          <Stat label="Avancement global" value={`${stats.global}%`} />
        </div>

        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <Search size={18} className="text-slate-500" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center rounded-[32px] border border-white/10 bg-slate-950/70 p-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-slate-400" size={28} />
              <p className="text-sm text-slate-400">Chargement des projets...</p>
            </div>
          </div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <div className="rounded-[32px] border border-dashed border-white/10 bg-slate-950/60 p-12 text-center">
            <FolderKanban className="mx-auto mb-4 text-slate-600" size={42} />

            <h2 className="text-xl font-semibold text-white">Aucun projet</h2>

            <p className="mt-2 text-sm text-slate-400">
              Crée ton premier projet pour organiser tes tâches.
            </p>

            <button
              onClick={openCreateModal}
              className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              Créer un projet
            </button>
          </div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const list = projectTasks(project.id);
              const done = list.filter(
                (task) => task.done || task.status === "done"
              ).length;
              const remaining = list.length - done;
              const percent = progress(project.id);
              const status = projectStatus(project, remaining);

              return (
                <div
                  key={project.id}
                  className="rounded-[32px] border border-white/10 bg-slate-950/70 p-5 text-white shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-slate-900/80"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-1 h-4 w-4 rounded-full ring-2 ring-white/10"
                        style={{ backgroundColor: project.color || "#64748b" }}
                      />

                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-xl font-semibold text-white transition hover:text-slate-300"
                        >
                          {project.name || "Projet sans nom"}
                        </Link>

                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
                          {project.description || "Aucune description."}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === project.id ? null : project.id
                          )
                        }
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenuId === project.id && (
                        <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-white/10 bg-[#070b16] p-2 shadow-2xl shadow-black/50">
                          <button
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                          >
                            <Eye size={16} />
                            Voir les tâches
                          </button>

                          <button
                            onClick={() => openEditModal(project)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                          >
                            <Pencil size={16} />
                            Modifier
                          </button>

                          <button
                            onClick={() => archiveProject(project.id)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                          >
                            <Archive size={16} />
                            Archiver
                          </button>

                          <button
                            onClick={() => deleteProject(project.id)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <MiniInfo
                      icon={<CheckCircle2 size={15} />}
                      label="Tâches"
                      value={`${done}/${list.length}`}
                    />

                    <MiniInfo
                      icon={<CalendarDays size={15} />}
                      label="Échéance"
                      value={
                        project.end_date
                          ? project.end_date.split("-").reverse().join("/")
                          : "Aucune"
                      }
                    />
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Avancement</span>
                      <span className="font-semibold text-slate-300">
                        {percent}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${status.color}`}>
                      {status.label}
                    </span>

                    <button
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Ouvrir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-xl">
            <div className="w-full max-w-[560px] rounded-[36px] border border-white/10 bg-[#050816] p-6 text-white shadow-2xl shadow-black/50">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    {editingProject ? "Modifier" : "Nouveau projet"}
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {editingProject ? "Modifier le projet" : "Créer un projet"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Ajoute les informations principales de ton projet.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Field
                  label="Nom du projet"
                  value={name}
                  onChange={setName}
                  placeholder="Ex : Révision semestre, chantier, business..."
                />

                <label className="block">
                  <p className="mb-2 text-sm text-slate-400">Description</p>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décris rapidement ton projet..."
                    className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Date de début"
                    type="date"
                    value={startDate}
                    onChange={setStartDate}
                  />

                  <Field
                    label="Date de fin"
                    type="date"
                    value={endDate}
                    onChange={setEndDate}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm text-slate-400">Couleur</p>

                  <div className="flex gap-2">
                    {colors.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setColor(item)}
                        className={`h-9 w-9 rounded-full border transition ${
                          color === item
                            ? "scale-110 border-white"
                            : "border-white/10"
                        }`}
                        style={{ backgroundColor: item }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Annuler
                </button>

                <button
                  onClick={saveProject}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
                >
                  {editingProject ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-slate-950/70 p-5 text-white shadow-2xl shadow-black/20">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-white">
      <div className="mb-1 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>

      <p className="text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm text-slate-400">{label}</p>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 [color-scheme:dark]"
      />
    </label>
  );
}