import axios from "axios";
import * as cheerio from "cheerio";

/** Normalizza un URL: rimuove fragment e slash finale superfluo. */
function normalize(raw: string): string | null {
  try {
    const u = new URL(raw);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Crawla il sito a partire da baseUrl restando sullo stesso host.
 * Ritorna fino a `maxPages` URL interni unici.
 */
export async function crawlSite(baseUrl: string, maxPages = 10): Promise<string[]> {
  const start = normalize(baseUrl);
  if (!start) return [];

  const host = new URL(start).hostname;
  const visited = new Set<string>();
  const toVisit: string[] = [start];
  const pages: string[] = [];

  while (toVisit.length && pages.length < maxPages) {
    const current = toVisit.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    try {
      const { data } = await axios.get<string>(current, {
        timeout: 20000,
        responseType: "text",
        headers: { "User-Agent": "PulseAudit/1.0" },
      });
      pages.push(current);

      const $ = cheerio.load(typeof data === "string" ? data : String(data));
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return;

        let absolute: string;
        try {
          absolute = new URL(href, current).href;
        } catch {
          return;
        }

        const normalized = normalize(absolute);
        if (!normalized) return;

        if (
          new URL(normalized).hostname === host &&
          !visited.has(normalized) &&
          !toVisit.includes(normalized)
        ) {
          toVisit.push(normalized);
        }
      });
    } catch {
      // pagina non raggiungibile: ignora
    }
  }

  return pages;
}
