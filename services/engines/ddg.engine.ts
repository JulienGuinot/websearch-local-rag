import { SearchResult, WebSearchConfig } from "../../types/webSearch";
import { fetchWithRetry } from "../../utils/search/fetcher";
import { cleanUrl } from "../../utils/search/url-cleaner";
import * as cheerio from "cheerio";


export async function searchDuckDuckGo(
    query: string,
    config: WebSearchConfig,
): Promise<SearchResult[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetchWithRetry(searchUrl, config);
    const $ = cheerio.load(response);
    const results: SearchResult[] = [];

    $('.result__body').each((index, element) => {
        const titleEl = $(element).find('.result__title a');
        const snippetEl = $(element).find('.result__snippet');

        const title = titleEl.text().trim();
        const url = titleEl.attr('href');
        const snippet = snippetEl.text().trim();

        if (title && url && snippet) {
            results.push({
                title,
                url: cleanUrl(url),
                snippet,
                rank: index + 1
            });
        }
    });

    return results;
}