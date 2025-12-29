import { extractTopics } from "../utils/stopwords";
import { Document, Chunk, SearchQuery, RAGResponse } from "../types/rag";
import { ExtractedContent } from "../types/webSearch";
import BaseContext from "../contexts/base-context";
import { config } from "../config/config";
import {
  convertToDocuments,
  getFileNames,
  normalizeText,
} from "../utils/rag.utils";
import fs from "fs/promises";
import path from "path";
import { IGNORED_DIRS, SUPPORTED_EXTENSIONS } from "../config/files";

export class RAGService extends BaseContext {
  async initialize(): Promise<void> {
    const isOllamaAvailable = await this.di.aiService.isAvailable();
    const cwd = process.cwd();
    await this.addFolder(cwd);

    if (!isOllamaAvailable) {
      throw new Error(
        "Ollama n'est pas disponible. Vérifiez que le service est démarré."
      );
    }

    console.log(`RAG initialisé avec le modèle: ${config.ollama.model}`);
  }

  async addFromWebSearch(
    query: string,
    maxResults: number = 5,
    silent: boolean = false
  ): Promise<{
    documentsAdded: number;
    topicAnalysis?: ReturnType<typeof extractTopics>;
    executedQueries: string[];
  }> {
    try {
      if (maxResults <= 0) {
        if (!silent) {
          console.log(
            "ℹ️ Aucun document demandé via la recherche web (maxResults <= 0)"
          );
        }
        return { documentsAdded: 0, executedQueries: [] };
      }

      console.log(`🔍 Recherche web pour: "${query}"`);

      let extractedContents: ExtractedContent[];
      let topicAnalysis: ReturnType<typeof extractTopics> | undefined;
      let executedQueries: string[] = [];

      extractedContents = await this.di.searchService.searchAndExtract(
        query,
        "duckduckgo",
        maxResults
      );
      executedQueries = [query];

      console.log("addFromWebSearch - Recherche web terminée");

      const successfulContents = extractedContents
        .filter((content) => content.success && content.content.length > 100)
        .slice(0, maxResults);

      if (successfulContents.length === 0) {
        throw new Error("Aucun contenu valide trouvé lors de la recherche web");
      }

      const documents = convertToDocuments(successfulContents);
      await this.addDocuments(documents);

      console.log(`✅ ${documents.length} documents ajoutés au RAG`);

      return {
        documentsAdded: documents.length,
        topicAnalysis,
        executedQueries,
      };
    } catch (error: any) {
      throw new Error(`Erreur ajout contenu web: ${error.message}`);
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    try {
      const chunks = this.di.textChunker.chunkDocuments(documents);
      const contents = chunks.map((chunk) => chunk.content);
      const embeddings = await this.di.aiService.generateEmbeddings(contents);

      // Ajout des embeddings aux chunks
      const chunksWithEmbeddings: Chunk[] = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
      }));

      await this.di.vectorStore.addChunks(chunksWithEmbeddings);
    } catch (error: any) {
      throw new Error(`Erreur ajout documents: ${error.message}`);
    }
  }

  async search(searchQuery: SearchQuery): Promise<RAGResponse> {
    try {
      let relevantChunks = [];

      const startTime = Date.now();
      const normalizedInput = normalizeText(searchQuery.query);
      const queryEmbedding =
        await this.di.aiService.generateEmbedding(normalizedInput);

      // Recherche dans le vector store
      const topK = searchQuery.topK ?? config.retrieval.topK;
      const threshold = searchQuery.threshold ?? config.retrieval.threshold;
      const requestedFileNames = await getFileNames(searchQuery.query);

      // On check dans VectorStore

      if (requestedFileNames.length > 0) {
        relevantChunks = this.di.vectorStore
          .listChunks()
          .filter((chunk) =>
            requestedFileNames.includes(chunk.metadata.title!)
          );
      } else {
        relevantChunks = await this.di.vectorStore.search(
          queryEmbedding,
          topK,
          threshold
        );
      }

      relevantChunks.forEach((chunk) => {
        console.log(`Analysé ${chunk.metadata.title ?? chunk.metadata.url}`);
      });

      // Recherche web additionnelle si demandée et pas assez de résultats
      if (
        searchQuery.includeWebSearch &&
        relevantChunks.length < topK &&
        requestedFileNames.length == 0
      ) {
        console.log("Enrichissement via recherche web");
        await this._enhanceWithWebSearch(
          searchQuery,
          topK - relevantChunks.length
        );
        console.log("Recherche web terminée, ajout au vector store");
        // Re-recherche après ajout du contenu web
        relevantChunks = await this.di.vectorStore.search(
          queryEmbedding,
          topK,
          threshold
        );
        console.log("Relevant chunks trouvées", relevantChunks.length);
      }

      if (relevantChunks.length === 0) {
        return {
          answer:
            "Je n'ai pas trouvé d'informations pertinentes pour répondre à votre question.",
          sources: [],
          query: searchQuery.query,
          timestamp: new Date(),
        };
      }

      const context = relevantChunks;
      const answer = await this.di.aiService.generateResponse(
        searchQuery.query,
        context
      );

      const response: RAGResponse = {
        answer,
        sources: relevantChunks.map((chunk) => ({
          content: chunk.content,
          metadata: chunk.metadata,
          similarity: chunk.similarity ?? 1,
        })),
        query: searchQuery.query,
        timestamp: new Date(),
      };

      const duration = Date.now() - startTime;
      console.log(
        `\n Recherche RAG terminée en ${duration}ms avec ${relevantChunks.length} sources`
      );

      return response;
    } catch (error: any) {
      throw new Error(`Erreur recherche RAG: ${error.message}`);
    }
  }

  private async _enhanceWithWebSearch(
    searchQuery: SearchQuery,
    additionalResults: number
  ): Promise<void> {
    const webResults =
      searchQuery.webSearchResults ?? Math.min(additionalResults, 3);
    if (webResults == 0) {
      return;
    }
    await this.addFromWebSearch(searchQuery.query, webResults, true);
  }

  async addFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        console.log(`⏭️  Ignoré (pas un fichier): ${filePath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        console.log(`⏭️  Ignoré (extension non supportée): ${filePath}`);
        return;
      }

      const content = await fs.readFile(filePath, "utf-8");

      if (content.trim().length === 0) {
        return;
      }

      const fileName = path.basename(filePath);
      await this.addDocuments([
        {
          id: `file_${Date.now()}_${fileName}`,
          content,
          metadata: {
            title: fileName,
            source: "upload",
            timestamp: new Date(),
            url: fileName,
          },
        },
      ]);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log(`❌ Fichier introuvable: ${filePath}`);
      } else if (error.code === "EACCES") {
        console.log(`❌ Permission refusée: ${filePath}`);
      } else {
        console.error(`❌ Erreur (${filePath}): ${error.message}`);
      }
    }
  }

  async addFolder(
    folderPath: string,
    recursive: boolean = true
  ): Promise<{ added: number; skipped: number; errors: number }> {
    const stats = { added: 0, skipped: 0, errors: 0 };

    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
          // Ignore les dossiers système/build
          if (IGNORED_DIRS.includes(entry.name)) {
            console.log(`⏭️  Dossier ignoré: ${entry.name}`);
            continue;
          }

          // Récursion si activée
          if (recursive) {
            const subStats = await this.addFolder(fullPath, recursive);
            stats.added += subStats.added;
            stats.skipped += subStats.skipped;
            stats.errors += subStats.errors;
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();

          if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            stats.skipped++;
            continue;
          }

          try {
            await this.addFile(fullPath);
            stats.added++;
          } catch {
            stats.errors++;
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Erreur dossier (${folderPath}): ${error.message}`);
      stats.errors++;
    }

    return stats;
  }

  async removeSource(source: string): Promise<void> {
    await this.di.vectorStore.removeBySource(source);
    console.log(`Supprimé le contenu de la source: ${source}`);
  }

  async clear(): Promise<void> {
    await this.di.vectorStore.clear();
    this.di.aiService.clearHistory();
  }

  async listAvailableModels(): Promise<string[]> {
    return await this.di.aiService.listModels();
  }
}
