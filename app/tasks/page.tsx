"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  Pencil,
} from "lucide-react";

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

const categories = [
  "Routine",
  "Études",
  "Travail",
  "Personnel",
  "Administratif",
  "Sport",
];

const routineDays = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

const colors = [
  { value: "#22c55e", label: "Vert" },
  { value: "#3b82f6", label: "Bleu" },
  { value: "#a855f7", label: "Violet" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#64748b", label: "Gris" },
];

export default function TasksPage() {
  const currentYear = new Date().getFullYear();

  const [user, setUser] = useState<any>(null);
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
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [category, setCategory] = useState("Études");
  const [color, setColor] = useState("#64748b");
  const [repeatRule, setRepeatRule] = useState("none");
  const [repeatDays, setRepeatDays] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
      return null;
    }

    return data.user;
  }

  function toggleRepeatDay(day: string) {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function selectAllRepeatDays() {
    setRepeatDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  }

  function clearRepeatDays() {
    setRepeatDays([]);
  }

  function getRepeatDaysLabel(days: string[] | null | undefined) {
    if (!Array.isArray(days) || days.length === 0) return "Tous les jours";

    if (days.length === 7) return "Toute la semaine";

    return routineDays
      .filter((day) => days.includes(day.key))
      .map((day) => day.label)
      .join(", ");
  }

  async function loadData() {
    const currentUser = await getCurrentUser();

    if (!currentUser) return;

    setUser(currentUser);

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
      return;
    }

    if (projectsError) {
      console.error(projectsError.message);
    }

    setTasks(tasksData || []);
    setProjects((projectsData || []).filter((project) => !project.archived));
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
    setColor("#64748b");
    setRepeatRule("none");
    setRepeatDays([]);
    setEditingTask(null);
  }

  function getFinalDate() {
    return `${currentYear}-${month}-${day.padStart(2, "0")}`;
  }

  async function saveTask() {
    if (!name.trim()) return;

    if (category === "Routine" && repeatDays.length === 0) {
      alert("Choisis au moins un jour pour cette routine.");
      return;
    }

    const currentUser = user || (await getCurrentUser());

    if (!currentUser) return;

    const finalDate = getFinalDate();

    const basePayload = {
      name: name.trim(),
      description: description.trim() || null,
      date: finalDate,
      start_time: startTime,
      end_time: endTime,
      project_id: projectId || null,
      priority,
      category,
      color,
      repeat_rule: category === "Routine" ? "custom_days" : repeatRule,
      repeat_days: category === "Routine" ? repeatDays : [],
      type: category === "Routine" ? "routine" : "task",
    };

    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update(basePayload)
        .eq("id", editingTask.id)
        .eq("user_id", currentUser.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("tasks").insert({
        ...basePayload,
        done: false,
        status: "todo",
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
    setColor(task.color || "#64748b");
    setRepeatRule(task.repeat_rule || "none");
    setRepeatDays(Array.isArray(task.repeat_days) ? task.repeat_days : []);
    setModalOpen(true);
  }

  async function toggleTask(task: any) {
    const currentUser = user || (await getCurrentUser());

    if (!currentUser) return;

    const nextDone = !task.done;

    const { error } = await supabase
      .from("tasks")
      .update({
        done: nextDone,
        status: nextDone ? "done" : "todo",
      })
      .eq("id", task.id)
      .eq("user_id", currentUser.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function deleteTask(id: string) {
    const currentUser = user || (await getCurrentUser());

    if (!currentUser) return;

    const confirmDelete = confirm("Tu veux vraiment supprimer cette tâche ?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function getProjectName(projectId: string | null) {
    if (!projectId) return "Sans projet";

    const project = projects.find((project) => project.id === projectId);

    return project?.name || "Sans projet";
  }

  function formatDate(date: string) {
    if (!date) return "Sans date";

    const [y, m, d] = date.split("-");

    return `${d}/${m}/${y}`;
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const title = task.name || "";
      const currentProjectName = getProjectName(task.project_id);

      return (
        title.toLowerCase().includes(search.toLowerCase()) &&
        (projectFilter === "Tous" || currentProjectName === projectFilter) &&
        (priorityFilter === "Toutes" || task.priority === priorityFilter) &&
        (categoryFilter === "Toutes" ||
          (task.category || "Sans catégorie") === categoryFilter) &&
        (statusFilter === "Tous" ||
          (statusFilter === "Terminées" && task.done) ||
          (statusFilter === "À faire" && !task.done))
      );
    });
  }, [
    tasks,
    projects,
    search,
    projectFilter,
    priorityFilter,
    categoryFilter,
    statusFilter,
  ]);

  return (
    <main className="min-h-scréen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
              Tâches
            </p>

            <h1 className="text-3xl font-semibold mt-2">Toutes les tâches</h1>

            <p className="text-white/45 mt-2">
              Crée, modifie et organise tes tâches, routines et projets.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold hover:bg-white/[0.1] transition flex items-center gap-2"
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

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 flex items-center gap-3">
          <Search size={18} className="text-white/35" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/35"
          />
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
          <div className="grid grid-cols-[60px_1.5fr_1fr_1fr_1fr_1fr_110px] border-b border-white/10 px-5 py-4 text-sm font-bold text-white/45">
            <p></p>
            <p>Titre</p>
            <p>Projet</p>
            <p>Échéance</p>
            <p>Priorité</p>
            <p>Statut</p>
            <p>Actions</p>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-white/35">
              Aucune tâche trouvée.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[60px_1.5fr_1fr_1fr_1fr_1fr_110px] items-center border-b border-white/[0.05] px-5 py-4 hover:bg-white/[0.05] transition"
              >
                <button onClick={() => toggleTask(task)}>
                  {task.done ? (
                    <CheckCircle2 className="text-green-400" size={22} />
                  ) : (
                    <Circle className="text-white/35" size={22} />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: task.color || "#64748b" }}
                    />

                    <p
                      className={`font-semibold ${
                        task.done ? "line-through text-white/35" : ""
                      }`}
                    >
                      {task.name || "Sans titre"}
                    </p>
                  </div>

                  {task.description && (
                    <p className="text-xs text-white/35 mt-1 line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  {task.category === "Routine" && (
                    <p className="text-[11px] text-green-400 mt-1">
                      Routine · {getRepeatDaysLabel(task.repeat_days)}
                    </p>
                  )}
                </div>

                <p className="text-white/45">{getProjectName(task.project_id)}</p>

                <p className="text-white/45">{formatDate(task.date)}</p>

                <PriorityBadge priority={task.priority || "Normal"} />

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    task.done
                      ? "bg-green-500/10 text-green-400"
                      : "bg-white/10 text-white/55"
                  }`}
                >
                  {task.done ? "Terminée" : "À faire"}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(task)}
                    className="h-9 w-9 rounded-xl bg-white/10 text-white/55 flex items-center justify-center hover:bg-white/20 transition"
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
            ))
          )}
        </section>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#030712] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
                </h2>

                <p className="text-sm text-white/40">
                  Tâche simple, routine ou tâche liée Ã  un projet.
                </p>
              </div>

              <button onClick={() => setModalOpen(false)}>
                <X className="text-white/45 hover:text-white" />
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
                placeholder="Description..."
                className="field min-h-[90px]"
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="field"
                >
                  <option value="">Sans projet</option>

                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);

                    if (e.target.value === "Routine") {
                      setRepeatRule("custom_days");
                      setRepeatDays((prev) =>
                        prev.length > 0
                          ? prev
                          : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
                      );
                    } else {
                      setRepeatRule("none");
                      setRepeatDays([]);
                    }
                  }}
                  className="field"
                >
                  {categories.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="field"
                >
                  <option>Urgent</option>
                  <option>Important</option>
                  <option>Normal</option>
                  <option>Basse</option>
                </select>

                <select
                  value={repeatRule}
                  onChange={(e) => setRepeatRule(e.target.value)}
                  className="field"
                  disabled={category === "Routine"}
                >
                  {category === "Routine" && (
                    <option value="custom_days">Jours choisis</option>
                  )}
                  <option value="none">Aucune répétition</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>

                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="field"
                >
                  {colors.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {category === "Routine" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Jours de répétition
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        Choisis uniquement les jours où cette routine doit
                        apparaître.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllRepeatDays}
                        className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.1]"
                      >
                        Toute la semaine
                      </button>

                      <button
                        type="button"
                        onClick={clearRepeatDays}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45 hover:bg-white/[0.08]"
                      >
                        Effacer
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {routineDays.map((routineDay) => {
                      const selected = repeatDays.includes(routineDay.key);

                      return (
                        <button
                          key={routineDay.key}
                          type="button"
                          onClick={() => toggleRepeatDay(routineDay.key)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            selected
                              ? "bg-white text-black"
                              : "bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white"
                          }`}
                        >
                          {routineDay.label}
                        </button>
                      );
                    })}
                  </div>

                  {repeatDays.length === 0 && (
                    <p className="mt-3 text-xs text-red-300/80">
                      Choisis au moins un jour.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="field"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="field"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="field"
                />

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="field"
                />
              </div>

              <button
                onClick={saveTask}
                className="mt-2 rounded-2xl border border-white/10 bg-white/[0.08] py-3 text-sm font-semibold hover:bg-white/[0.14] transition"
              >
                {editingTask
                  ? "Enregistrer les modifications"
                  : "Créer la tâche"}
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

        .field option {
          background: #030712;
          color: white;
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
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none"
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
      ? "bg-white/10 text-white/40"
      : "bg-white/10 text-white/60";

  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {priority}
    </span>
  );
}

