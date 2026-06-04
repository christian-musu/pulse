import * as cheerio from "cheerio";

/**
 * Rileva le tecnologie usate da una pagina analizzando HTML e header HTTP.
 * Ritorna una lista di nomi (es. ["WordPress", "jQuery", "Cloudflare"]).
 */
export function detectTechnology(
  html: string,
  headers: Record<string, string>
): string[] {
  const tech = new Set<string>();
  const $ = cheerio.load(html);
  const lower = html.toLowerCase();

  // ── Header HTTP ──────────────────────────────────────────────────────────
  if (headers["server"]) tech.add(`Server: ${headers["server"]}`);
  if (headers["x-powered-by"]) tech.add(headers["x-powered-by"]);
  if (headers["cf-ray"]) tech.add("Cloudflare");

  // ── Meta generator ───────────────────────────────────────────────────────
  const generator = $('meta[name="generator"]').attr("content");
  if (generator) tech.add(generator);

  // ── Firme nel markup ─────────────────────────────────────────────────────
  const signatures: Array<[string, RegExp | string]> = [
    ["Next.js", "__next_data__"],
    ["Nuxt", "__nuxt"],
    ["React", /data-reactroot|react(\.production|\.development)?\.min\.js/],
    ["Vue.js", /vue(\.runtime)?(\.global)?(\.prod)?\.js|data-v-[0-9a-f]/],
    ["Angular", /ng-version=|angular(\.min)?\.js/],
    ["Svelte", /svelte-[a-z0-9]{4,}/],
    ["WordPress", /wp-content|wp-includes/],
    ["Shopify", /cdn\.shopify\.com/],
    ["Wix", "wix.com"],
    ["Squarespace", "squarespace"],
    ["jQuery", /jquery(\.min)?\.js/],
    ["Bootstrap", /bootstrap(\.min)?\.(css|js)/],
    ["Tailwind CSS", /tailwind/],
    ["Google Analytics", /gtag\(|google-analytics\.com|googletagmanager\.com/],
  ];

  for (const [name, sig] of signatures) {
    const matched = typeof sig === "string" ? lower.includes(sig) : sig.test(lower);
    if (matched) tech.add(name);
  }

  return [...tech];
}
