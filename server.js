const express = require("express");
const bodyParser = require("body-parser");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const app = express();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.text({ type: "*/*", limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Content-Type: ${req.headers["content-type"]}`);
  next();
});

app.post("/generate-pdf", async (req, res) => {
  try {
    const html = typeof req.body === "string" ? req.body : req.body.html;

    if (!html) {
      console.warn("Aucun HTML reçu dans la requête.");
      return res.status(400).json({ success: false, message: "Aucun contenu HTML reçu." });
    }

    console.log("HTML reçu, génération du PDF...");

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    console.log("PDF généré avec succès.");

    res.json({
      success: true,
      message: "PDF généré avec succès",
      pdf_base64: pdfBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("Erreur lors de la génération du PDF :", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));