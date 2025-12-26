import { WebSearchConfig } from "../../types/webSearch";

export async function fetchWithRetry(
    url: string,
    config: WebSearchConfig,
): Promise<string> {
    let lastError: Error;
    const maxRetries = config.retryAttempts || 2; // Reduce from 3
    const timeout = config.timeout || 8000; // Reduce from 15000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                headers: { 'User-Agent': config.userAgent }, // Fix: use proper header name
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.text();
        } catch (err: any) {
            lastError = err;
            console.log(`⚠️ Retry ${attempt}/${maxRetries} for ${url.substring(0, 50)}...`);

            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, (config.retryDelay || 500) * attempt));
            }
        }
    }

    throw lastError!;
}
