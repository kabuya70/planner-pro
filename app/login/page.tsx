"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  User,
  Briefcase,
  CalendarDays,
  VenusAndMars,
  KeyRound,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("");
  const [profession, setProfession] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetMessages() {
    setMessage("");
    setError("");
  }

  function changeMode(nextMode: Mode) {
    resetMessages();
    setMode(nextMode);
  }

  function goToDashboard() {
    window.location.href = `${window.location.origin}/dashboard`;
  }

  async function loginWithGoogle() {
    resetMessages();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      setError("Connexion Google impossible.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    goToDashboard();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();

    if (!lastName.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }

    if (!firstName.trim()) {
      setError("Le prénom est obligatoire.");
      return;
    }

    if (!gender) {
      setError("Le sexe est obligatoire.");
      return;
    }

    if (!profession.trim()) {
      setError("La profession est obligatoire.");
      return;
    }

    if (!birthDate) {
      setError("La date de naissance est obligatoire.");
      return;
    }

    if (!email.trim()) {
      setError("L’adresse mail est obligatoire.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          gender,
          profession: profession.trim(),
          birth_date: birthDate,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Compte créé. Vérifie ton email si Supabase demande une confirmation."
    );
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setError("Entre ton adresse mail.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Email de réinitialisation envoyé.");
  }

  const title =
    mode === "login"
      ? "Connexion"
      : mode === "register"
      ? "Créer un compte"
      : "Mot de passe oublié";

  const subtitle =
    mode === "login"
      ? "Connecte-toi avec Google ou avec ton email."
      : mode === "register"
      ? "Crée ton profil complet pour personnaliser ton espace."
      : "Entre ton email pour recevoir un lien de réinitialisation.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-6 py-10 text-white">
      <div className="grid w-full max-w-[1120px] grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_500px]">
        <section className="hidden lg:block">
          <p className="text-[11px] uppercase tracking-[0.45em] text-white/30">
            KR Productivity
          </p>

          <h1 className="mt-5 max-w-[620px] text-6xl font-semibold leading-[1.05] tracking-tight">
            Organise ta vie avec précision.
          </h1>

          <p className="mt-6 max-w-[520px] text-lg leading-8 text-white/45">
            Tâches, projets, habitudes, calendrier et statistiques dans une
            seule interface sombre, fluide et productive.
          </p>

          <div className="mt-10 grid max-w-[600px] grid-cols-3 gap-4">
            <MiniStat value="24h" label="planning" />
            <MiniStat value="100%" label="suivi" />
            <MiniStat value="1" label="espace" />
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-black shadow-2xl shadow-black/30">
              {mode === "register" && <UserPlus size={28} />}
              {mode === "login" && <Lock size={28} />}
              {mode === "forgot" && <KeyRound size={28} />}
            </div>

            <p className="text-[11px] uppercase tracking-[0.35em] text-white/30">
              Authentification
            </p>

            <h2 className="mt-3 text-3xl font-semibold">{title}</h2>

            <p className="mt-2 text-sm text-white/40">{subtitle}</p>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={loading}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.075] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                Continuer avec Google
              </button>

              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/30">ou</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          <form
            onSubmit={
              mode === "login"
                ? handleLogin
                : mode === "register"
                ? handleRegister
                : handleForgotPassword
            }
            className="space-y-4"
          >
            {mode === "register" && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Nom"
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Ton nom"
                    icon={<User size={18} />}
                  />

                  <TextField
                    label="Prénom"
                    value={firstName}
                    onChange={setFirstName}
                    placeholder="Ton prénom"
                    icon={<User size={18} />}
                  />
                </div>

                <GenderField value={gender} onChange={setGender} />

                <TextField
                  label="Profession"
                  value={profession}
                  onChange={setProfession}
                  placeholder="Étudiant, salarié..."
                  icon={<Briefcase size={18} />}
                />

                <label className="block">
                  <p className="mb-2 text-sm text-white/40">
                    Date de naissance
                  </p>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <CalendarDays size={18} className="text-white/35" />

                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                    />
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    Cette date pourra être affichée dans ton calendrier.
                  </p>
                </label>
              </>
            )}

            <label className="block">
              <p className="mb-2 text-sm text-white/40">Adresse mail</p>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Mail size={18} className="text-white/35" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
                />
              </div>
            </label>

            {mode !== "forgot" && (
              <label className="block">
                <p className="mb-2 text-sm text-white/40">Mot de passe</p>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <Lock size={18} className="text-white/35" />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/35 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}

            {mode === "register" && (
              <label className="block">
                <p className="mb-2 text-sm text-white/40">
                  Confirmer le mot de passe
                </p>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <Lock size={18} className="text-white/35" />

                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répète ton mot de passe"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="text-white/35 transition hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Chargement..."
                : mode === "login"
                ? "Se connecter"
                : mode === "register"
                ? "Créer mon compte"
                : "Envoyer le lien"}

              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-white/40 transition hover:text-white"
                >
                  Mot de passe oublié ?
                </button>

                <div className="text-white/35">
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("register")}
                    className="font-semibold text-white transition hover:text-white/80"
                  >
                    Créer un compte
                  </button>
                </div>
              </>
            )}

            {mode === "register" && (
              <div className="text-white/35">
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="font-semibold text-white transition hover:text-white/80"
                >
                  Se connecter
                </button>
              </div>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="text-white/40 transition hover:text-white"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function GenderField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const choices = [
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
    { value: "autre", label: "Autre" },
    { value: "non_precise", label: "Ne pas préciser" },
  ];

  const selectedLabel = choices.find((item) => item.value === value)?.label;

  return (
    <label className="block">
      <p className="mb-2 text-sm text-white/40">Sexe</p>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="mb-3 flex items-center gap-3 text-white/45">
          <VenusAndMars size={18} />
          <span className="text-sm">{selectedLabel || "Choisir"}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {choices.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                value === item.value
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm text-white/40">{label}</p>

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <span className="text-white/35">{icon}</span>

        <input
          type="text"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
        />
      </div>
    </label>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-white/35">{label}</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z"
      />
    </svg>
  );
}