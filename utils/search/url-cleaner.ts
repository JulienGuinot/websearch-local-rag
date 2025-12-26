export function cleanUrl(url: string): string {
    try {
        // Gère les URLs de redirection DuckDuckGo
        if (url.includes('duckduckgo.com/l/?uddg=')) {
            const match = url.match(/uddg=([^&]+)/);
            if (match) {
                url = decodeURIComponent(match[1]);
            }
        }

        // Gère les URLs relatives
        if (url.startsWith('//')) {
            url = 'https:' + url;
        } else if (url.startsWith('/')) {
            return url; // URL relative, sera ignorée
        }

        // Supprime les paramètres de tracking courants
        const urlObj = new URL(url);
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

        trackingParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });

        return urlObj.toString();
    } catch (error) {
        console.warn(`Impossible de nettoyer l'URL: ${url}`, error);
        return url;
    }
}


export function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}



export function validateUrls(urls: string[]): void {
    if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('Le tableau d\'URLs ne peut pas être vide');
    }

    urls.forEach(url => {
        if (typeof url !== 'string') {
            throw new Error('Toutes les URLs doivent être des chaînes de caractères');
        }

        try {
            new URL(url);
        } catch {
            throw new Error(`URL invalide: ${url}`);
        }
    });
}