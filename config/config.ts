import { ChunkingConfig } from "../services/chunker.service";
import { OllamaConfig, VectorStoreConfig } from "../types/rag";
import { WebSearchConfig } from "../types/webSearch";

export const config: BaseConfig = {
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: process.env.MODEL || 'qwen2.5:0.5b',
        embeddingModel: 'nomic-embed-text',
        temperature: 0.7,
        maxTokens: 2048
    },
    vectorStore: {
        dimensions: 768,
        similarity: 'cosine'
    },
    chunking: {
        maxChunkSize: 500,
        overlap: 100
    },
    retrieval: {
        topK: 5,
        threshold: 0.7
    },
    webSearch: {
        searchEngine: "duckduckgo",
        maxResults: 10,
        timeout: 15000,
        retryAttempts: 1,
        retryDelay: 1000,
        minContentLength: 200,
        excludeDomains: ["youtube.com"],
        includeDomains: [],
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

};

export interface BaseConfig {
    ollama: OllamaConfig,
    vectorStore: VectorStoreConfig,
    chunking: ChunkingConfig,
    retrieval: {
        topK: number,
        threshold: number
    },
    webSearch: WebSearchConfig
}