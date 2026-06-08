# 🩺 Pulse

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/AI-Claude%20(Anthropic)-orange?logo=anthropic" alt="Claude AI"/>
  <img src="https://img.shields.io/badge/license-Personal%20Use-lightgrey" alt="License"/>
  <img src="https://img.shields.io/badge/PDF-pdfkit-red" alt="PDFKit"/>
  <img src="https://img.shields.io/badge/auditor-Lighthouse-blue?logo=googlechrome" alt="Lighthouse"/>
</p>

<p align="center">
  <b>🇮🇹 CLI tool per audit completi di siti web con report PDF + AI</b><br/>
  <b>🇬🇧 CLI tool for full website audits with PDF + AI reports</b>
</p>

---

## 🇮🇹 Italiano

**Pulse** è un tool da riga di comando (CLI) che esegue un **audit completo di un sito web** e genera un **report PDF professionale**.

Dato un URL, Pulse:

1. **🕷️ Crawla** il sito (fino a 10 pagine interne, stesso dominio)
2. **🔍 Analizza** ogni pagina:
   - **SEO** — title, meta description, H1/H2, canonical, Open Graph
   - **Performance** — punteggi Lighthouse (Performance, Accessibility, Best Practices, SEO) via headless Chrome
   - **Security** — header HTTP (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) e uso di HTTPS
   - **Technology** — rilevamento stack (WordPress, Next.js, React, Shopify, jQuery, Cloudflare, ecc.)
3. **🧠 Genera** un report strategico in italiano con **Claude** (Anthropic)
4. **📄 Produce** un **PDF** in `reports/` con summary, insights AI, action plan e dettaglio tecnico

---

### 📦 Requisiti

- **Node.js 20+**
- Connessione a internet (per crawl, Lighthouse e API Claude)
- **Chrome** viene scaricato automaticamente da Puppeteer all'installazione
- *(Opzionale)* una **API key Anthropic** per il report AI

---

### 🚀 Installazione

```bash
# 1. Clona il repository
git clone https://github.com/christian-musu/pulse.git
cd pulse

# 2. Installa le dipendenze (scarica anche Chrome per Puppeteer)
npm install

# 3. Configura la chiave AI (opzionale ma consigliato)
cp .env.example .env
# poi apri .env e incolla la tua chiave: ANTHROPIC_API_KEY=sk-ant-...

# 4. Compila
npm run build
```

#### Uso globale (comando `pulse`)

Per usare `pulse` come comando di sistema:

```bash
npm link        # registra il binario "pulse" globalmente
pulse example.com
```

---

### 🧑‍💻 Utilizzo

```bash
# Dopo il build
node dist/index.js example.com

# Oppure in sviluppo (senza build, via tsx)
npm run dev -- example.com

# Con comando globale (dopo npm link)
pulse https://example.com

# Copia automaticamente il PDF anche sul Desktop
pulse example.com --desktop
```

Lo schema (`https://`) è facoltativo: `pulse example.com` viene normalizzato in `https://example.com`.

#### Opzioni

| Opzione         | Descrizione                                                        |
| --------------- | ------------------------------------------------------------------ |
| `-d, --desktop` | A PDF pronto, lo copia anche sul Desktop dell'utente (`~/Desktop`) |
| `-V, --version` | Mostra la versione                                                 |
| `-h, --help`    | Mostra l'aiuto                                                     |

#### Output di esempio

```
🚀 Avvio audit completo: https://example.com
🗺️  Pagine trovate: 7

🔍 Analisi pagina: https://example.com
...
📊 REPORT TECNICO
   SEO 80 · Performance 72 · Security 55
   Tecnologie: WordPress, jQuery, Cloudflare

🧠 Generazione AI report...
📄 Generazione PDF...

✅ PDF generato: reports/pulse-report-example-com.pdf
```

---

### ⚙️ Configurazione

| Variabile           | Descrizione                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Chiave API Anthropic per il report AI. Se assente, l'audit gira lo stesso e il PDF riporta una nota al posto della sezione AI. |

Le variabili vengono lette dal file `.env` (tramite `dotenv`).

Il modello usato è `claude-sonnet-4-6` (modificabile in `src/core/ai/generateReport.ts`).

---

### 📂 Struttura del progetto

```
src/
├── index.ts                              # entry point CLI (commander)
└── core/
    ├── crawler/crawlSite.ts              # crawling stesso-dominio
    ├── analyzer/analyzeSite.ts           # orchestratore: 1 fetch/pagina + media punteggi
    ├── seo/analyzeSeo.ts                 # analisi SEO on-page
    ├── performance/analyzePerformance.ts # Lighthouse + Puppeteer
    ├── security/analyzeSecurity.ts       # header di sicurezza
    ├── technology/detectTechnology.ts    # rilevamento stack
    ├── ai/generateReport.ts              # report strategico (Claude)
    └── pdf/generatePdf.ts                # generazione PDF (pdfkit)
```

---

### 🛠️ Script disponibili

| Script          | Azione                                              |
| --------------- | --------------------------------------------------- |
| `npm run dev`   | Esegue la CLI con `tsx` (senza compilare)           |
| `npm run build` | Compila in `dist/` con `tsup` (ESM)                 |
| `npm start`     | Esegue la versione compilata (`node dist/index.js`) |

---

### ❓ Troubleshooting

- **Il report AI non viene generato** → manca `ANTHROPIC_API_KEY` nel file `.env`. L'audit tecnico e il PDF funzionano comunque.
- **Lighthouse fallisce su una pagina** → Pulse è resiliente: registra un warning, assegna 0 a quella pagina e prosegue l'audit.
- **Errore Puppeteer / Chrome non trovato** → riesegui `npm install` (scarica Chrome) oppure imposta `PUPPETEER_EXECUTABLE_PATH` su un Chrome esistente.
- **`pulse: command not found`** → esegui `npm link` nella cartella del progetto, oppure usa `node dist/index.js`.

---

### 🗺️ Roadmap

- [ ] Output in formato HTML interattivo
- [ ] Supporto multi-lingua per il report AI (EN, ES, FR)
- [ ] Modalità `--watch` per audit periodici automatici
- [ ] Dashboard web locale per visualizzare i report
- [ ] Supporto sitemap.xml per crawling guidato
- [ ] Integrazione con Slack / email per invio automatico del report
- [ ] Score storico con confronto tra audit successivi

---

## 🇬🇧 English

**Pulse** is a command-line tool (CLI) that performs a **complete website audit** and generates a **professional PDF report**.

Given a URL, Pulse:

1. **🕷️ Crawls** the site (up to 10 internal pages, same domain)
2. **🔍 Analyzes** each page:
   - **SEO** — title, meta description, H1/H2, canonical, Open Graph
   - **Performance** — Lighthouse scores (Performance, Accessibility, Best Practices, SEO) via headless Chrome
   - **Security** — HTTP headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) and HTTPS usage
   - **Technology** — stack detection (WordPress, Next.js, React, Shopify, jQuery, Cloudflare, etc.)
3. **🧠 Generates** a strategic report using **Claude** (Anthropic)
4. **📄 Produces** a **PDF** in `reports/` with summary, AI insights, action plan, and technical detail

---

### 📦 Requirements

- **Node.js 20+**
- Internet connection (for crawling, Lighthouse, and Claude API)
- **Chrome** is automatically downloaded by Puppeteer on install
- *(Optional)* an **Anthropic API key** for the AI report

---

### 🚀 Installation

```bash
# 1. Clone the repository
git clone https://github.com/christian-musu/pulse.git
cd pulse

# 2. Install dependencies (also downloads Chrome for Puppeteer)
npm install

# 3. Configure the AI key (optional but recommended)
cp .env.example .env
# then open .env and paste your key: ANTHROPIC_API_KEY=sk-ant-...

# 4. Build
npm run build
```

#### Global usage (`pulse` command)

To use `pulse` as a system-wide command:

```bash
npm link        # registers the "pulse" binary globally
pulse example.com
```

---

### 🧑‍💻 Usage

```bash
# After build
node dist/index.js example.com

# Or in development (without build, via tsx)
npm run dev -- example.com

# With global command (after npm link)
pulse https://example.com

# Also copies the PDF to Desktop
pulse example.com --desktop
```

The scheme (`https://`) is optional: `pulse example.com` is normalized to `https://example.com`.

#### Options

| Option          | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `-d, --desktop` | When PDF is ready, also copies it to the user's `~/Desktop`  |
| `-V, --version` | Show version                                                 |
| `-h, --help`    | Show help                                                    |

---

### ⚙️ Configuration

| Variable            | Description                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Anthropic API key for the AI report. If missing, the technical audit still runs and the PDF notes it.    |

Variables are read from the `.env` file (via `dotenv`).

The model used is `claude-sonnet-4-6` (configurable in `src/core/ai/generateReport.ts`).

---

### 🗺️ Roadmap

- [ ] Interactive HTML output format
- [ ] Multi-language AI report support (EN, ES, FR)
- [ ] `--watch` mode for periodic automated audits
- [ ] Local web dashboard to visualize reports
- [ ] sitemap.xml support for guided crawling
- [ ] Slack / email integration for automatic report delivery
- [ ] Historical score tracking with comparison across audits

---

### ❓ Troubleshooting

- **AI report not generated** → missing `ANTHROPIC_API_KEY` in `.env`. The technical audit and PDF still work.
- **Lighthouse fails on a page** → Pulse is resilient: logs a warning, assigns 0 to that page, and continues.
- **Puppeteer / Chrome not found error** → re-run `npm install` (downloads Chrome) or set `PUPPETEER_EXECUTABLE_PATH` to an existing Chrome.
- **`pulse: command not found`** → run `npm link` in the project folder, or use `node dist/index.js`.

---

## 📄 License

Personal use only.
