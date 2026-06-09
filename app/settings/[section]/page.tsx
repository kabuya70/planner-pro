"use client";

import Sidebar from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Palette,
  Bell,
  CircleHelp,
  Shield,
  LogOut,
  Mail,
  CalendarDays,
  Briefcase,
  Save,
  Check,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const sections: any = {
  profil: {
    title: "Profil",
    subtitle: "Informations du compte connecté.",
    icon: User,
  },
  apparence: {
    title: "Apparence",
    subtitle: "Personnalise l’affichage de ton planner.",
    icon: Palette,
  },
  notifications: {
    title: "Notifications",
    subtitle: "Gère tes rappels et alertes.",
    icon: Bell,
  },
  faq: {
    title: "FAQ",
    subtitle: "Questions fréquentes sur l’application.",
    icon: CircleHelp,
  },
  securite: {
    title: "Sécurité",
    subtitle: "Compte, session et déconnexion.",
    icon: Shield,
  },
};

const faqItems = [
  {
    question: "À quoi sert Planner Pro ?",
    answer:
      "Planner Pro sert à organiser tes tâches, projets, habitudes, calendrier et suivi personnel dans une seule interface.",
  },
  {
    question: "Quelle est la différence entre une tâche et un projet ?",
    answer:
      "Une tâche est une action simple. Un projet regroupe plusieurs tâches liées à un objectif plus grand.",
  },
  {
    question: "Pourquoi une tâche n’apparaît pas dans mon projet ?",
    answer:
      "Une tâche doit avoir le bon project_id pour être affichée dans un projet précis.",
  },
  {
    question: "Mes données sont-elles séparées par compte ?",
    answer:
      "Oui. Les tâches et projets doivent être liés au user_id du compte connecté.",
  },
  {
    question: "Que signifie À faire dans le Kanban ?",
    answer:
      "À faire affiche toutes les tâches non terminées du projet, toutes dates confondues.",
  },
  {
    question: "Que signifie En cours ?",
    answer:
      "En cours affiche les tâches prévues aujourd’hui.",
  },
  {
    question: "Que signifie À venir ?",
    answer:
      "À venir affiche les tâches prévues demain ou plus tard.",
  },
  {
    question: "Que signifie Terminé ?",
    answer:
      "Terminé affiche les tâches finalisées.",
  },
  {
    question: "Pourquoi certains anciens projets ne s’ouvrent pas ?",
    answer:
      "Ils peuvent avoir été créés avant la séparation par compte. Il faut parfois corriger leur user_id dans Supabase.",
  },
  {
    question: "Le thème est-il sauvegardé ?",
    answer:
      "Oui. Le thème est sauvegardé dans ton navigateur avec localStorage.",
  },
  {
    question: "Les notifications fonctionnent-elles déjà ?",
    answer:
      "Pour l’instant, les préférences sont sauvegardées localement. Les vraies notifications seront branchées ensuite.",
  },
  {
    question: "Est-ce que l’application est commercialisable ?",
    answer:
      "Elle peut le devenir, mais il faut encore stabiliser la sécurité, les paiements, les limites d’usage et le stockage des données.",
  },
];

export default function SettingsSectionPage() {
  const params = useParams();
  const router = useRouter();

  const section =
    typeof params.section === "string"
      ? params.section
      : Array.isArray(params.section)
      ? params.section[0]
      : "profil";

  const current = sections[section] || sections.profil;
  const Icon = current.icon;

  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState("black");

  const [displayName, setDisplayName] = useState("");
  const [profession, setProfession] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [tasksReminder, setTasksReminder] = useState(true);
  const [routineReminder, setRoutineReminder] = useState(false);
  const [dailySummary, setDailySummary] = useState(true);

  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    loadUser();
    loadSettings();
  }, []);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user || null;

    setUser(currentUser);

    if (currentUser) {
      setDisplayName(currentUser.user_metadata?.display_name || "");
      setProfession(currentUser.user_metadata?.profession || "");
    }
  }

  function loadSettings() {
    const savedTheme = localStorage.getItem("planner-theme") || "black";

    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    setTasksReminder(localStorage.getItem("planner-notif-tasks") !== "false");
    setRoutineReminder(localStorage.getItem("planner-notif-routines") === "true");
    setDailySummary(localStorage.getItem("planner-notif-daily") !== "false");
  }

  function showSaved(text: string) {
    setSavedMessage(text);

    setTimeout(() => {
      setSavedMessage("");
    }, 2200);
  }

  function changeTheme(value: string) {
    setTheme(value);
    localStorage.setItem("planner-theme", value);
    document.documentElement.setAttribute("data-theme", value);
    showSaved("Thème appliqué.");
  }

  async function saveProfile() {
    setSavingProfile(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
        profession: profession.trim(),
      },
    });

    setSavingProfile(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadUser();
    showSaved("Profil enregistré.");
  }

  function toggleNotification(key: string, value: boolean) {
    if (key === "tasks") {
      setTasksReminder(value);
      localStorage.setItem("planner-notif-tasks", String(value));
    }

    if (key === "routines") {
      setRoutineReminder(value);
      localStorage.setItem("planner-notif-routines", String(value));
    }

    if (key === "daily") {
      setDailySummary(value);
      localStorage.setItem("planner-notif-daily", String(value));
    }

    showSaved("Préférence sauvegardée.");
  }

  async function logout() {
    await supabase.auth.signOut();
    return null;
  }

  return (
    <main className="min-h-scréen bg-[#030712] text-white flex">
      <Sidebar />

      <section className="flex-1 px-8 py-10">
        <div className="mx-auto max-w-[760px]">
          <button
            onClick={() => router.push("/settings")}
            className="mb-7 flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Retour aux réglages
          </button>

          <header className="mb-7 flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">
                Paramètres
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {current.title}
              </h1>

              <p className="mt-2 text-sm text-white/45">{current.subtitle}</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-white">
              <Icon size={22} />
            </div>
          </header>

          {savedMessage && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <Check size={16} />
              {savedMessage}
            </div>
          )}

          {section === "profil" && (
            <SettingsCard>
              <h2 className="text-xl font-semibold">Compte personnel</h2>

              <p className="mt-2 text-sm text-white/40">
                Modifie les informations visibles dans ton espace.
              </p>

              <div className="mt-6 grid gap-4">
                <label>
                  <p className="mb-2 text-sm text-white/45">Nom affiché</p>

                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex : Raïs"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  />
                </label>

                <label>
                  <p className="mb-2 text-sm text-white/45">Profession</p>

                  <input
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex : Étudiant génie civil"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  />
                </label>

                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="mt-2 flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  <Save size={17} />
                  {savingProfile ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>

              <div className="mt-8 grid gap-3">
                <InfoRow
                  icon={<Mail size={17} />}
                  label="Adresse mail"
                  value={user?.email || "Non connecté"}
                />

                <InfoRow
                  icon={<User size={17} />}
                  label="Identifiant utilisateur"
                  value={user?.id || "Aucun"}
                />

                <InfoRow
                  icon={<CalendarDays size={17} />}
                  label="Compte créé"
                  value={
                    user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("fr-FR")
                      : "Indisponible"
                  }
                />

                <InfoRow
                  icon={<Briefcase size={17} />}
                  label="Type de compte"
                  value="Compte personnel"
                />
              </div>
            </SettingsCard>
          )}

         {section === "apparence" && (
  <SettingsCard>
    <h2 className="text-xl font-semibold">Apparence</h2>

    <p className="mt-2 text-sm text-white/40">
      Choisis le thème visuel. Le changement s’applique directement.
    </p>

    <div className="mt-6 grid grid-cols-2 gap-3">
      <ThemeButton
        active={theme === "black"}
        title="Noir premium"
        subtitle="Full black glass"
        preview="from-black via-[#020204] to-[#030712]"
        onClick={() => changeTheme("black")}
      />

      <ThemeButton
        active={theme === "blueglass"}
        title="Bleu foncé"
        subtitle="Bleu nuit profond"
        preview="from-[#00040d] via-[#020b1d] to-black"
        onClick={() => changeTheme("blueglass")}
      />
    </div>

    <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/40">
      Le thème choisi est sauvegardé automatiquement sur ce navigateur.
    </p>
  </SettingsCard>
)}

          {section === "notifications" && (
            <SettingsCard>
              <h2 className="text-xl font-semibold">Notifications</h2>

              <p className="mt-2 text-sm text-white/40">
                Ces préférences sont sauvegardées. Les rappels réels seront branchés ensuite.
              </p>

              <div className="mt-6 space-y-3">
                <ToggleLine
                  title="Rappels de tâches"
                  description="Prévenir avant les tâches importantes."
                  checked={tasksReminder}
                  onChange={(value) => toggleNotification("tasks", value)}
                />

                <ToggleLine
                  title="Rappels de routines"
                  description="Suivre les habitudes quotidiennes."
                  checked={routineReminder}
                  onChange={(value) => toggleNotification("routines", value)}
                />

                <ToggleLine
                  title="Résumé quotidien"
                  description="Recevoir un résumé de la journée."
                  checked={dailySummary}
                  onChange={(value) => toggleNotification("daily", value)}
                />
              </div>
            </SettingsCard>
          )}

          {section === "faq" && (
            <SettingsCard>
              <h2 className="text-xl font-semibold">FAQ</h2>

              <p className="mt-2 text-sm text-white/40">
                Les réponses aux questions importantes sur l’application.
              </p>

              <div className="mt-6 space-y-3">
                {faqItems.map((item) => (
                  <FaqItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </div>
            </SettingsCard>
          )}

          {section === "securite" && (
            <SettingsCard>
              <h2 className="text-xl font-semibold">Sécurité</h2>

              <p className="mt-2 text-sm text-white/40">
                Gère ta session et la déconnexion du compte.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-white/40">Session active</p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {user?.email || "Utilisateur non connecté"}
                </p>
              </div>

              <button
                onClick={logout}
                className="mt-5 flex items-center gap-2 rounded-2xl bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                <LogOut size={17} />
                Se déconnecter
              </button>
            </SettingsCard>
          )}
        </div>
      </section>
    </main>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20">
      {children}
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/10 bg-black/20 p-3.5">
      <div className="flex items-center gap-3 text-white/45">
        {icon}
        <span className="text-sm">{label}</span>
      </div>

      <p className="max-w-[420px] truncate text-xs font-semibold text-white/80">
        {value}
      </p>
    </div>
  );
}

function ThemeButton({
  active,
  title,
  subtitle,
  preview,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  preview: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-white/45 bg-white/[0.08]"
          : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
      }`}
    >
      <div
        className={`mb-3 h-16 rounded-xl border border-white/10 bg-gradient-to-br ${preview}`}
      />

      <p className="text-sm font-semibold">{title}</p>

      <p className="mt-1 text-[11px] text-white/35">
        {active ? "Actif" : subtitle}
      </p>
    </button>
  );
}

function ToggleLine({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/[0.05]"
    >
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-white/35">{description}</p>
      </div>

      <div
        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
          checked ? "bg-white" : "bg-white/10"
        }`}
      >
        <div
          className={`h-5 w-5 rounded-full transition ${
            checked ? "translate-x-5 bg-black" : "translate-x-0 bg-white/45"
          }`}
        />
      </div>
    </button>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold">{question}</h3>

      <p className="mt-2 text-xs leading-5 text-white/40">{answer}</p>
    </div>
  );
}

