export interface SecurityResult {
  score: number;
  issues: string[];
}

/** Valuta gli header di sicurezza già scaricati (chiavi in minuscolo). */
export function analyzeSecurity(
  headers: Record<string, string>,
  url: string
): SecurityResult {
  const issues: string[] = [];
  let score = 100;

  const check = (label: string, key: string, penalty: number) => {
    if (!headers[key]) {
      issues.push(`Header ${label} mancante`);
      score -= penalty;
    }
  };

  check("Strict-Transport-Security", "strict-transport-security", 15);
  check("Content-Security-Policy", "content-security-policy", 20);
  check("X-Frame-Options", "x-frame-options", 10);
  check("X-Content-Type-Options", "x-content-type-options", 10);
  check("Referrer-Policy", "referrer-policy", 5);

  if (!url.toLowerCase().startsWith("https")) {
    issues.push("Sito non in HTTPS");
    score -= 30;
  }

  return { score: Math.max(0, score), issues };
}
