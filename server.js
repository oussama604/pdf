const express = require("express");
const bodyParser = require("body-parser");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const app = express();

// Middleware pour accepter le JSON et le texte brut
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.text({ type: "*/*", limit: "10mb" }));

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Content-Type: ${req.headers["content-type"]}`);
  next();
});

app.post("/generate-pdf", async (req, res) => {
  try {
    const html = typeof req.body === "string" ? req.body : req.body.html;
    if (!html) {
      console.warn("Aucun HTML reçu.");
      return res.status(400).json({ success: false, message: "Aucun contenu HTML reçu." });
    }

    console.log("HTML reçu, génération du PDF...");

    // Vérification du chemin Chromium
    const executablePath = await chromium.executablePath();

    if (!executablePath) {
      throw new Error("Chromium introuvable. Vérifie la version de @sparticuz/chromium installée.");
    }

    const browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    await browser.close();

    console.log("PDF généré avec succès !");

    res.json({
      success: true,
      message: "PDF généré avec succès",
      pdf_base64: pdfBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("Erreur lors de la génération du PDF :", err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));
