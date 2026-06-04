import lighthouse from "lighthouse";
import puppeteer from "puppeteer";

export interface PerfScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

const ZERO: PerfScores = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };

/**
 * Esegue Lighthouse (via Puppeteer) su una pagina.
 * È resiliente: in caso di errore ritorna punteggi a 0 senza interrompere
 * l'intero audit, e chiude sempre il browser.
 */
export async function analyzePerformance(url: string): Promise<PerfScores> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const port = Number(new URL(browser.wsEndpoint()).port);
    const runner = await lighthouse(url, {
      port,
      output: "json",
      logLevel: "silent",
    });

    if (!runner?.lhr) return ZERO;

    const c = runner.lhr.categories;
    const pct = (s: number | null | undefined) => Math.round((s ?? 0) * 100);

    return {
      performance: pct(c.performance?.score),
      accessibility: pct(c.accessibility?.score),
      bestPractices: pct(c["best-practices"]?.score),
      seo: pct(c.seo?.score),
    };
  } catch (err) {
    console.warn(
      `   ⚠️  Lighthouse non disponibile per ${url}:`,
      err instanceof Error ? err.message : String(err)
    );
    return ZERO;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}
