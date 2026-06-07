import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type PlannerAction = {
  type: "create_task";
  name: string;
  due_date: string | null;
  hour: string | null;
  end_time: string | null;
  priority: "Basse" | "Normale" | "Importante" | "Urgent";
  category: string;
  project_name: string | null;
  reason: string;
};

type AssistantResult = {
  reply: string;
  actions: PlannerAction[];
};

function safeJsonParse(text: string): AssistantResult {
  try {
    const parsed = JSON.parse(text);

    return {
      reply:
        typeof parsed.reply === "string"
          ? parsed.reply
          : "Je t’ai répondu, mais le format était incomplet.",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    return {
      reply: text || "Je n’ai pas réussi à générer une réponse.",
      actions: [],
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body?.message || "";
    const history = Array.isArray(body?.history) ? body.history : [];
    const plannerContext = body?.plannerContext || {};

    if (!message.trim()) {
      return NextResponse.json(
        {
          reply: "Écris-moi quelque chose pour que je puisse t’aider.",
          actions: [],
        },
        { status: 200 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          reply:
            "La clé OPENAI_API_KEY n’est pas configurée dans .env.local. Ajoute-la puis relance le serveur.",
          actions: [],
        },
        { status: 200 }
      );
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions: `
Tu es l'assistant IA personnel de Planner Pro.

Tu peux parler librement avec l'utilisateur, même si sa question ne concerne pas le planner.
Tu dois répondre en français, naturellement, avec un ton direct, utile et stratégique.

Tu as accès à un contexte Planner fourni en JSON :
- tâches
- projets
- routines
- retards
- progression jour/semaine/mois
- priorités
- nom utilisateur

Tu dois aider à :
1. Faire un rapport journalier, hebdomadaire ou mensuel.
2. Classer les tâches dans le meilleur ordre.
3. Aider sur les projets.
4. Créer une planification.
5. Préparer des tâches à créer.
6. Répondre aussi aux questions générales hors planner.

RÈGLE IMPORTANTE :
Tu ne crées jamais directement une tâche.
Tu proposes une liste "actions" que l'utilisateur pourra valider dans l'interface.

Si l'utilisateur demande :
- "crée une tâche..."
- "planifie-moi..."
- "mets..."
- "ajoute..."
- "organise demain..."
alors tu peux proposer une ou plusieurs actions de type "create_task".

Format obligatoire de sortie :
Tu dois répondre UNIQUEMENT en JSON valide, sans markdown, sans texte autour.

Structure exacte :
{
  "reply": "réponse naturelle à afficher dans le chat",
  "actions": [
    {
      "type": "create_task",
      "name": "Nom de la tâche",
      "due_date": "YYYY-MM-DD ou null",
      "hour": "HH:mm ou null",
      "end_time": "HH:mm ou null",
      "priority": "Basse | Normale | Importante | Urgent",
      "category": "Études | Travail | Personnel | Sport | Projet | Autre",
      "project_name": "nom du projet si clairement mentionné sinon null",
      "reason": "pourquoi cette tâche est proposée"
    }
  ]
}

Si la date ou l'heure manque mais que l'utilisateur demande clairement une tâche, propose l'action avec null et explique dans reply qu'il faudra compléter.
Si la demande est seulement une question, actions doit être [].
      `,
      input: JSON.stringify({
        user_message: message,
        conversation_history: history.slice(-12),
        planner_context: plannerContext,
      }),
    });

    const result = safeJsonParse(response.output_text);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      {
        reply:
          error?.message ||
          "Erreur côté assistant IA. Vérifie ta clé OpenAI et le terminal.",
        actions: [],
      },
      { status: 200 }
    );
  }
}