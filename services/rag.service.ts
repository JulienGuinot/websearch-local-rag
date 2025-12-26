import { extractTopics } from '../utils/stopwords';
import {
  Document,
  Chunk,
  SearchQuery,
  RAGResponse,
  RAGConfig
} from '../types/rag';
import { ExtractedContent } from '../types/webSearch';
import { VectorStore } from './vector.store';
import BaseContext from '../contexts/base-context';
import { config } from '../config/config';
import { normalizeText } from '../utils/rag.utils';

export class RAGService extends BaseContext {
  private readonly config: RAGConfig = config as RAGConfig

  async initialize(): Promise<void> {
    const isOllamaAvailable = await this.di.aiService.isAvailable();
    if (!isOllamaAvailable) {
      throw new Error('Ollama n\'est pas disponible. Vérifiez que le service est démarré.');
    }

    console.log(`RAG initialisé avec le modèle: ${this.di.aiService.modelName}`);
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
          console.log('ℹ️ Aucun document demandé via la recherche web (maxResults <= 0)');
        }
        return { documentsAdded: 0, executedQueries: [] };
      }

      console.log(`🔍 Recherche web pour: "${query}"`);

      let extractedContents: ExtractedContent[];
      let topicAnalysis: ReturnType<typeof extractTopics> | undefined;
      let executedQueries: string[] = [];

      extractedContents = await this.di.searchService.searchAndExtract(query, 'duckduckgo', maxResults);
      executedQueries = [query];

      console.log("addFromWebSearch - Recherche web terminée")

      const successfulContents = extractedContents
        .filter(content => content.success && content.content.length > 100)
        .slice(0, maxResults);

      if (successfulContents.length === 0) {
        throw new Error('Aucun contenu valide trouvé lors de la recherche web');
      }

      const documents = this._convertToDocuments(successfulContents);
      await this.addDocuments(documents);


      console.log(`✅ ${documents.length} documents ajoutés au RAG`);

      return {
        documentsAdded: documents.length,
        topicAnalysis,
        executedQueries
      };

    } catch (error: any) {
      throw new Error(`Erreur ajout contenu web: ${error.message}`);
    }
  }


  async addDocuments(documents: Document[]): Promise<void> {
    try {
      console.log("Debut du chunkage")
      const chunks = this.di.textChunker.chunkDocuments(documents);
      console.log("Chunkage terminé - extrait: ", chunks.length, "chunks")
      const contents = chunks.map(chunk => chunk.content);


      console.log("addDocs - Generation des embeddings")
      const embeddings = await this.di.aiService.generateEmbeddings(contents);
      console.log("Embeddings generes")

      // Ajout des embeddings aux chunks
      const chunksWithEmbeddings: Chunk[] = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index]
      }));

      await this.di.vectorStore.addChunks(chunksWithEmbeddings);

    } catch (error: any) {
      throw new Error(`Erreur ajout documents: ${error.message}`);
    }
  }


  async search(searchQuery: SearchQuery): Promise<RAGResponse> {
    try {
      const startTime = Date.now();
      const normalizedInput = normalizeText(searchQuery.query)
      const queryEmbedding = await this.di.aiService.generateEmbedding(normalizedInput);


      console.log("Embedding  de la requete effectué", queryEmbedding.length)

      // Recherche dans le vector store
      const topK = searchQuery.topK ?? this.config.retrieval.topK;
      const threshold = searchQuery.threshold ?? this.config.retrieval.threshold;

      let relevantChunks = await this.di.vectorStore.search(queryEmbedding, topK, threshold);

      // Recherche web additionnelle si demandée et pas assez de résultats
      if (searchQuery.includeWebSearch && relevantChunks.length < topK) {
        console.log("Enrichissement via recherche web")
        await this._enhanceWithWebSearch(searchQuery, topK - relevantChunks.length);
        console.log("Recherche web terminée, ajout au vector store")
        // Re-recherche après ajout du contenu web
        relevantChunks = await this.di.vectorStore.search(queryEmbedding, topK, threshold);
        console.log("Relevant chunks trouvées", relevantChunks.length)
      }

      if (relevantChunks.length === 0) {
        return {
          answer: "Je n'ai pas trouvé d'informations pertinentes pour répondre à votre question.",
          sources: [],
          query: searchQuery.query,
          timestamp: new Date()
        };
      }

      // Génération de la réponse
      const context = relevantChunks.map(chunk => chunk.content);
      const answer = await this.di.aiService.generateResponse(searchQuery.query, context);

      const response: RAGResponse = {
        answer,
        sources: relevantChunks.map(chunk => ({
          content: chunk.content,
          metadata: chunk.metadata,
          similarity: chunk.similarity
        })),
        query: searchQuery.query,
        timestamp: new Date()
      };

      const duration = Date.now() - startTime;
      console.log(`\n Recherche RAG terminée en ${duration}ms avec ${relevantChunks.length} sources`);

      return response;
    } catch (error: any) {
      throw new Error(`Erreur recherche RAG: ${error.message}`);
    }
  }


  private async _enhanceWithWebSearch(searchQuery: SearchQuery, additionalResults: number): Promise<void> {
    try {
      const webResults = searchQuery.webSearchResults ?? Math.min(additionalResults, 3);
      if (webResults <= 0) {
        return;
      }

      const result = await this.addFromWebSearch(searchQuery.query, webResults, true);

      if (result.topicAnalysis) {
        console.log(`📈 Analyse des sujets: ${result.topicAnalysis.stats.stopWordsRemoved} stop words supprimés`);
      }
      if (result.executedQueries.length > 0) {
        console.log(`🔁 Requêtes exécutées: ${result.executedQueries.join(' | ')}`);
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la recherche web additionnelle:', error);
    }
  }



  private _convertToDocuments(contents: ExtractedContent[]): Document[] {
    return contents.map((content, index) => ({
      id: `web_${Date.now()}_${index}`,
      content: content.content,
      metadata: {
        url: content.url,
        title: content.title,
        source: 'websearch' as const,
        timestamp: content.extractedAt
      }
    }));
  }


  async getStats(): Promise<{
    vectorStore: Awaited<ReturnType<VectorStore['getStats']>>;
    config: RAGConfig;
    ollama: {
      model: string;
      available: boolean;
    };
  }> {
    const [vectorStats, ollamaAvailable] = await Promise.all([
      this.di.vectorStore.getStats(),
      this.di.aiService.isAvailable()
    ]);

    return {
      vectorStore: vectorStats,
      config: this.config,
      ollama: {
        model: this.di.aiService.modelName,
        available: ollamaAvailable
      }
    };
  }


  async removeSource(source: string): Promise<void> {
    await this.di.vectorStore.removeBySource(source);
    console.log(`Supprimé le contenu de la source: ${source}`);
  }


  async clear(): Promise<void> {
    await this.di.vectorStore.clear();
  }

  async listAvailableModels(): Promise<string[]> {
    return await this.di.aiService.listModels();
  }



}