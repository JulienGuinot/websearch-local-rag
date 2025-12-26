import { SearchResult, WebSearchConfig } from "../../types/webSearch";
import { extractDomain } from "./url-cleaner";

export function filterResults(results: SearchResult[], config: WebSearchConfig): SearchResult[] {
    return results.filter(result => {
        const domain = extractDomain(result.url);

        if (config.excludeDomains?.some(excluded => domain.includes(excluded))) {
            return false;
        }

        if (config.includeDomains?.length && config.includeDomains.length > 0) {
            return config.includeDomains.some(included => domain.includes(included));
        }

        return true;
    });
}