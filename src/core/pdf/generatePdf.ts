import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import type { SiteReport } from "../analyzer/analyzeSite.js";

const REPORTS_DIR = "reports";

const COLOR = {
  dark: "#1A1A1A",
  gray: "#666666",
  lightGray: "#AAAAAA",
  ultraLight: "#F7F7F7",
  white: "#FFFFFF",
  brand: "#E08A00",
  green: "#1E9E5A",
  orange: "#E08A00",
  red: "#D23B3B",
  rule: "#E5E5E5",
} as const;

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function getFileName(url: string): string {
  const slug = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `pulse-report-${slug || "site"}.pdf`;
}

function ratingWord(score: number): string {
  if (score >= 85) return "Ottimo";
  if (score >= 60) return "Buono";
  return "Critico";
}
function ratingColor(score: number): string {
  if (score >= 85) return COLOR.green;
  if (score >= 60) return COLOR.orange;
  return COLOR.red;
}
function priorityWord(score: number): string {
  if (score < 60) return "Alta priorita";
  if (score < 85) return "Media priorita";
  return "Bassa priorita";
}

function sanitize(text: string): string {
  return text
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      ""
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

type Doc = InstanceType<typeof PDFDocument>;

function drawFooter(doc: Doc, pageNum: number): void {
  const y = PAGE_HEIGHT - MARGIN + 5;
  doc
    .strokeColor(COLOR.rule)
    .lineWidth(0.5)
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.lightGray)
    .text("PULSE — Web Audit Report", MARGIN, y + 6, { width: CONTENT_WIDTH / 2, align: "left" })
    .text(`Pagina ${pageNum}`, MARGIN, y + 6, { width: CONTENT_WIDTH, align: "right" });
}

function sectionTitle(doc: Doc, title: string, subtitle?: string): void {
  doc.moveDown(0.5);
  // accent bar via rectangle at current position
  const y = doc.y;
  doc.rect(MARGIN, y, 4, subtitle ? 34 : 22).fill(COLOR.brand);
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(COLOR.dark)
    .text(title, MARGIN + 14, y);
  if (subtitle) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR.gray)
      .text(subtitle, MARGIN + 14);
  }
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(11).fillColor(COLOR.dark);
}

function divider(doc: Doc): void {
  doc.moveDown(0.6);
  doc
    .strokeColor(COLOR.rule)
    .lineWidth(0.5)
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .stroke();
  doc.moveDown(0.6);
}

function scoreRow(doc: Doc, label: string, score: number): void {
  const barMaxWidth = CONTENT_WIDTH - 170;
  const barWidth = Math.max(4, Math.round((score / 100) * barMaxWidth));
  const y = doc.y;

  doc.font("Helvetica").fontSize(11).fillColor(COLOR.dark).text(label, MARGIN, y + 4, { width: 90 });

  // bar bg
  doc.roundedRect(MARGIN + 95, y + 7, barMaxWidth, 7, 3).fill(COLOR.rule);
  // bar fill
  doc.roundedRect(MARGIN + 95, y + 7, barWidth, 7, 3).fill(ratingColor(score));

  // score text
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(ratingColor(score))
    .text(`${score}/100`, MARGIN + 95 + barMaxWidth + 8, y + 3, { width: 55, align: "right" });

  // rating word
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(ratingColor(score))
    .text(ratingWord(score), MARGIN + 95 + barMaxWidth + 68, y + 4, { width: 55 });

  doc.font("Helvetica").fillColor(COLOR.dark);
  doc.y = y + 22;
}

export async function generatePdfReport(
  data: SiteReport,
  aiReport: string,
  url: string
): Promise<string> {
  if (!url) throw new Error("URL mancante nel PDF generator");

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, getFileName(url));

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: MARGIN,
      size: "A4",
      autoFirstPage: false,
      bufferPages: true,
    });
    const stream = fs.createWriteStream(filePath);

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
    doc.on("error", reject);
    doc.pipe(stream);

    // ── COVER ────────────────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });

    // dark bg
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill("#111111");
    // top bar
    doc.rect(0, 0, PAGE_WIDTH, 6).fill(COLOR.brand);
    // bottom bar
    doc.rect(0, PAGE_HEIGHT - 6, PAGE_WIDTH, 6).fill(COLOR.brand);

    // title
    doc
      .font("Helvetica-Bold")
      .fontSize(80)
      .fillColor(COLOR.white)
      .text("PULSE", 0, 160, { align: "center", width: PAGE_WIDTH, characterSpacing: 10 });

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(COLOR.brand)
      .text("WEB AUDIT REPORT", 0, 262, { align: "center", width: PAGE_WIDTH, characterSpacing: 5 });

    // rule
    doc
      .strokeColor(COLOR.brand)
      .lineWidth(1)
      .moveTo(MARGIN + 80, 292)
      .lineTo(PAGE_WIDTH - MARGIN - 80, 292)
      .stroke();

    // URL
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(COLOR.white)
      .text(url, 0, 308, { align: "center", width: PAGE_WIDTH });

    // date
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR.lightGray)
      .text(`Generato il ${new Date().toLocaleString("it-IT")}`, 0, 334, {
        align: "center",
        width: PAGE_WIDTH,
      });

    // score cards
    const { avgSeo, avgPerformance: avgPerf, avgSecurity: avgSec } = data;
    const overall = Math.round((avgSeo + avgPerf + avgSec) / 3);
    const metrics = [
      { label: "Overall", score: overall },
      { label: "SEO", score: avgSeo },
      { label: "Performance", score: avgPerf },
      { label: "Security", score: avgSec },
    ];
    const cardW = 100;
    const gap = 14;
    const totalW = metrics.length * cardW + (metrics.length - 1) * gap;
    let cx = (PAGE_WIDTH - totalW) / 2;
    const cy = 400;

    metrics.forEach(({ label, score }) => {
      doc.roundedRect(cx, cy, cardW, 72, 8).fill("#1E1E1E");
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor(ratingColor(score))
        .text(`${score}`, cx, cy + 10, { width: cardW, align: "center" });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLOR.lightGray)
        .text("/100", cx, cy + 38, { width: cardW, align: "center" });
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLOR.lightGray)
        .text(label.toUpperCase(), cx, cy + 52, { width: cardW, align: "center", characterSpacing: 1 });
      cx += cardW + gap;
    });

    // technologies
    if (data.technologies.length) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLOR.lightGray)
        .text(`Stack: ${data.technologies.join("  ·  ")}`, 0, 510, {
          align: "center",
          width: PAGE_WIDTH,
        });
    }

    // ── PAGE 2: SUMMARY + ACTION PLAN ────────────────────────────────────────
    doc.addPage();

    sectionTitle(doc, "Executive Summary", `Analisi di ${data.pages.length} pagine`);
    scoreRow(doc, "Overall", overall);
    doc.moveDown(0.3);
    scoreRow(doc, "SEO", avgSeo);
    doc.moveDown(0.3);
    scoreRow(doc, "Performance", avgPerf);
    doc.moveDown(0.3);
    scoreRow(doc, "Security", avgSec);
    doc.moveDown(0.8);

    // verdict box
    const verdictText =
      overall >= 85
        ? "Il sito ha ottime prestazioni generali. Mantieni il monitoraggio."
        : overall >= 60
        ? "Il sito e migliorabile con ottimizzazioni mirate. Segui l'action plan."
        : "Criticita importanti rilevate. E necessario intervenire con priorita.";
    const vBg = overall >= 85 ? "#E8F8F0" : overall >= 60 ? "#FFF3DC" : "#FDEAEA";
    const vY = doc.y;
    doc.roundedRect(MARGIN, vY, CONTENT_WIDTH, 38, 5).fill(vBg);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(ratingColor(overall))
      .text("VALUTAZIONE COMPLESSIVA", MARGIN + 12, vY + 6, { width: CONTENT_WIDTH - 24 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR.dark)
      .text(verdictText, MARGIN + 12, vY + 19, { width: CONTENT_WIDTH - 24 });
    doc.y = vY + 46;

    divider(doc);

    // Action Plan
    sectionTitle(doc, "Action Plan", "Priorita di intervento consigliate");

    [
      { label: "SEO", score: avgSeo },
      { label: "Performance", score: avgPerf },
      { label: "Security", score: avgSec },
    ].forEach(({ label, score }) => {
      const aY = doc.y;
      const aBg = score < 60 ? "#FDEAEA" : score < 85 ? "#FFF3DC" : "#E8F8F0";
      doc.roundedRect(MARGIN, aY, CONTENT_WIDTH, 26, 4).fill(aBg);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLOR.dark)
        .text(label, MARGIN + 12, aY + 7, { width: 80 });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(ratingColor(score))
        .text(`${score}/100 — ${priorityWord(score)}`, MARGIN + 100, aY + 8, {
          width: CONTENT_WIDTH - 116,
          align: "right",
        });
      doc.y = aY + 32;
    });

    doc.moveDown(0.6);

    // Issues
    const seoIssues = [...new Set(data.pages.flatMap((p) => p.seoIssues))];
    const secIssues = [...new Set(data.pages.flatMap((p) => p.securityIssues))];
    const allIssues = [
      ...seoIssues.map((i) => ({ tag: "SEO", text: i, color: COLOR.brand })),
      ...secIssues.map((i) => ({ tag: "SEC", text: i, color: COLOR.red })),
    ];

    if (allIssues.length) {
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLOR.dark)
        .text("Problemi ricorrenti");
      doc.moveDown(0.4);

      allIssues.forEach(({ tag, text, color }) => {
        const iY = doc.y;
        doc.roundedRect(MARGIN, iY, 36, 14, 6).fill(color);
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(COLOR.white)
          .text(tag, MARGIN, iY + 3, { width: 36, align: "center" });
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLOR.dark)
          .text(text, MARGIN + 44, iY + 2, { width: CONTENT_WIDTH - 44 });
        doc.moveDown(0.5);
      });
    }

    // ── PAGE 3: AI INSIGHTS + TECHNICAL OVERVIEW ─────────────────────────────
    doc.addPage();

    sectionTitle(doc, "AI Strategic Insights", "Analisi strategica generata da Claude (Anthropic)");

    const cleanAi = sanitize(aiReport) || "Report AI non disponibile.\nConfigura ANTHROPIC_API_KEY nel file .env per abilitare questa sezione.";
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(COLOR.dark)
      .text(cleanAi, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        lineGap: 3,
        paragraphGap: 6,
      });

    divider(doc);

    // Technical Overview
    sectionTitle(doc, "Technical Overview", "Dettaglio pagine analizzate");

    // table header
    const hY = doc.y;
    doc.rect(MARGIN, hY, CONTENT_WIDTH, 18).fill(COLOR.ultraLight);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLOR.gray)
      .text("URL", MARGIN + 4, hY + 5, { width: 240 })
      .text("SEO", MARGIN + 252, hY + 5, { width: 40, align: "center" })
      .text("PERF", MARGIN + 298, hY + 5, { width: 40, align: "center" })
      .text("SEC", MARGIN + 344, hY + 5, { width: 40, align: "center" });
    doc.y = hY + 22;

    data.pages.slice(0, 15).forEach((p, i) => {
      const rowY = doc.y;
      if (i % 2 === 0) {
        doc.rect(MARGIN, rowY, CONTENT_WIDTH, 18).fill("#FAFAFA");
      }
      const urlText = p.page.length > 50 ? p.page.slice(0, 47) + "..." : p.page;
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLOR.dark)
        .text(urlText, MARGIN + 4, rowY + 5, { width: 240 });
      [
        { x: MARGIN + 252, s: p.seo },
        { x: MARGIN + 298, s: p.performance },
        { x: MARGIN + 344, s: p.security },
      ].forEach(({ x, s }) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(ratingColor(s))
          .text(`${s}`, x, rowY + 5, { width: 40, align: "center" });
      });
      doc.y = rowY + 20;
    });

    // ── FOOTERS on all pages (skip cover) ────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      if (i > range.start) drawFooter(doc, i); // skip cover (i === range.start)
    }

    doc.flushPages();
    doc.end();
  });
}
