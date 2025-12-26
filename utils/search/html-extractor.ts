import * as cheerio from "cheerio";
import { ExtractedContent, WebSearchConfig } from "../../types/webSearch";
import { validateUrls } from "./url-cleaner";
import { fetchWithRetry } from "./fetcher";
import { config } from "process";




export async function extractSingleContent(url: string, config: WebSearchConfig): Promise<ExtractedContent> {
    console.log("En train d'extraire le contenu de ", url, "...")
    const html = await fetchWithRetry(url, config)

    const { content, headings } = extractMainContent(
        html,
        config.minContentLength ?? 200
    );

    console.log(url, " - Contenu extrait")

    return {
        url,
        title: '',
        content,
        headings,
        links: [],
        metadata: {},
        extractedAt: new Date(),
        success: content.length >= config.minContentLength!

    }
}




export async function extractContents(urls: string[], config: WebSearchConfig): Promise<ExtractedContent[]> {
    try {
        validateUrls(urls);

        const results = await Promise.allSettled(
            urls.map(url =>
                extractSingleContent(url, config)
            )
        )

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                // Log the failure!
                console.error(`❌ Extraction failed for ${urls[index]}:`, result.reason?.message || 'Unknown error');

                return {
                    url: urls[index],
                    title: '',
                    content: '',
                    headings: [],
                    links: [],
                    metadata: {},
                    extractedAt: new Date(),
                    success: false,
                    error: result.reason?.message || 'Erreur inconnue'
                };
            }
        });

    } catch (error: any) {
        throw new Error(`Erreur lors de l'extraction du contenu: ${error.message}`);
    }
}




export function extractMainContent(
    html: string,
    minLength: number
): { content: string; headings: string[] } {
    const $ = cheerio.load(html);

    $('script, style, nav, footer').remove();

    const selectors = ['article', 'main', '.content'];

    for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().length >= minLength) {
            return {
                content: normalize(el.text()),
                headings: extractHeadings($)
            };
        }
    }

    return {
        content: normalize($('body').text()),
        headings: extractHeadings($)
    };
}

function extractHeadings($: cheerio.CheerioAPI): string[] {
    return $('h1,h2,h3').map((_, el) => $(el).text().trim()).get();
}

function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}



export function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];

    $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
            try {
                const absoluteUrl = new URL(href, baseUrl).toString();
                if (absoluteUrl.startsWith('http') && !links.includes(absoluteUrl)) {
                    links.push(absoluteUrl);
                }
            } catch {
                // URL invalide, ignorée
            }
        }
    });

    return links.slice(0, 50); // Limite à 50 liens
}
