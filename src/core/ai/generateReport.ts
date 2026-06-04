import Anthropic from "@anthropic-ai/sdk";
import type { SiteReport } from "../analyzer/analyzeSite.js";

const MODEL = "claude-sonnet-4-6";

/**
 * Genera un report strategico in italiano con il modello Claude.
 * Se manca la API key ritorna un messaggio chiaro invece di crashare.
 */
export async function generateReport(data: SiteReport, url: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "⚠️ ANTHROPIC_API_KEY non impostata: report AI non generato. Crea un file .env con ANTHROPIC_API_KEY=...";
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Sei un consulente SEO, performance e security expert.

URL analizzato: ${url}

Punteggi medi (0-100):
- SEO: ${data.avgSeo}
- Performance: ${data.avgPerformance}
- Security: ${data.avgSecurity}

Tecnologie rilevate: ${data.technologies.length ? data.technologies.join(", ") : "n/d"}

Dettaglio pagine:
${JSON.stringify(data.pages, null, 2)}

Scrivi un report professionale in italiano, conciso e azionabile, con queste sezioni:
1. Analisi generale
2. Problemi principali
3. Impatto sul business
4. Priorità di intervento (ordinate)`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const parts: string[] = [];
    for (const block of res.content) {
      if (block.type === "text") parts.push(block.text);
    }
    return parts.join("\n").trim() || "Il modello non ha restituito contenuto testuale.";
  } catch (err) {
    return `⚠️ Errore nella generazione del report AI: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}
