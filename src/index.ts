#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { crawlSite } from "./core/crawler/crawlSite.js";
import { analyzeSite } from "./core/analyzer/analyzeSite.js";
import { generateReport } from "./core/ai/generateReport.js";
import { generatePdfReport } from "./core/pdf/generatePdf.js";

const program = new Command();

program
  .name("pulse")
  .description("Pulse — Website Audit Tool (SEO, performance, security, tech, AI report)")
  .version("1.0.0")
  .argument("<url>", "URL del sito da analizzare (es. example.com)")
  .option("-d, --desktop", "Copia il PDF generato sul Desktop")
  .action(async (url: string, options: { desktop?: boolean }) => {
    try {
      const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      console.log("\n🚀 Avvio audit completo:", target);

      // 1. CRAWL
      const pages = await crawlSite(target);
      if (pages.length === 0) {
        console.error("\n❌ Nessuna pagina raggiungibile a", target);
        process.exitCode = 1;
        return;
      }
      console.log(`🗺️  Pagine trovate: ${pages.length}`);

      // 2. ANALISI TECNICA
      const report = await analyzeSite(pages);
      console.log("\n📊 REPORT TECNICO");
      console.log(
        `   SEO ${report.avgSeo} · Performance ${report.avgPerformance} · Security ${report.avgSecurity}`
      );
      if (report.technologies.length) {
        console.log("   Tecnologie:", report.technologies.join(", "));
      }

      // 3. AI REPORT
      console.log("\n🧠 Generazione AI report...");
      const aiReport = await generateReport(report, target);

      // 4. PDF
      console.log("📄 Generazione PDF...");
      const pdf = await generatePdfReport(report, aiReport, target);
      console.log("\n✅ PDF generato:", pdf);

      // Copia opzionale sul Desktop
      if (options.desktop) {
        try {
          const desktopDir = path.join(os.homedir(), "Desktop");
          fs.mkdirSync(desktopDir, { recursive: true });
          const dest = path.join(desktopDir, path.basename(pdf));
          fs.copyFileSync(pdf, dest);
          console.log("🖥️  Copiato sul Desktop:", dest);
        } catch (e) {
          console.warn(
            "⚠️  Impossibile copiare sul Desktop:",
            e instanceof Error ? e.message : String(e)
          );
        }
      }
    } catch (err) {
      console.error("\n❌ ERRORE:", err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

program.parse();
