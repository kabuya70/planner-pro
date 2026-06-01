"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  FolderKanban,
  Plus,
  Archive,
  Trash2,
  Search,
  MoreVertical,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const colors = ["#64748b", "#94a3b8", "#cbd5e1", "#475569", "#22c55e"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [color, setColor] = useState(colors[0]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: taskData } = await supabase.from("tasks").select("*");

    setProjects((projectData || []).filter((p) => !p.archived));
    setTasks(taskData || []);
  }

  async function addProject() {
    if (!name.trim()) return;

    await supabase.from("projects").insert({
      name,
      description,
      start_date: startDate || null,
      end_date: endDate || null,
      color,
      archived: false,
      status: "active",
    });

    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setColor(colors[0]);
    setModalOpen(false);
    loadData();
  }

  async function archiveProject(id: string) {
    await supabase.from("projects").update({ archived: true }).eq("id", id);
    loadData();
  }

  async function deleteProject(id: string) {
    await supabase.from("projects").delete().eq("id", id);
    loadData();
  }

  function projectTasks(projectId: string) {
    return tasks.filter((t) => t.project_id === projectId);
  }

  function progress(projectId: string) {
    const list = projectTasks(projectId);
    if (list.length === 0) return 0;
    return Math.round((list.filter((t) => t.done).length / list.length) * 100);
  }

  function projectStatus(project: any, remaining: number) {
    if (!project.end_date) return { label: "En cours", color: "text-white/45" };

    const today = new Date();
    const end = new Date(project.end_date);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0 && remaining > 0) return { label: "En retard", color: "text-red-400" };
    if (diff <= 7 && remaining > 0) return { label: "À surveiller", color: "text-yellow-400" };
    return { label: "En avance", color: "text-green-400" };
  }

  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const linkedTasks = tasks.filter((t) => t.project_id);
    const done = linkedTasks.filter((t) => t.done).length;
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

      <section className="flex-1 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
              Projets
            </p>
            <h1 className="text-3xl font-semibold mt-2">Centre de pilotage</h1>
            <p className="text-white/45 mt-2">
              Suis tes projets, leurs tâches, leurs échéances et leur avancement.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="rounded-2xl bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Nouveau projet
          </button>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Stat label="Projets actifs" value={stats.active} />
          <Stat label="Tâches liées" value={stats.linked} />
          <Stat label="Terminées" value={stats.done} />
          <Stat label="Avancement" value={`${stats.global}%`} />
        </div>

        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 flex items-center gap-3">
            <Search size={18} className="text-white/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet..."
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/35"
            />
          </div>

          <p className="text-sm text-white/35">
            {filteredProjects.length} projet(s)
          </p>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          <section className="space-y-5">
            {filteredProjects.length === 0 ? (
              <div className="glass-card rounded-[28px] p-8 text-center text-white/40">
                Aucun projet trouvé.
              </div>
            ) : (
              filteredProjects.map((project) => {
                const list = projectTasks(project.id);
                const done = list.filter((t) => t.done).length;
                const remaining = list.length - done;
                const urgent = list.filter(
                  (t) => t.priority === "Urgent" && !t.done
                ).length;
                const pct = progress(project.id);
                const status = projectStatus(project, remaining);

                return (
                  <article
                    key={project.id}
                    className="glass-card rounded-[28px] p-6 flex items-center justify-between gap-8"
                  >
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div
                        className="h-16 w-16 rounded-3xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: project.color || "#64748b" }}
                      >
                        <FolderKanban size={28} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-semibold truncate">
                            {project.name}
                          </h2>
                          <span className={`text-sm ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className="text-white/40 mt-1 line-clamp-1">
                          {project.description || "Aucune description"}
                        </p>

                        <div className="mt-5">
                          <div className="flex justify-between text-xs text-white/40 mb-2">
                            <span>Progression</span>
                            <span>{pct}%</span>
                          </div>

                          <div className="h-2 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: project.color || "#64748b",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-[340px] shrink-0">
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <Mini label="Tâches" value={list.length} />
                        <Mini label="Faites" value={done} />
                        <Mini label="Urgentes" value={urgent} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-white/45">
                        <p>Début : {project.start_date || "-"}</p>
                        <p>Fin : {project.end_date || "-"}</p>
                      </div>

                      <div className="flex gap-2 mt-5">
                        <button className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90">
                          Ouvrir
                        </button>

                        <button
                          onClick={() => archiveProject(project.id)}
                          className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                        >
                          Archiver
                        </button>

                        <button
                          onClick={() => deleteProject(project.id)}
                          className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <aside className="glass-card rounded-[28px] p-5 h-fit">
            <h2 className="text-lg font-semibold">Activité projet</h2>
            <p className="text-xs text-white/40 mt-1 mb-5">
              Dernières tâches liées à tes projets.
            </p>

            <div className="space-y-3">
              {tasks
                .filter((t) => t.project_id)
                .slice(0, 8)
                .map((task) => {
                  const project = projects.find((p) => p.id === task.project_id);

                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-3"
                      style={{
                        boxShadow: `inset 4px 0 0 ${
                          project?.color || "#64748b"
                        }`,
                      }}
                    >
                      <p className="text-sm font-semibold truncate">
                        {task.name}
                      </p>
                      <p className="text-xs text-white/35 mt-1">
                        {project?.name || "Projet"} ·{" "}
                        {task.done ? "Terminée" : "À faire"}
                      </p>
                    </div>
                  );
                })}

              {tasks.filter((t) => t.project_id).length === 0 && (
                <p className="text-sm text-white/35">
                  Aucune activité de projet.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-2xl glass-card rounded-[28px] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Nouveau projet</h2>
                <p className="text-sm text-white/40">
                  Crée un projet avec dates, couleur et description.
                </p>
              </div>

              <button onClick={() => setModalOpen(false)}>
                <MoreVertical className="text-white/45" />
              </button>
            </div>

            <div className="grid gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du projet"
                className="field"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du projet..."
                className="field min-h-[100px]"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="field"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <p className="text-sm text-white/40 mb-3">Couleur</p>
                <div className="flex gap-3">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-9 w-9 rounded-full border-2 ${
                        color === c ? "border-white" : "border-white/10"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={addProject}
                className="mt-4 rounded-2xl bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 transition"
              >
                Créer le projet
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          padding: 12px 14px;
          font-size: 14px;
          color: white;
          outline: none;
        }
      `}</style>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="glass-card rounded-[24px] p-5">
      <p className="text-xs text-white/38">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold">{value}</h2>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}