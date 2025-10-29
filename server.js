const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));

// Route de santé pour vérifier que le service fonctionne
app.get('/', (req, res) => {
  res.json({ 
    status: 'Service de conversion HTML vers PDF actif',
    endpoint: 'POST /convert-to-pdf'
  });
});

// Route principale de conversion
app.post('/convert-to-pdf', async (req, res) => {
  let browser;
  
  try {
    console.log('Réception de la requête...');
    
    // Validation des données reçues
    if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ 
        error: 'Format invalide. Attendu: tableau JSON avec propriété "html"' 
      });
    }

    const htmlContent = req.body[0].html;
    
    if (!htmlContent) {
      return res.status(400).json({ 
        error: 'Propriété "html" manquante dans le JSON' 
      });
    }

    console.log('Lancement de Puppeteer...');
    
    // Configuration pour Render (environnement Linux)
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    console.log('Chargement du contenu HTML...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Génération du PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    browser = null;

    console.log('PDF généré avec succès');

    // Envoi du PDF en réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resultat.pdf');
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Erreur lors de la conversion:', err);
    
    if (browser) {
      await browser.close();
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la génération du PDF',
      details: err.message 
    });
  }
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// Démarrage du serveur sur le port fourni par Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});
