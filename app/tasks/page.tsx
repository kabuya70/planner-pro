"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Search, CheckCircle2, Circle, Trash2, X, Pencil } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const months = [
  { value: "01", label: "Janvier" },
  { value: "02", label: "Février" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Août" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

export default function TasksPage() {
  const currentYear = new Date().getFullYear();

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const [projectFilter, setProjectFilter] = useState("Tous");
  const [priorityFilter, setPriorityFilter] = useState("Toutes");
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  const [statusFilter, setStatusFilter] = useState("Tous");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState(String(new Date().getDate()).padStart(2, "0"));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [category, setCategory] = useState("Études");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: projectsData } = await supabase.from("projects").select("*");

    setTasks(tasksData || []);
    setProjects(projectsData || []);
  }

  function resetForm() {
    setName("");
    setDescription("");
    setDay(String(new Date().getDate()).padStart(2, "0"));
    setMonth(String(new Date().getMonth() + 1).padStart(2, "0"));
    setStartTime("08:00");
    setEndTime("09:00");
    setProjectId("");
    setPriority("Normal");
    setCategory("Études");
    setEditingTask(null);
  }

  function getFinalDate() {
    return `${currentYear}-${month}-${day.padStart(2, "0")}`;
  }

  async function saveTask() {
    if (!name.trim()) return;

    const payload = {
      name,
      description,
      date: getFinalDate(),
      start_time: startTime,
      end_time: endTime,
      project_id: projectId || null,
      priority,
      category,
      done: false,
    };

    if (editingTask) {
      await supabase.from("tasks").update(payload).eq("id", editingTask.id);
    } else {
      await supabase.from("tasks").insert(payload);
    }

    resetForm();
    setModalOpen(false);
    loadData();
  }

  function openEdit(task: any) {
    setEditingTask(task);
    setName(task.name || "");
    setDescription(task.description || "");

    if (task.date) {
      const [, m, d] = task.date.split("-");
      setMonth(m);
      setDay(d);
    }

    setStartTime(task.start_time || "08:00");
    setEndTime(task.end_time || "09:00");
    setProjectId(task.project_id || "");
    setPriority(task.priority || "Normal");
    setCategory(task.category || "Études");
    setModalOpen(true);
  }

  async function toggleTask(task: any) {
    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    loadData();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    loadData();
  }

  function getProjectName(id: string) {
    return projects.find((p) => p.id === id)?.name || "Sans projet";
  }

  function formatDate(date: string) {
    if (!date) return "Sans date";
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
  }

  const categories = Array.from(
    new Set(tasks.map((t) => t.category || "Sans catégorie"))
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const title = task.name || "";
      const projectName = getProjectName(task.project_id);

      return (
        title.toLowerCase().includes(search.toLowerCase()) &&
        (projectFilter === "Tous" || projectName === projectFilter) &&
        (priorityFilter === "Toutes" || task.priority === priorityFilter) &&
        (categoryFilter === "Toutes" ||
          (task.category || "Sans catégorie") === categoryFilter) &&
        (statusFilter === "Tous" ||
          (statusFilter === "Terminées" && task.done) ||
          (statusFilter === "À faire" && !task.done))
      );
    });
  }, [tasks, projects, search, projectFilter, priorityFilter, categoryFilter, statusFilter]);

  return (
    <main className="min-h-screen bg-[#020617] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-400">Tâches</p>
            <h1 className="text-4xl font-black mt-1">Toutes les tâches</h1>
            <p className="text-slate-400 mt-2">
              Crée, modifie et organise tes tâches avec une vraie date.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Nouvelle tâche
          </button>
        </header>

        <div className="mb-5 grid grid-cols-4 gap-4">
          <Select value={projectFilter} setValue={setProjectFilter}>
            <option>Tous</option>
            {projects.map((project) => (
              <option key={project.id}>{project.name}</option>
            ))}
          </Select>

          <Select value={priorityFilter} setValue={setPriorityFilter}>
            <option>Toutes</option>
            <option>Urgent</option>
            <option>Important</option>
            <option>Normal</option>
            <option>Basse</option>
          </Select>

          <Select value={categoryFilter} setValue={setCategoryFilter}>
            <option>Toutes</option>
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </Select>

          <Select value={statusFilter} setValue={setStatusFilter}>
            <option>Tous</option>
            <option>À faire</option>
            <option>Terminées</option>
          </Select>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 flex items-center gap-3">
          <Search size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 overflow-hidden">
          <div className="grid grid-cols-[60px_1.5fr_1fr_1fr_1fr_1fr_110px] border-b border-white/10 px-5 py-4 text-sm font-bold text-slate-400">
            <p></p>
            <p>Titre</p>
            <p>Projet</p>
            <p>Échéance</p>
            <p>Priorité</p>
            <p>Statut</p>
            <p>Actions</p>
          </div>

          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-[60px_1.5fr_1fr_1fr_1fr_1fr_110px] items-center border-b border-white/5 px-5 py-4 hover:bg-slate-800/60 transition"
            >
              <button onClick={() => toggleTask(task)}>
                {task.done ? (
                  <CheckCircle2 className="text-green-400" size={22} />
                ) : (
                  <Circle className="text-slate-500" size={22} />
                )}
              </button>

              <div>
                <p className={`font-bold ${task.done ? "line-through text-slate-500" : ""}`}>
                  {task.name || "Sans titre"}
                </p>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>

              <p className="text-slate-400">{getProjectName(task.project_id)}</p>
              <p className="text-slate-400">{formatDate(task.date)}</p>
              <PriorityBadge priority={task.priority || "Normal"} />

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  task.done
                    ? "bg-green-500/10 text-green-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {task.done ? "Terminée" : "À faire"}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(task)}
                  className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="h-9 w-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
                </h2>
                <p className="text-sm text-slate-500">
                  L’année est automatiquement réglée sur {currentYear}.
                </p>
              </div>

              <button onClick={() => setModalOpen(false)}>
                <X />
              </button>
            </div>

            <div className="grid gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Titre de la tâche"
                className="field"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la tâche..."
                className="field min-h-[100px]"
              />

              <div className="grid grid-cols-2 gap-4">
                <select value={day} onChange={(e) => setDay(e.target.value)} className="field">
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <select value={month} onChange={(e) => setMonth(e.target.value)} className="field">
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="field" />
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="field" />
              </div>

              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field">
                <option value="">Sans projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="field">
                <option>Urgent</option>
                <option>Important</option>
                <option>Normal</option>
                <option>Basse</option>
              </select>

              <select value={category} onChange={(e) => setCategory(e.target.value)} className="field">
                <option>Études</option>
                <option>Travail</option>
                <option>Sport</option>
                <option>Personnel</option>
                <option>Administratif</option>
              </select>

              <button
                onClick={saveTask}
                className="mt-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold hover:bg-blue-500"
              >
                {editingTask ? "Enregistrer les modifications" : "Créer la tâche"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.1);
          background: #020617;
          padding: 12px 14px;
          font-size: 14px;
          color: white;
          outline: none;
        }
      `}</style>
    </main>
  );
}

function Select({ value, setValue, children }: any) {
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none"
    >
      {children}
    </select>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const style =
    priority === "Urgent"
      ? "bg-red-500/10 text-red-400"
      : priority === "Important"
      ? "bg-yellow-500/10 text-yellow-400"
      : priority === "Basse"
      ? "bg-slate-500/10 text-slate-400"
      : "bg-blue-500/10 text-blue-400";

  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {priority}
    </span>
  );
}