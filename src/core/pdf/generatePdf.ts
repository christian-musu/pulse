import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import type { SiteReport } from "../analyzer/analyzeSite.js";

const REPORTS_DIR = "reports";

const COLOR = {
  dark: "#1A1A1A",
  darkBg: "#111111",
  gray: "#666666",
  lightGray: "#AAAAAA",
  ultraLight: "#F7F7F7",
  white: "#FFFFFF",
  brand: "#E08A00",
  brandLight: "#FFF3DC",
  green: "#1E9E5A",
  greenLight: "#E8F8F0",
  orange: "#E08A00",
  orangeLight: "#FFF3DC",
  red: "#D23B3B",
  redLight: "#FDEAEA",
  rule: "#E5E5E5",
  border: "#DDDDDD",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

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
function ratingBg(score: number): string {
  if (score >= 85) return COLOR.greenLight;
  if (score >= 60) return COLOR.orangeLight;
  return COLOR.redLight;
}
function priorityWord(score: number): string {
  if (score < 60) return "Alta priorità";
  if (score < 85) return "Media priorità";
  return "Bassa priorità";
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

// ─── Layout constants ───────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_HEIGHT = 35;
const CONTENT_BOTTOM = 841.89 - MARGIN - FOOTER_HEIGHT; // A4 height

// ─── Footer ─────────────────────────────────────────────────────────────────

function drawFooter(doc: Doc, pageNum: number): void {
  const y = 841.89 - MARGIN - 20;
  doc
    .strokeColor(COLOR.rule)
    .lineWidth(0.5)
    .moveTo(MARGIN, y - 8)
    .lineTo(PAGE_WIDTH - MARGIN, y - 8)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR.lightGray)
    .text("PULSE — Web Audit Report", MARGIN, y, { width: CONTENT_WIDTH / 2, align: "left" })
    .text(`Pagina ${pageNum}`, MARGIN, y, { width: CONTENT_WIDTH, align: "right" });
}

// ─── Section title ───────────────────────────────────────────────────────────

function sectionTitle(doc: Doc, title: string, subtitle?: string): void {
  // Accent bar
  doc
    .rect(MARGIN, doc.y, 4, subtitle ? 32 : 24)
    .fill(COLOR.brand);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLOR.dark)
    .text(title, MARGIN + 14, doc.y, { lineBreak: false });

  if (subtitle) {
    doc.moveDown(0.4);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR.gray)
      .text(subtitle, MARGIN + 14);
  }

  doc.moveDown(0.9);
  doc.font("Helvetica").fontSize(11).fillColor(COLOR.dark);
}

// ─── Score pill ──────────────────────────────────────────────────────────────

function scorePill(doc: Doc, x: number, y: number, score: number): void {
  const w = 56;
  const h = 22;
  // background pill
  doc.roundedRect(x, y, w, h, 11).fill(ratingBg(score));
  // score text
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(ratingColor(score))
    .text(`${score}/100`, x, y + 5, { width: w, align: "center" });
  doc.font("Helvetica").fillColor(COLOR.dark);
}

// ─── Score card row ──────────────────────────────────────────────────────────

function scoreRow(doc: Doc, label: string, score: number): void {
  const y = doc.y;
  const barMaxWidth = CONTENT_WIDTH - 160;
  const barWidth = Math.round((score / 100) * barMaxWidth);

  // Label
  doc.font("Helvetica").fontSize(11).fillColor(COLOR.dark).text(label, MARGIN, y + 5, { width: 90 });

  // Bar background
  doc.roundedRect(MARGIN + 95, y + 8, barMaxWidth, 8, 4).fill(COLOR.rule);
  // Bar fill
  if (barWidth > 0) {
    doc.roundedRect(MARGIN + 95, y + 8, barWidth, 8, 4).fill(ratingColor(score));
  }

  // Pill
  scorePill(doc, MARGIN + 95 + barMaxWidth + 8, y, score);

  // Rating word
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(ratingColor(score))
    .text(ratingWord(score), MARGIN + 95 + barMaxWidth + 70, y + 6, { width: 60 });

  doc.font("Helvetica").fillColor(COLOR.dark);
  doc.moveDown(1.1);
}

// ─── Divider ────────────────────────────────────────────────────────────────

function divider(doc: Doc): void {
  doc.moveDown(0.5);
  doc
    .strokeColor(COLOR.rule)
    .lineWidth(0.5)
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .stroke();
  doc.moveDown(0.8);
}

// ─── Safe text block (adds page if needed) ───────────────────────────────────

function safeText(
  doc: Doc,
  text: string,
  opts: { fontSize?: number; color?: string; lineGap?: number } = {}
): void {
  const { fontSize = 11, color = COLOR.dark, lineGap = 2 } = opts;
  doc.font("Helvetica").fontSize(fontSize).fillColor(color);

  const lines = text.split("\n");
  for (const line of lines) {
    const needed = fontSize * 1.6 + lineGap;
    if (doc.y + needed > CONTENT_BOTTOM) {
      doc.addPage();
      doc.font("Helvetica").fontSize(fontSize).fillColor(color);
    }
    doc.text(line.trim() || " ", { lineGap, paragraphGap: 0 });
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generatePdfReport(
  data: SiteReport,
  aiReport: string,
  url: string
): Promise<string> {
  if (!url) throw new Error("URL mancante nel PDF generator");

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, getFileName(url));

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", autoFirstPage: false });
    const stream = fs.createWriteStream(filePath);
    let pageNum = 0;

    const newPage = () => {
      doc.addPage();
      pageNum++;
    };

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
    doc.on("error", reject);
    doc.pipe(stream);

    // ── COVER ───────────────────────────────────────────────────────────────
    newPage();

    // Dark background full cover
    doc.rect(0, 0, PAGE_WIDTH, 841.89).fill(COLOR.darkBg);

    // Brand accent line top
    doc.rect(0, 0, PAGE_WIDTH, 5).fill(COLOR.brand);

    // Large PULSE title
    doc
      .font("Helvetica-Bold")
      .fontSize(72)
      .fillColor(COLOR.white)
      .text("PULSE", MARGIN, 180, { align: "center", characterSpacing: 8 });

    // Subtitle
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor(COLOR.brand)
      .text("WEB AUDIT REPORT", MARGIN, 270, { align: "center", characterSpacing: 6 });

    // Horizontal rule
    doc
      .strokeColor(COLOR.brand)
      .lineWidth(1)
      .moveTo(MARGIN + 100, 305)
      .lineTo(PAGE_WIDTH - MARGIN - 100, 305)
      .stroke();

    // URL
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLOR.white)
      .text(url, MARGIN, 325, { align: "center" });

    // Date
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR.lightGray)
      .text(`Generato il ${new Date().toLocaleString("it-IT")}`, MARGIN, 360, { align: "center" });

    // Score overview on cover
    const { avgSeo, avgPerformance: avgPerf, avgSecurity: avgSec } = data;
    const overall = Math.round((avgSeo + avgPerf + avgSec) / 3);

    const metrics = [
      { label: "Overall", score: overall },
      { label: "SEO", score: avgSeo },
      { label: "Performance", score: avgPerf },
      { label: "Security", score: avgSec },
    ];

    const cardW = 100;
    const cardH = 70;
    const totalW = metrics.length * cardW + (metrics.length - 1) * 12;
    let cx = (PAGE_WIDTH - totalW) / 2;
    const cy = 430;

    metrics.forEach(({ label, score }) => {
      // Card bg
      doc.roundedRect(cx, cy, cardW, cardH, 8).fill("#1E1E1E");
      // Score
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(ratingColor(score))
        .text(`${score}`, cx, cy + 12, { width: cardW, align: "center" });
      // /100
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLOR.lightGray)
        .text("/100", cx, cy + 36, { width: cardW, align: "center" });
      // Label
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLOR.lightGray)
        .text(label.toUpperCase(), cx, cy + 50, { width: cardW, align: "center", characterSpacing: 1 });
      cx += cardW + 12;
    });

    // Technologies
    if (data.technologies.length) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COLOR.lightGray)
        .text(
          `Stack: ${data.technologies.join("  ·  ")}`,
          MARGIN,
          540,
          { align: "center" }
        );
    }

    // Brand accent line bottom
    doc.rect(0, 836, PAGE_WIDTH, 5).fill(COLOR.brand);

    // ── PAGE 2: EXECUTIVE SUMMARY + ACTION PLAN ──────────────────────────────
    newPage();
    doc.y = MARGIN;

    sectionTitle(doc, "Executive Summary", `Analisi di ${data.pages.length} pagine`);
    scoreRow(doc, "Overall", overall);
    scoreRow(doc, "SEO", avgSeo);
    scoreRow(doc, "Performance", avgPerf);
    scoreRow(doc, "Security", avgSec);

    // Overall verdict box
    const verdictBg = overall >= 85 ? COLOR.greenLight : overall >= 60 ? COLOR.orangeLight : COLOR.redLight;
    const verdictColor = ratingColor(overall);
    const verdictText =
      overall >= 85
        ? "Il sito ha ottime prestazioni generali. Mantieni il monitoraggio e punta all'eccellenza."
        : overall >= 60
        ? "Il sito e migliorabile con alcune ottimizzazioni mirate. Segui l'action plan."
        : "Rilevate criticita importanti. E necessario intervenire con priorita.";

    doc.moveDown(0.3);
    const vY = doc.y;
    doc.roundedRect(MARGIN, vY, CONTENT_WIDTH, 44, 6).fill(verdictBg);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(verdictColor)
      .text("VALUTAZIONE COMPLESSIVA", MARGIN + 14, vY + 7, { width: CONTENT_WIDTH - 28 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR.dark)
      .text(verdictText, MARGIN + 14, vY + 20, { width: CONTENT_WIDTH - 28 });
    doc.moveDown(2.2);

    divider(doc);

    // ── ACTION PLAN (inline, same page if space) ─────────────────────────────
    if (doc.y + 160 > CONTENT_BOTTOM) newPage();

    sectionTitle(doc, "Action Plan", "Priorita di intervento consigliate");

    const actionItems = [
      { label: "SEO", score: avgSeo },
      { label: "Performance", score: avgPerf },
      { label: "Security", score: avgSec },
    ];

    actionItems.forEach(({ label, score }) => {
      if (doc.y + 30 > CONTENT_BOTTOM) newPage();
      const aY = doc.y;
      const aBg = ratingBg(score);
      doc.roundedRect(MARGIN, aY, CONTENT_WIDTH, 28, 5).fill(aBg);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLOR.dark)
        .text(label, MARGIN + 12, aY + 8, { width: 80 });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(ratingColor(score))
        .text(`${score}/100 — ${priorityWord(score)}`, MARGIN + 100, aY + 9, {
          width: CONTENT_WIDTH - 112,
          align: "right",
        });
      doc.font("Helvetica").fillColor(COLOR.dark);
      doc.moveDown(1.2);
    });

    // Issues list
    const seoIssues = [...new Set(data.pages.flatMap((p) => p.seoIssues))];
    const secIssues = [...new Set(data.pages.flatMap((p) => p.securityIssues))];
    const allIssues = [
      ...seoIssues.map((i) => ({ tag: "SEO", text: i })),
      ...secIssues.map((i) => ({ tag: "Security", text: i })),
    ];

    if (allIssues.length) {
      doc.moveDown(0.4);
      if (doc.y + 30 > CONTENT_BOTTOM) newPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLOR.dark)
        .text("Problemi ricorrenti");
      doc.moveDown(0.4);

      allIssues.forEach(({ tag, text }) => {
        if (doc.y + 18 > CONTENT_BOTTOM) newPage();
        const iY = doc.y;
        // Tag pill
        const tagColor = tag === "SEO" ? COLOR.brand : COLOR.red;
        doc.roundedRect(MARGIN, iY + 1, 54, 15, 7).fill(tagColor);
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(COLOR.white)
          .text(tag.toUpperCase(), MARGIN, iY + 4, { width: 54, align: "center" });
        // Issue text
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLOR.dark)
          .text(text, MARGIN + 62, iY + 3, { width: CONTENT_WIDTH - 62 });
        doc.moveDown(0.9);
      });
    }

    // ── AI INSIGHTS ──────────────────────────────────────────────────────────
    if (doc.y + 80 > CONTENT_BOTTOM) newPage();
    else {
      divider(doc);
    }

    sectionTitle(doc, "AI Strategic Insights", "Analisi strategica generata da Claude (Anthropic)");

    const cleanAi = sanitize(aiReport) || "Report AI non disponibile.";
    const aiParagraphs = cleanAi.split(/\n{2,}/).filter(Boolean);

    aiParagraphs.forEach((para) => {
      const lines = para.split("\n");
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (doc.y + 18 > CONTENT_BOTTOM) newPage();

        // Detect heading-like lines (ALL CAPS or ending with :)
        const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 4 && trimmed.length < 60;
        if (isHeading) {
          doc.moveDown(0.3);
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor(COLOR.brand)
            .text(trimmed, { lineGap: 2 });
        } else {
          doc
            .font("Helvetica")
            .fontSize(10.5)
            .fillColor(COLOR.dark)
            .text(trimmed, { lineGap: 3 });
        }
      });
      doc.moveDown(0.4);
    });

    // ── TECHNICAL OVERVIEW ───────────────────────────────────────────────────
    if (doc.y + 80 > CONTENT_BOTTOM) newPage();
    else divider(doc);

    sectionTitle(doc, "Technical Overview", "Dettaglio pagine analizzate");

    // Table header
    const col = { url: MARGIN, seo: MARGIN + 250, perf: MARGIN + 310, sec: MARGIN + 370, tech: MARGIN + 430 };
    const headerY = doc.y;
    doc.rect(MARGIN, headerY, CONTENT_WIDTH, 20).fill(COLOR.ultraLight);
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(COLOR.gray)
      .text("URL", col.url + 4, headerY + 6)
      .text("SEO", col.seo, headerY + 6)
      .text("PERF", col.perf, headerY + 6)
      .text("SEC", col.sec, headerY + 6);
    doc.moveDown(1.4);

    data.pages.slice(0, 15).forEach((p, i) => {
      if (doc.y + 22 > CONTENT_BOTTOM) newPage();
      const rowY = doc.y;
      if (i % 2 === 0) {
        doc.rect(MARGIN, rowY, CONTENT_WIDTH, 20).fill("#FAFAFA");
      }

      // URL truncated
      const urlText = p.page.length > 45 ? p.page.slice(0, 42) + "..." : p.page;
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLOR.dark)
        .text(urlText, col.url + 4, rowY + 6, { width: 240 });

      // Scores colored
      [
        { x: col.seo, s: p.seo },
        { x: col.perf, s: p.performance },
        { x: col.sec, s: p.security },
      ].forEach(({ x, s }) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(ratingColor(s))
          .text(`${s}`, x, rowY + 6, { width: 40 });
      });

      doc.font("Helvetica").fillColor(COLOR.dark);
      doc.moveDown(1.35);
    });

    // ── FINAL FOOTER on each page ────────────────────────────────────────────
    const totalPages = (doc as any)._pageBuffer?.length ?? pageNum;
    for (let i = 0; i < pageNum; i++) {
      doc.switchToPage(i);
      if (i > 0) drawFooter(doc, i); // skip cover
    }

    doc.end();
  });
}
