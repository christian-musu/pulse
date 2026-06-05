# 🩺 Pulse

**Pulse** è un tool da riga di comando (CLI) che esegue un **audit completo di un sito web** e genera un **report PDF professionale**.

Dato un URL, Pulse:

1. **🕷️ Crawla** il sito (fino a 10 pagine interne, stesso dominio)
2. **🔍 Analizza** ogni pagina:
   - **SEO** — title, meta description, H1/H2, canonical, Open Graph
   - **Performance** — punteggi Lighthouse (Performance, Accessibility, Best Practices, SEO) via headless Chrome
   - **Security** — header HTTP (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) e uso di HTTPS
   - **Technology** — rilevamento stack (WordPress, Next.js, React, Shopify, jQuery, Cloudflare, ecc.)
3. **🧠 Genera** un report strategico in italiano con un modello **Claude** (Anthropic)
4. **📄 Produce** un **PDF** in `reports/` con summary, insights AI, action plan e dettaglio tecnico

---

## 📦 Requisiti

- **Node.js 20+**
- Connessione a internet (per crawl, Lighthouse e API Claude)
- **Chrome** viene scaricato automaticamente da Puppeteer all'installazione
- *(Opzionale)* una **API key Anthropic** per il report AI

---

## 🚀 Installazione

```bash
# 1. Clona il repository
git clone https://github.com/ChriisPops90/pulse.git
cd pulse

# 2. Installa le dipendenze (scarica anche Chrome per Puppeteer)
npm install

# 3. Configura la chiave AI (opzionale ma consigliato)
cp .env.example .env
# poi apri .env e incolla la tua chiave: ANTHROPIC_API_KEY=sk-ant-...

# 4. Compila
npm run build
```

### Uso globale (comando `pulse`)

Per usare `pulse` come comando di sistema:

```bash
npm link        # registra il binario "pulse" globalmente
pulse example.com
```

---

## 🧑‍💻 Utilizzo

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

### Opzioni

| Opzione           | Descrizione                                                        |
| ----------------- | ----------------------------------------------------------------- |
| `-d, --desktop`   | A PDF pronto, lo copia anche sul Desktop dell'utente (`~/Desktop`) |
| `-V, --version`   | Mostra la versione                                                 |
| `-h, --help`      | Mostra l'aiuto                                                     |

Output di esempio:

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

## ⚙️ Configurazione

| Variabile             | Descrizione                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`   | Chiave API Anthropic per il report AI. Se assente, l'audit gira lo stesso e il PDF riporta una nota al posto della sezione AI. |

Le variabili vengono lette dal file `.env` (tramite `dotenv`).

Il modello usato è `claude-sonnet-4-6` (modificabile in `src/core/ai/generateReport.ts`).

---

## 📂 Struttura del progetto

```
src/
├── index.ts                         # entry point CLI (commander)
└── core/
    ├── crawler/crawlSite.ts         # crawling stesso-dominio
    ├── analyzer/analyzeSite.ts      # orchestratore: 1 fetch/pagina + media punteggi
    ├── seo/analyzeSeo.ts            # analisi SEO on-page
    ├── performance/analyzePerformance.ts  # Lighthouse + Puppeteer
    ├── security/analyzeSecurity.ts  # header di sicurezza
    ├── technology/detectTechnology.ts     # rilevamento stack
    ├── ai/generateReport.ts         # report strategico (Claude)
    └── pdf/generatePdf.ts           # generazione PDF (pdfkit)
```

---

## 🛠️ Script disponibili

| Script          | Azione                                            |
| --------------- | ------------------------------------------------- |
| `npm run dev`   | Esegue la CLI con `tsx` (senza compilare)         |
| `npm run build` | Compila in `dist/` con `tsup` (ESM)               |
| `npm start`     | Esegue la versione compilata (`node dist/index.js`) |

---

## ❓ Troubleshooting

- **Il report AI non viene generato** → manca `ANTHROPIC_API_KEY` nel file `.env`. L'audit tecnico e il PDF funzionano comunque.
- **Lighthouse fallisce su una pagina** → Pulse è resiliente: registra un warning, assegna 0 a quella pagina e prosegue l'audit.
- **Errore Puppeteer / Chrome non trovato** → riesegui `npm install` (scarica Chrome) oppure imposta `PUPPETEER_EXECUTABLE_PATH` su un Chrome esistente.
- **`pulse: command not found`** → esegui `npm link` nella cartella del progetto, oppure usa `node dist/index.js`.

---

## 📄 Licenza

Uso personale.
