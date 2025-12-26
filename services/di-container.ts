import { createContainer, asClass, InjectionMode } from "awilix"
import { OllamaService } from "./ollama.service"
import { VectorStore } from "./vector.store"
import { WebSearchService } from "./websearch.service"
import { TextChunkerService } from "./chunker.service"

export const container = createContainer({
    injectionMode: InjectionMode.PROXY,
})


container.register({
    aiService: asClass(OllamaService).singleton(),
    searchService: asClass(WebSearchService).singleton(),
    textChunker: asClass(TextChunkerService).singleton(),

    vectorStore: asClass(VectorStore).singleton()
})


export const di = {
    aiService: container.resolve<OllamaService>("aiService"),
    searchService: container.resolve<WebSearchService>("searchService"),
    textChunker: container.resolve<TextChunkerService>("textChunker"),

    vectorStore: container.resolve<VectorStore>("vectorStore")
}
