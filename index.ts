import express from "express";
import { RAGService } from "./services/rag.service";
import { di } from "./services/di-container";

const app = express();
app.use(express.json());

// Initialisation du service RAG
const ragService = new RAGService(di);

// Middleware d'initialisation
app.use(async (req, res, next) => {
  try {
    if (!ragService) {
      throw new Error("Service RAG non initialisé");
    }
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/search", async (req, res) => {
  console.log("Requete recue", req.body.query!);
  try {
    const { query, topK, threshold, includeWebSearch, webSearchResults } =
      req.body;

    if (!query) {
      return res.status(400).json({ error: "Query est requis" });
    }

    const searchQuery = {
      query,
      topK,
      threshold,
      includeWebSearch,
      webSearchResults,
    };

    const response = await ragService.search(searchQuery);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/add-web-content", async (req, res) => {
  try {
    const { query, maxResults = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query est requis" });
    }

    await ragService.addFromWebSearch(query, maxResults);
    res.json({ message: `Contenu ajouté depuis la recherche: "${query}"` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/add-document", async (req, res) => {
  try {
    const { content, title, source = "manual" } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content est requis" });
    }

    const document = {
      id: `manual_${Date.now()}`,
      content,
      metadata: {
        title,
        source: source as "manual",
        timestamp: new Date(),
      },
    };

    await ragService.addDocuments([document]);
    res.json({ message: "Document ajouté avec succès" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const stats = await di.vectorStore.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/source/:source", async (req, res) => {
  try {
    const { source } = req.params;
    await ragService.removeSource(decodeURIComponent(source));
    res.json({ message: `Source supprimée: ${source}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/clear", async (req, res) => {
  try {
    await ragService.clear();
    res.json({ message: "RAG vidé complètement" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/models", async (req, res) => {
  try {
    const models = await ragService.listAvailableModels();
    res.json({ models });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    const stats = await di.vectorStore.getStats();
    res.json({
      status: "healthy",
      chunks: stats.totalChunks,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

const PORT = 3000;

async function startServer() {
  try {
    console.log("Initialisation du service RAG...");
    await ragService.initialize();

    app.listen(PORT, () => {
      console.log(`🚀 Serveur RAG démarré sur le port ${PORT}`);
      console.log(`📚 API disponible sur http://localhost:${PORT}`);
      console.log(`🔍 Recherche: POST /search`);
      console.log(`📄 Stats: GET /stats`);
      console.log(`❤️  Santé: GET /health`);
    });
  } catch (error: any) {
    console.error("Erreur lors du démarrage:", error.message);
    process.exit(1);
  }
}

startServer();
