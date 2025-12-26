import { WebSearchConfig, ExtractedContent } from "../types/webSearch";
import { SearchEngine } from "../types/rag";
import { extractContents } from '../utils/search/html-extractor';
import { filterResults } from "../utils/search/url-filter";
import { validateQuery } from "../utils/rag.utils";
import { performSearch } from "./engines";
import { config } from "../config/config";


export class WebSearchService {
  private readonly _config: Required<WebSearchConfig> = config.webSearch

  async getTopUrls(
    query: string,
    searchEngine: SearchEngine = config.webSearch.searchEngine,
    limit?: number
  ): Promise<string[]> {
    try {
      validateQuery(query);

      const searchResults = await performSearch(
        query,
        searchEngine,
        this._config,
      );
      const filteredResults = filterResults(searchResults, this._config);

      const effectiveLimit = limit ?? this._config.maxResults;

      return filteredResults
        .slice(0, effectiveLimit)
        .map(result => result.url);

    } catch (error: any) {
      throw new Error(`Erreur lors de la recherche: ${error.message}`);
    }
  }




  async searchAndExtract(
    query: string,
    searchEngine: SearchEngine = 'duckduckgo',
    limit?: number
  ): Promise<ExtractedContent[]> {
    try {
      const urls = await this.getTopUrls(query, searchEngine, limit);
      console.log(`Trouvé ${urls.length} resultats`, urls)
      return await extractContents(urls, this._config);
    } catch (error: any) {
      throw new Error(`Erreur lors de la recherche et extraction: ${error.message}`);
    }
  }
}