import axios from "axios";
import { analyzeSeo } from "../seo/analyzeSeo.js";
import { analyzePerformance } from "../performance/analyzePerformance.js";
import { analyzeSecurity } from "../security/analyzeSecurity.js";
import { detectTechnology } from "../technology/detectTechnology.js";

export interface PageResult {
  page: string;
  seo: number;
  performance: number;
  security: number;
  seoIssues: string[];
  securityIssues: string[];
}

export interface SiteReport {
  pages: PageResult[];
  technologies: string[];
  avgSeo: number;
  avgPerformance: number;
  avgSecurity: number;
}

/** Converte gli header axios in una mappa piatta {chiave-minuscola: valore}. */
function flattenHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v == null) continue;
      out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
    }
  }
  return out;
}

const avg = (arr: number[]): number =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

/** Analizza ogni pagina (un solo fetch HTML/header) + Lighthouse. */
export async function analyzeSite(pages: string[]): Promise<SiteReport> {
  const results: PageResult[] = [];
  const techSet = new Set<string>();

  for (const page of pages) {
    console.log(`\n🔍 Analisi pagina: ${page}`);
    try {
      const res = await axios.get<string>(page, {
        timeout: 20000,
        responseType: "text",
        validateStatus: () => true,
        headers: { "User-Agent": "PulseAudit/1.0" },
      });

      const html = typeof res.data === "string" ? res.data : String(res.data);
      const headers = flattenHeaders(res.headers);

      const seo = analyzeSeo(html);
      const security = analyzeSecurity(headers, page);
      detectTechnology(html, headers).forEach((t) => techSet.add(t));
      const perf = await analyzePerformance(page);

      results.push({
        page,
        seo: seo.score,
        performance: perf.performance,
        security: security.score,
        seoIssues: seo.issues,
        securityIssues: security.issues,
      });
    } catch (err) {
      console.warn(
        `   ⚠️  Impossibile analizzare ${page}:`,
        err instanceof Error ? err.message : String(err)
      );
      results.push({
        page,
        seo: 0,
        performance: 0,
        security: 0,
        seoIssues: ["Pagina non analizzabile"],
        securityIssues: [],
      });
    }
  }

  return {
    pages: results,
    technologies: [...techSet],
    avgSeo: avg(results.map((r) => r.seo)),
    avgPerformance: avg(results.map((r) => r.performance)),
    avgSecurity: avg(results.map((r) => r.security)),
  };
}
