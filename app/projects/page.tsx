"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FolderKanban, Plus, Trash2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const colors = ["#2563eb", "#16a34a", "#9333ea", "#f97316", "#dc2626"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*");

    setProjects(projectData || []);
    setTasks(taskData || []);
  }

  async function addProject() {
    if (!name.trim()) return;

    await supabase.from("projects").insert({
      name,
      color,
    });

    setName("");
    setColor(colors[0]);
    loadData();
  }

  async function deleteProject(id: string) {
    await supabase.from("projects").delete().eq("id", id);
    loadData();
  }

  function projectTasks(projectId: string) {
    return tasks.filter((t) => t.project_id === projectId);
  }

  function projectProgress(projectId: string) {
    const list = projectTasks(projectId);
    if (list.length === 0) return 0;

    const done = list.filter((t) => t.done).length;
    return Math.round((done / list.length) * 100);
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <header className="mb-8">
          <p className="text-sm font-semibold text-blue-400">Projets</p>
          <h1 className="text-4xl font-black mt-1">Gestion des projets</h1>
          <p className="text-slate-400 mt-2">
            Organise tes tâches par projet : études, personnel, stage, administratif.
          </p>
        </header>

        <section className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-black mb-5">Créer un projet</h2>

          <div className="grid grid-cols-[1fr_220px_160px] gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du projet..."
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
            />

            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
            >
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={addProject}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500 transition flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Ajouter
            </button>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-3 rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-500">
              Aucun projet pour le moment.
            </div>
          ) : (
            projects.map((project) => {
              const count = projectTasks(project.id).length;
              const progress = projectProgress(project.id);

              return (
                <div
                  key={project.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 hover:-translate-y-1 transition"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: project.color || "#2563eb" }}
                    >
                      <FolderKanban size={22} />
                    </div>

                    <button
                      onClick={() => deleteProject(project.id)}
                      className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h2 className="text-xl font-black">{project.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {count} tâche{count > 1 ? "s" : ""}
                  </p>

                  <div className="mt-6">
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Progression</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: project.color || "#2563eb",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}