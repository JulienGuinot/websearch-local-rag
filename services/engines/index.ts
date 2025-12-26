import { SearchEngine } from "../../types/rag";
import { SearchResult, WebSearchConfig } from "../../types/webSearch";
import { searchWithBing } from "./bing.engine";
import { searchDuckDuckGo } from "./ddg.engine";
import { searchWithGoogle } from "./google.engine";


export async function performSearch(
    query: string,
    searchEngine: SearchEngine,
    config: WebSearchConfig,
): Promise<SearchResult[]> {

    switch (searchEngine) {
        case 'duckduckgo':
            return await searchDuckDuckGo(query, config);
        case "bing":
            return await searchWithBing(query, config)
        case "google":
            return await searchWithGoogle(query, config)
        default:
            return await searchDuckDuckGo(query, config);
    }
}