"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Screen = "login" | "register" | "profile" | "dashboard";

type Task = {
  id: string;
  name: string;
  description?: string;
  done: boolean;
  hour: string;
  start_time?: string;
  end_time?: string;
  day: string;
  priority: string;
  category: string;
};

type Profile = {
  id?: string;
  email: string;
  nom?: string;
  prenom?: string;
  age?: number;
  date_naissance?: string;
  profession?: string;
  user_id?: string;
  password_set?: boolean;
};

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const hours = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [now, setNow] = useState(new Date());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [age, setAge] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [profession, setProfession] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDay, setTaskDay] = useState("Lundi");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [taskPriority, setTaskPriority] = useState("Normal");
  const [taskCategory, setTaskCategory] = useState("Études");

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDay, setEditDay] = useState("Lundi");
  const [editStartTime, setEditStartTime] = useState("08:00");
  const [editEndTime, setEditEndTime] = useState("09:00");
  const [editPriority, setEditPriority] = useState("Normal");
  const [editCategory, setEditCategory] = useState("Études");

  useEffect(() => {
    checkUser();

    const timer = setInterval(() => setNow(new Date()), 30000);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        afterLogin(currentUser);
      } else {
        setScreen("login");
        setTasks([]);
        setProfile(null);
      }
    });

    return () => {
      clearInterval(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      setUser(data.user);
      afterLogin(data.user);
    }
  }

  async function afterLogin(currentUser: any) {
    const userProfile = await loadProfile(currentUser);

    if (!userProfile || !profileIsComplete(userProfile)) {
      const pending = localStorage.getItem("pending_profile");

      if (pending) {
        const saved = JSON.parse(pending);
        setNom(saved.nom || "");
        setPrenom(saved.prenom || "");
        setAge(saved.age || "");
        setDateNaissance(saved.dateNaissance || "");
        setProfession(saved.profession || "");
      }

      setScreen("profile");
      setEmail(currentUser.email || "");
      return;
    }

    setScreen("dashboard");
    loadProjects(currentUser.id);
    loadTasks(currentUser.id);
  }

  function profileIsComplete(p: Profile) {
    return Boolean(
      p.nom &&
      p.prenom &&
      p.age &&
      p.date_naissance &&
      p.profession
    );
  }

  async function loadProfile(currentUser: any) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setProfile(null);
      return null;
    }

    if (data) {
      setProfile(data as Profile);
      setNom(data.nom || "");
      setPrenom(data.prenom || "");
      setAge(data.age ? String(data.age) : "");
      setDateNaissance(data.date_naissance || "");
      setProfession(data.profession || "");
      return data as Profile;
    }

    setProfile(null);
    setNom("");
    setPrenom("");
    setAge("");
    setDateNaissance("");
    setProfession("");
    return null;
  }

  async function saveProfile() {
    setMessage("");

    if (!user) {
      setMessage("Utilisateur introuvable.");
      return;
    }

    if (!nom || !prenom || !age || !dateNaissance || !profession) {
      setMessage("Remplis tous les champs du profil.");
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      nom,
      prenom,
      age: Number(age),
      date_naissance: dateNaissance,
      profession,
      user_id: user.id,
      password_set: false,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload);

    if (error) {
      setMessage(error.message);
      return;
    }

    localStorage.removeItem("pending_profile");

    setMessage("");
    await loadProfile(user);
    setScreen("dashboard");
    loadProjects(user.id);
    loadTasks(user.id);
  }

  async function registerUser() {
    setMessage("");

    if (!nom || !prenom || !age || !dateNaissance || !email || !profession) {
      setMessage("Remplis tous les champs.");
      return;
    }

    localStorage.setItem(
      "pending_profile",
      JSON.stringify({
        nom,
        prenom,
        age,
        dateNaissance,
        profession,
      })
    );

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });

    setMessage(error ? error.message : "Lien envoyé. Vérifie ta boîte mail.");
    if (!error) setScreen("login");
  }

  async function loginEmail() {
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(error.message);
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Entre ton email.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    setMessage(error ? error.message : "Lien envoyé. Vérifie ta boîte mail.");
  }

  async function loginGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) setMessage(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setTasks([]);
    setProfile(null);
    setScreen("login");
    setMessage("");
  }

  async function loadTasks(userId: string) {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: true });

    setTasks((data || []) as Task[]);
  }

  async function addTask() {
    if (!taskName.trim() || !user) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        name: taskName,
        description: taskDescription,
        done: false,
        hour: startTime,
        start_time: startTime,
        end_time: endTime,
        day: taskDay,
        priority: taskPriority,
        category: taskCategory,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) setTasks([data as Task, ...tasks]);

    setTaskName("");
    setTaskDescription("");
  }
    async function toggleTask(task: Task) {
    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    if (user) loadTasks(user.id);
    setSelectedTask(null);
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    if (user) loadTasks(user.id);
    setSelectedTask(null);
    setEditingTask(null);
  }

  async function moveTaskTo(day: string, newStartTime: string) {
    if (!draggedTask || !user) return;

    const start = toMinutes(draggedTask.start_time || draggedTask.hour);
    const end = toMinutes(draggedTask.end_time || draggedTask.start_time || draggedTask.hour);
    const duration = Math.max(30, end - start);

    const newEndMinutes = toMinutes(newStartTime) + duration;
    const newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, "0")}:${String(newEndMinutes % 60).padStart(2, "0")}`;

    await supabase
      .from("tasks")
      .update({
        day,
        hour: newStartTime,
        start_time: newStartTime,
        end_time: newEndTime,
      })
      .eq("id", draggedTask.id);

    setDraggedTask(null);
    loadTasks(user.id);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditName(task.name || "");
    setEditDescription(task.description || "");
    setEditDay(task.day || "Lundi");
    setEditStartTime(task.start_time || task.hour || "08:00");
    setEditEndTime(task.end_time || "09:00");
    setEditPriority(task.priority || "Normal");
    setEditCategory(task.category || "Études");
  }

  async function saveEdit() {
    if (!editingTask || !user || !editName.trim()) return;

    await supabase
      .from("tasks")
      .update({
        name: editName,
        description: editDescription,
        day: editDay,
        hour: editStartTime,
        start_time: editStartTime,
        end_time: editEndTime,
        priority: editPriority,
        category: editCategory,
      })
      .eq("id", editingTask.id);

    setEditingTask(null);
    loadTasks(user.id);
  }

  function todayName() {
    return ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][now.getDay()];
  }

  function currentTime() {
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function toMinutes(time?: string) {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function taskTop(task: Task) {
    const start = toMinutes(task.start_time || task.hour);
    const dayStart = 6 * 60;
    return Math.max(0, ((start - dayStart) / 60) * 72);
  }

  function taskHeight(task: Task) {
    const start = toMinutes(task.start_time || task.hour);
    const end = toMinutes(task.end_time || task.start_time || task.hour);
    return Math.max(42, ((end - start) / 60) * 72);
  }

  function taskStatus(task: Task) {
    if (task.done) return { label: "Terminé", color: "bg-green-500/25 text-green-200" };
    if (task.day !== todayName()) return { label: "À venir", color: "bg-white/10 text-white/70" };

    const current = currentTime();
    const start = task.start_time || task.hour;
    const end = task.end_time || task.hour;

    if (current < start) return { label: "À venir", color: "bg-blue-500/25 text-blue-200" };
    if (current >= start && current <= end) return { label: "En cours", color: "bg-yellow-500/30 text-yellow-100" };
    return { label: "En retard", color: "bg-red-500/30 text-red-100" };
  }

  function priorityColor(task: Task) {
    if (task.done) return "bg-green-500/25 border-green-300/20";
    if (task.priority === "Urgent") return "bg-red-500/35 border-red-300/20";
    if (task.priority === "Important") return "bg-yellow-500/30 border-yellow-300/20";
    return "bg-blue-500/30 border-blue-300/20";
  }

  const completed = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const urgent = tasks.filter((t) => t.priority === "Urgent" && !t.done).length;
  const late = tasks.filter((t) => taskStatus(t).label === "En retard").length;
  const nextTask = tasks.find((t) => !t.done);

  if (!user && screen === "register") {
    return (
      <AuthBackground>
        <AuthCard>
          <h1 className="text-center text-2xl font-bold">Créer un compte</h1>
          <p className="mb-5 mt-1 text-center text-sm text-white/45">Informations personnelles</p>

          <div className="grid gap-3">
            <Input placeholder="Nom" value={nom} setValue={setNom} />
            <Input placeholder="Prénom" value={prenom} setValue={setPrenom} />
            <Input placeholder="Âge" value={age} setValue={setAge} type="number" />
            <Input placeholder="Date de naissance" value={dateNaissance} setValue={setDateNaissance} type="date" />
            <Input placeholder="Email" value={email} setValue={setEmail} />
            <Input placeholder="Profession" value={profession} setValue={setProfession} />

            <button onClick={registerUser} className="btn-white">Envoyer le lien</button>
            <button onClick={() => setScreen("login")} className="btn-dark">Retour</button>
            {message && <p className="msg">{message}</p>}
          </div>
        </AuthCard>
      </AuthBackground>
    );
  }

  if (user && screen === "profile") {
    return (
      <AuthBackground>
        <AuthCard>
          <h1 className="text-center text-2xl font-bold">Compléter mon profil</h1>
          <p className="mb-5 mt-1 text-center text-sm text-white/45">
            Avant d’accéder au planning
          </p>

          <div className="grid gap-3">
            <Input placeholder="Nom" value={nom} setValue={setNom} />
            <Input placeholder="Prénom" value={prenom} setValue={setPrenom} />
            <Input placeholder="Âge" value={age} setValue={setAge} type="number" />
            <Input placeholder="Date de naissance" value={dateNaissance} setValue={setDateNaissance} type="date" />
            <Input placeholder="Profession" value={profession} setValue={setProfession} />

            <button onClick={saveProfile} className="btn-white">
              Enregistrer mon profil
            </button>

            <button onClick={logout} className="btn-dark">
              Déconnexion
            </button>

            {message && <p className="msg">{message}</p>}
          </div>
        </AuthCard>
      </AuthBackground>
    );
  }

  if (!user) {
    return (
      <AuthBackground>
        <AuthCard>
          <div className="mb-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">📋</div>
            <h1 className="mt-4 text-3xl font-black tracking-[0.18em]">PLANNER</h1>
            <p className="mt-1 text-[10px] tracking-[0.25em] text-white/40">CLOUD · SUPABASE</p>
          </div>

          <div className="grid gap-3">
            <Input placeholder="Email" value={email} setValue={setEmail} />
            <Input placeholder="Mot de passe" value={password} setValue={setPassword} type="password" />

            <button onClick={loginEmail} className="btn-white">Se connecter</button>
            <button onClick={resetPassword} className="text-sm font-bold text-blue-400 hover:text-blue-300">Mot de passe oublié ?</button>
            <button onClick={() => setScreen("register")} className="btn-dark">Créer un compte</button>
            <button onClick={loginGoogle} className="btn-dark">Continuer avec Google</button>

            {message && <p className="msg">{message}</p>}
          </div>
        </AuthCard>
      </AuthBackground>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] p-5 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Planner App</h1>
            <p className="mt-1 text-sm text-white/45">
              {todayName()} · {currentTime()} · {profile?.prenom || user.email}
            </p>
          </div>

          <button
            onClick={logout}
            title="Déconnexion"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xl transition-all duration-300 hover:scale-110 hover:bg-red-500/80"
          >
            ⏻
          </button>
        </header>

        <section className="mb-5 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="card-hover rounded-[1.7rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl">
            <p className="text-sm text-white/45">Accueil</p>
            <h2 className="mt-1 text-2xl font-black">
              Bonjour {profile?.prenom || ""} 👋
            </h2>
            <p className="mt-1 text-sm text-white/50">Organise ta semaine avec un vrai calendrier horaire.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Mini label="Prochaine tâche" value={nextTask?.name || "Aucune"} />
              <Mini label="Urgentes" value={urgent} />
              <Mini label="En retard" value={late} />
            </div>
          </div>

          <div className="card-hover rounded-[1.7rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl">
            <p className="text-sm text-white/45">Progression</p>
            <div className="mt-3 flex items-center gap-5">
              <div
                className="grid h-28 w-28 place-items-center rounded-full transition hover:scale-105"
                style={{
                  background: `conic-gradient(#22c55e ${progress * 3.6}deg, rgba(255,255,255,.10) 0deg)`,
                }}
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-[#050816]">
                  <span className="text-xl font-black">{progress}%</span>
                </div>
              </div>

              <div className="text-sm text-white/60">
                <p>{completed} terminées</p>
                <p>{tasks.length - completed} restantes</p>
                <p>{tasks.length} tâches au total</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-2xl">
          <h2 className="mb-4 text-lg font-bold">Ajouter une tâche</h2>

          <div className="grid gap-3 md:grid-cols-6">
            <Input placeholder="Titre" value={taskName} setValue={setTaskName} />
            <select value={taskDay} onChange={(e) => setTaskDay(e.target.value)} className="field">{days.map((d) => <option key={d}>{d}</option>)}</select>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="field" />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="field" />
            <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="field"><option>Urgent</option><option>Important</option><option>Normal</option></select>
            <select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} className="field"><option>Études</option><option>Travail</option><option>Sport</option><option>Perso</option><option>Loisirs</option></select>
          </div>

          <textarea
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Description..."
            className="mt-3 min-h-[70px] w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
          />

          <button onClick={addTask} className="mt-3 rounded-2xl bg-green-500 px-6 py-3 text-sm font-black text-black transition hover:scale-[1.03] hover:bg-green-300">
            Ajouter
          </button>
        </section>
                <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h2 className="text-xl font-black">Semaine</h2>
            <p className="text-sm text-white/45">
              {draggedTask ? "Dépose la tâche sur une case horaire" : currentTime()}
            </p>
          </div>

          <div className="grid grid-cols-[64px_repeat(7,1fr)]">
            <div className="border-b border-r border-white/10 p-3 text-xs text-white/35">Heure</div>

            {days.map((day) => (
              <div
                key={day}
                className={`border-b border-r border-white/10 p-3 text-center text-sm font-bold ${
                  day === todayName() ? "text-green-400" : "text-white/80"
                }`}
              >
                {day}
              </div>
            ))}

            <div className="relative border-r border-white/10">
              {hours.map((hour) => (
                <div key={hour} className="h-[72px] border-b border-white/10 pr-2 text-right text-xs text-white/35">
                  {hour}
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div key={day} className="relative border-r border-white/10" style={{ height: hours.length * 72 }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => moveTaskTo(day, hour)}
                    className={`h-[72px] border-b border-white/10 transition ${
                      draggedTask ? "bg-white/[0.03] hover:bg-green-500/20" : "hover:bg-white/[0.04]"
                    }`}
                  />
                ))}

                {tasks.filter((t) => t.day === day).map((task) => {
                  const st = taskStatus(task);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTask(task)}
                      onDragEnd={() => setDraggedTask(null)}
                      className={`absolute left-1 right-1 z-10 cursor-grab rounded-xl border p-2 text-xs shadow-lg transition-all duration-300 hover:z-20 hover:scale-[1.03] active:cursor-grabbing ${priorityColor(task)}`}
                      style={{
                        top: taskTop(task),
                        height: taskHeight(task),
                      }}
                      onClick={() => toggleTask(task)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className={`font-bold leading-tight ${task.done ? "line-through opacity-50" : ""}`}>
                          {task.name}
                        </p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="rounded bg-black/20 px-1.5 hover:bg-black/40"
                        >
                          ⋯
                        </button>
                      </div>

                      <p className="mt-1 text-[10px] opacity-75">
                        {task.start_time || task.hour} - {task.end_time || "?"}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">{task.priority}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {selectedTask && (
          <Modal onClose={() => setSelectedTask(null)}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-white/40">Détail de la tâche</p>
                <h2 className="mt-1 text-2xl font-black">{selectedTask.name}</h2>
              </div>

              <button onClick={() => setSelectedTask(null)} className="rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p><span className="text-white/40">Jour :</span> {selectedTask.day}</p>
              <p><span className="text-white/40">Horaire :</span> {selectedTask.start_time || selectedTask.hour} - {selectedTask.end_time || "Non défini"}</p>
              <p><span className="text-white/40">Priorité :</span> {selectedTask.priority}</p>
              <p><span className="text-white/40">Statut :</span> {taskStatus(selectedTask).label}</p>
              <p><span className="text-white/40">Catégorie :</span> {selectedTask.category}</p>
              <p className="rounded-2xl bg-white/[0.05] p-4 text-white/80">{selectedTask.description || "Aucune description."}</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => openEdit(selectedTask)} className="rounded-2xl bg-white/10 px-4 py-3 font-bold hover:bg-white/20">
                Modifier
              </button>
              <button onClick={() => deleteTask(selectedTask.id)} className="rounded-2xl bg-red-500 px-4 py-3 font-bold hover:bg-red-400">
                Supprimer
              </button>
            </div>
          </Modal>
        )}

        {editingTask && (
          <Modal onClose={() => setEditingTask(null)}>
            <h2 className="mb-5 text-2xl font-black">Modifier la tâche</h2>

            <div className="grid gap-3">
              <Input placeholder="Titre" value={editName} setValue={setEditName} />

              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description..."
                className="min-h-[90px] w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />

              <select value={editDay} onChange={(e) => setEditDay(e.target.value)} className="field">
                {days.map((d) => <option key={d}>{d}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="field" />
                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="field" />
              </div>

              <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="field">
                <option>Urgent</option>
                <option>Important</option>
                <option>Normal</option>
              </select>

              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="field">
                <option>Études</option>
                <option>Travail</option>
                <option>Sport</option>
                <option>Perso</option>
                <option>Loisirs</option>
              </select>

              <button onClick={saveEdit} className="rounded-2xl bg-green-500 px-4 py-3 font-black text-black hover:bg-green-300">
                Enregistrer
              </button>
            </div>
          </Modal>
        )}
      </div>

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(0,0,0,.45);
          padding: 12px 14px;
          font-size: 14px;
          color: white;
          outline: none;
        }
        .btn-white {
          border-radius: 16px;
          background: white;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          color: black;
        }
        .btn-dark {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
        }
        .msg {
          border-radius: 16px;
          background: rgba(255,255,255,.06);
          padding: 12px;
          font-size: 14px;
          color: rgba(255,255,255,.75);
        }
        .card-hover {
          transition: .25s;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,.2);
          background: rgba(255,255,255,.075);
        }
      `}</style>
    </main>
  );
}

function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.28),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,.18),transparent_28%),radial-gradient(circle_at_50%_0%,rgba(139,92,246,.18),transparent_30%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:70px_70px]" />

      <div className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="relative z-10 flex w-full justify-center">
        {children}
      </div>
    </main>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[410px] rounded-[32px] border border-white/15 bg-black/55 p-7 shadow-[0_30px_120px_rgba(0,0,0,.75)] backdrop-blur-3xl transition-all duration-300 hover:border-white/25 hover:bg-black/65 hover:shadow-[0_0_80px_rgba(59,130,246,.18)]">
      {children}
    </div>
  );
}

function Input({
  placeholder,
  value,
  setValue,
  type = "text",
}: {
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
    />
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-black/30 p-3 transition hover:scale-[1.03] hover:bg-black/45">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#09090b] p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}