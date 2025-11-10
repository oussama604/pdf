const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");

const app = express();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.text({ type: "*/*", limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Content-Type: ${req.headers["content-type"]}`);
  next();
});

app.post("/generate-pdf", async (req, res) => {
  try {
    let html = null;

    if (typeof req.body === "string") {
      html = req.body;
    } else if (Array.isArray(req.body) && req.body.length > 0 && typeof req.body[0]?.html === "string") {
      html = req.body[0].html;
    } else if (req.body && typeof req.body.html === "string") {
      html = req.body.html;
    }

    if (!html) {
      console.warn("Aucun HTML reçu dans la requête.");
      return res.status(400).json({ success: false, message: "Aucun contenu HTML reçu." });
    }

    console.log("HTML reçu, génération du PDF...");

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
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

app.get("/", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));
