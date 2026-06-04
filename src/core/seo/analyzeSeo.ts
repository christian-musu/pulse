import * as cheerio from "cheerio";

export interface SeoResult {
  score: number;
  title: string;
  description: string | undefined;
  h1Count: number;
  h2Count: number;
  canonical: string | undefined;
  ogTitle: string | undefined;
  issues: string[];
}

/** Analizza l'SEO on-page a partire dall'HTML già scaricato. */
export function analyzeSeo(html: string): SeoResult {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content");
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const canonical = $('link[rel="canonical"]').attr("href");
  const ogTitle = $('meta[property="og:title"]').attr("content");

  let score = 100;
  if (!title) score -= 20;
  if (!description) score -= 20;
  if (h1Count === 0) score -= 15;
  if (h1Count > 1) score -= 10;
  if (!canonical) score -= 10;
  if (!ogTitle) score -= 10;

  const issues = [
    !title && "Title mancante",
    !description && "Meta description mancante",
    h1Count === 0 && "H1 mancante",
    h1Count > 1 && "Più di un tag H1",
    !canonical && "Canonical mancante",
    !ogTitle && "Open Graph title mancante",
  ].filter((x): x is string => Boolean(x));

  return {
    score: Math.max(0, score),
    title,
    description,
    h1Count,
    h2Count,
    canonical,
    ogTitle,
    issues,
  };
}
