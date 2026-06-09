import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const message = String(body.message || "").trim();

  if (!message) {
    return NextResponse.json({
      answer: "Écris une demande pour que je puisse t'aider.",
    });
  }

  return NextResponse.json({
    answer:
      "J'ai bien reçu ta demande : « " +
      message +
      " ». Pour l'instant, cette assistance locale fonctionne comme interface. La prochaine étape sera de la connecter à une vraie API IA pour générer des réponses avancées.",
  });
}
