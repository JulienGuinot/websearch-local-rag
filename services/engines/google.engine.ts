import { SearchResult, WebSearchConfig } from "../../types/webSearch";
import { fetchWithRetry } from "../../utils/search/fetcher";
import { cleanUrl } from "../../utils/search/url-cleaner";
import * as cheerio from "cheerio";



// Avertissement : Les sélécteurs de google changent régulièrement, cette méthod pourrait ne pas marcher
export async function searchWithGoogle(
    query: string,
    config: WebSearchConfig,
): Promise<SearchResult[]> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const response = await fetchWithRetry(searchUrl, config);
    const $ = cheerio.load(response);
    const results: SearchResult[] = [];

    $('div.g').each((index, element) => {
        const titleEl = $(element).find("h3");
        const linkEl = $(element).find('a').first();
        const snippetEl = $(element).find('div[style*="-webkit-line-clamp"], .VwiC3b, .y6099c');

        const title = titleEl.text().trim();
        const url = linkEl.attr('href');
        const snippet = snippetEl.text().trim();

        if (title && url && url.startsWith('http')) {
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