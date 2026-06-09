"use client";

import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  CalendarDays,
  FolderKanban,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Salut, je suis ton assistant IA. Je peux t'aider à organiser tes tâches, tes projets, ton planning et tes priorités.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Réponse impossible.");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.answer ||
            "Je n'ai pas réussi à générer une réponse pour le moment.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "L'assistance IA n'est pas encore connectée au serveur. La page fonctionne, mais il faut brancher l'API pour obtenir des réponses automatiques.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#030712] text-white">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-8 flex items-start justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">
                Assistance IA
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                Assistant intelligent
              </h1>

              <p className="mt-3 max-w-2xl text-base text-white/45">
                Pose une question, demande un plan d'action, une stratégie de
                travail ou une organisation de projet.
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70">
              <Bot size={26} />
            </div>
          </header>

          <section className="mb-6 grid grid-cols-3 gap-5">
            <PromptCard
              icon={<Lightbulb size={18} />}
              title="Prioriser ma journée"
              text="Aide-moi à choisir les tâches les plus importantes aujourd'hui."
              onClick={() =>
                setInput(
                  "Aide-moi à prioriser ma journée avec mes tâches importantes."
                )
              }
            />

            <PromptCard
              icon={<FolderKanban size={18} />}
              title="Structurer un projet"
              text="Transforme une idée en projet clair avec étapes et priorités."
              onClick={() =>
                setInput(
                  "Aide-moi à structurer un projet avec des étapes claires."
                )
              }
            />

            <PromptCard
              icon={<CalendarDays size={18} />}
              title="Organiser mon planning"
              text="Propose-moi une organisation réaliste sur la semaine."
              onClick={() =>
                setInput(
                  "Aide-moi à organiser mon planning de la semaine."
                )
              }
            />
          </section>

          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="h-[560px] overflow-y-auto p-6">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[78%] rounded-3xl px-5 py-4 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-white text-black"
                          : "border border-white/10 bg-black/25 text-white/75"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl border border-white/10 bg-black/25 px-5 py-4 text-sm text-white/45">
                      L'assistant réfléchit...
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/10 p-5">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <Sparkles size={18} className="text-white/35" />

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Écris ta demande..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function PromptCard({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 text-left shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.06]"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/65">
        {icon}
      </div>

      <h2 className="text-sm font-semibold text-white">{title}</h2>

      <p className="mt-2 text-sm leading-5 text-white/40">{text}</p>
    </button>
  );
}
