
import { config } from '../config/config';
import { Chunk, OllamaConfig } from '../types/rag';
    
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export class OllamaService {
    private readonly config: OllamaConfig = config.ollama
    private conversationHistory: Message[] = []; // Stocke l'historique


    async generateEmbedding(text: string): Promise<number[]> {
        try {
            await this._ensureModelExists();

            const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.config.embeddingModel,
                    prompt: text.trim()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ollama embedding error:', errorText);
                throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data: any = await response.json();

            if (!data.embedding || !Array.isArray(data.embedding)) {
                throw new Error('Format de réponse embedding invalide');
            }

            return data.embedding;
        } catch (error: any) {
            throw new Error(`Erreur génération embedding: ${error.message}`);
        }
    }


    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const startTime = performance.now();

        try {
            const response = await fetch(`${this.config.baseUrl}/api/embed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.config.embeddingModel,
                    input: texts.map(t => t.trim())
                })
            });



            if (!response.ok) {
                const data = await response.json()
                throw new Error(`Ollama API error: ${response.status} ${data}`);
            }

            const data: any = await response.json();

            if (!data.embeddings || !Array.isArray(data.embeddings)) {
                throw new Error('Format de réponse embeddings invalide');
            }

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.log(`✓ Embeddings générés pour ${texts.length} texte(s) en ${duration}s`);

            return data.embeddings;

        } catch (error: any) {
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.error(`✗ Erreur après ${duration}s`);
            throw new Error(`Erreur génération embeddings: ${error.message}`);
        }
    }




// Ajoute un paramètre optionnel pour l'historique
async generateResponse(
    query: string,
    context: Chunk[],
): Promise<string> {
    const systemPrompt = this._buildSystemPrompt();
    const contextPrompt = this._buildUserPrompt(query, context);

    const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory.slice(0,10),  
        { role: 'user', content: contextPrompt + `\n\nQuestion: ${query}` }
    ];

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: this.config.model,
            messages,
            stream: false,
            options: {
                temperature: this.config.temperature,
                num_predict: this.config.maxTokens,
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ollama chat error: ${response.status} - ${err}`);
    }

    const data:any = await response.json();

    this.conversationHistory.push(
        {role:"user", content:query},
        {role:"assistant", content:query}
    )
    return data.message.content.trim();
}


    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }


    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data: any = await response.json();
            return data.models?.map((model: any) => model.name) || [];
        } catch (error: any) {
            throw new Error(`Erreur liste modèles: ${error.message}`);
        }
    }

 
    private async _ensureModelExists(): Promise<void> {
        try {
            const models = await this.listModels();
            const embeddingModelExists = models.some(model =>
                model === this.config.embeddingModel || model.startsWith(this.config.embeddingModel + ':')
            );

            if (!embeddingModelExists) {
                throw new Error(`Modèle d'embedding '${this.config.embeddingModel}' non installé. Installez-le avec: ollama pull ${this.config.embeddingModel}`);
            }
        } catch (error: any) {
            if (error.message.includes('non installé')) {
                throw error;
            }
            console.warn('Impossible de vérifier les modèles:', error.message);
        }
    }


    private _buildSystemPrompt(): string {
        return `Tu es un assistant IA spécialisé en recherche et analyse d'informations.
                Ton rôle est de répondre aux questions en utilisant exclusivement les informations fournies dans le contexte.

                Instructions :
                - Base tes réponses uniquement sur le contexte fourni
                - Si l'information n'est pas dans le contexte, indique-le clairement
                - Sois précis et concis, réponds toujours dans la langue de la question
                - Pas de salutations ni de formules de politesse — réponse directe uniquement
                - Structure ta réponse clairement en Markdown
                - Si le contexte est insuffisant ou si tu ne sais pas, réponds simplement "IDK"`.trim();
    }

    private _buildUserPrompt(query: string, context: Chunk[]): string {
        const contextText = context
            .map((chunk, index) => `[Source ${chunk.metadata.title} ${index + 1}]\n${chunk.content}`)
            .join('\n\n---\n\n');

        return `Contexte:
        ${contextText}
        Question: ${query}`;
    }


    clearHistory() : void {
        this.conversationHistory = []
    }

}