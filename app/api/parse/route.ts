import { NextRequest, NextResponse } from "next/server";
import { parseLocally } from "@/lib/parser";
import { Category, ParsedItem } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/parse
 * Body : { text: string, categories: Category[] }
 * Réponse : { items: ParsedItem[], engine: "gemini" | "local" }
 *
 * Si la variable d'environnement GEMINI_API_KEY est définie (sur Vercel :
 * Settings → Environment Variables), la phrase est analysée par un LLM.
 * Sinon — ou en cas d'échec (429, timeout, réponse invalide) — le parseur
 * local déterministe prend le relais : l'application fonctionne donc aussi
 * sans aucune clé.
 */
export async function POST(req: NextRequest) {
  const { text, categories } = (await req.json()) as {
    text: string;
    categories: Category[];
  };

  if (!text?.trim()) {
    return NextResponse.json({ items: [], engine: "local" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const items = await parseWithGemini(text, categories, apiKey);
      if (items.length > 0) {
        return NextResponse.json({ items, engine: "gemini" });
      }
    } catch (err) {
      // Bascule silencieuse (429, timeout, JSON invalide…) : jamais d'erreur
      // remontée au client, le parseur local prend le relais.
      console.error("Echec du parsing IA, bascule sur le parseur local :", err);
    }
  }

  return NextResponse.json({ items: parseLocally(text, categories), engine: "local" });
}

async function parseWithGemini(
  text: string,
  categories: Category[],
  apiKey: string
): Promise<ParsedItem[]> {
  const catList = categories
    .map((c) => `- id: "${c.id}" (${c.name}, type: ${c.kind})`)
    .join("\n");

  const system = `Tu es un extracteur de transactions financières.
L'utilisateur saisit une phrase en vrac contenant des articles et des prix.
Découpe-la en transactions distinctes : chaque montant clôt une transaction
dont la note regroupe les articles qui le précèdent.
Catégories disponibles (utilise exactement ces id) :
${catList}
Réponds UNIQUEMENT avec un objet JSON de la forme :
{"items":[{"note":"...","amount":50,"categoryId":"courses","type":"expense"}]}
Sans texte autour, sans balises Markdown.`;

  // Endpoint compatible OpenAI de Gemini. La doc officielle ne garantit pas
  // response_format json_object sur cette couche : le JSON est forcé par le
  // prompt système et extrait de façon robuste ci-dessous.
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // gemini-2.5-flash-lite n'est plus ouvert aux nouvelles clés API
        // (404 "no longer available to new users") — 3.1 est son successeur.
        model: "gemini-3.1-flash-lite",
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text }
        ]
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(extractJson(raw));
  const validIds = new Set(categories.map((c) => c.id));

  return (Array.isArray(parsed.items) ? parsed.items : [])
    .filter(
      (i: ParsedItem) =>
        typeof i.amount === "number" &&
        i.amount > 0 &&
        typeof i.note === "string" &&
        validIds.has(i.categoryId)
    )
    .map((i: ParsedItem) => ({
      note: i.note.slice(0, 120),
      amount: i.amount,
      categoryId: i.categoryId,
      type: i.type === "income" ? "income" : "expense"
    }));
}

/**
 * Extrait l'objet JSON d'une réponse LLM potentiellement enrobée :
 * balises \`\`\`json … \`\`\` ou texte autour de l'objet.
 */
function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return s;
}