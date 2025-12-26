
export function normalizeText(text: string): string {
    return text
        .toLowerCase()                    // Casse uniforme
        .normalize('NFD')                 // Décompose les accents
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/[^\w\s]/g, ' ')        // Remplace ponctuation par espaces
        .replace(/\s+/g, ' ')            // Normalise les espaces
        .trim();
}


export function validateQuery(query: string): void {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('La requête de recherche ne peut pas être vide');
    }

    if (query.trim().length < 2) {
        throw new Error('La requête de recherche doit contenir au moins 2 caractères');
    }
}