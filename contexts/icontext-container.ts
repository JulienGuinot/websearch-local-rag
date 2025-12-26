import { TextChunkerService } from "../services/chunker.service";
import { OllamaService } from "../services/ollama.service";
import { VectorStore } from "../services/vector.store";
import { WebSearchService } from "../services/websearch.service";

export default interface IContextContainer {
    //services
    aiService: OllamaService,
    searchService: WebSearchService,
    textChunker: TextChunkerService,

    //store
    vectorStore: VectorStore,

}