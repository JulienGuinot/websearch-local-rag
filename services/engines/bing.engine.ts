import { SearchResult, WebSearchConfig } from "../../types/webSearch";
import { fetchWithRetry } from "../../utils/search/fetcher";
import { cleanUrl } from "../../utils/search/url-cleaner";
import * as cheerio from "cheerio";

export async function searchWithBing(
    query: string,
    config: WebSearchConfig,
): Promise<SearchResult[]> {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    // Note: Bing est plus sensible au User-Agent que DuckDuckGo. 
    // Assurez-vous d'utiliser un User-Agent de navigateur récent dans config.ts.
    const response = await fetchWithRetry(searchUrl, config);
    const $ = cheerio.load(response);
    const results: SearchResult[] = [];

    $('.b_algo').each((index, element) => {
        const titleEl = $(element).find('h2 a');
        const snippetEl = $(element).find('.b_caption p, .b_lineclamp2, .b_algoSlug');

        const title = titleEl.text().trim();
        const url = titleEl.attr('href');
        const snippet = snippetEl.first().text().trim();

        if (title && url) {
            results.push({
                title,
                url: cleanUrl(url),
                snippet: snippet || "",
                rank: index + 1
            });
        }
    });

    return results;
}