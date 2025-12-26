# RAG (Retrieval-Augmented Generation) local 

Service RAG  avancé avec recherche web et ajout de documents.
Le contenu est transformé en sa représentation sémantique vectorielle (embeddings), puis stocké dans une matrice (VectorStore).
On compare ensuite l'embedding de la requete avec la matrice pour identifier les contenus les plus pertinents,
et ainsi enrichir la requête. 

La comparaison se fait par defaut en utilisant la similarité cosine, soit :
```Latex
similarité = sin(Angle entre les deux vecteurs)
--> retourne un score de similarité compris entre 0 et 1
```
Elle peut aussi se faire par similarité euclidienne ou par produit scalaire.
Cela est configurable depuis `config/config.ts`

## Vector store
Les emebeddings sont enregistrés dans le vectorStore (mémoire). Celui-ci est réinitialisé à la fermeture de programme (store non persistent).



## Installation

```bash
git clone https://github.com/JulienGuinot/Skepticism
```

ssurez-vous qu'Ollama est installé et en cours d'exécution :

```bash
# Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Démarrer le service
ollama serve

# Télécharger les modèles nécessaires
ollama pull qwen2.5:0.5b
ollama pull nomic-embed-text
```


Puis 

```bash
npm install
npm run dev
```

## Configuration

La configuration du rag se fait dans le fichier config/config.ts

```typescript
export const config: BaseConfig = {
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: process.env.MODEL || 'qwen2.5:0.5b',
        embeddingModel: 'nomic-embed-text',
        temperature: 0.7,
        maxTokens: 2048
    },
    vectorStore: {
        dimensions: 768,
        similarity: 'cosine'
    },
    chunking: {
        maxChunkSize: 500,
        overlap: 100
    },
    retrieval: {
        topK: 5,
        threshold: 0.7
    },
    webSearch: {
        searchEngine: "duckduckgo",
        maxResults: 10,
        timeout: 15000,
        retryAttempts: 1,
        retryDelay: 1000,
        minContentLength: 200,
        excludeDomains: ["youtube.com"],
        includeDomains: [],
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
```

## Utilisation

### CLI Interactif

```bash
npm run cli
```

### Commandes disponibles

- `search <query>` - Recherche avec analyse automatique et enrichissement web si nécessaire
- `add-web <query>` - Ajouter du contenu depuis le web avec analyse intelligente
- `add-file <path>` - Ajouter un fichier texte à la base
- `stats` - Afficher les statistiques de la base
- `clear` - Vider la base de connaissances
- `help` - Afficher l'aide
- `exit` - Quitter


### Serveur web
```bash
npm run dev #Développement 
npm run build 
npm start #Version build  
```


### Exemples d'utilisation

```
Skepticism> Comment fonctionne le machine learning avec des réseaux de neurones
🔍 Recherche intelligente: "comment fonctionne le machine learning avec des réseaux de neurones"
✓ Recherche dans la base existante...
✓ Base existante insuffisante, recherche web en cours...

📊 Analyse automatique:
  Sujets identifiés: machine, learning, réseaux, neurones
  Stop words supprimés: comment, fonctionne, le, avec, des, de
  Requête optimisée: "machine learning réseaux neurones"

✓ 8 nouveaux documents ajoutés
  Variantes utilisées: machine learning réseaux neurones | machine learning | réseaux neurones

✓ Recherche terminée!

┌─ RÉPONSE──────────────────────────────────────────────────────
│ Le machine learning avec des réseaux de neurones fonctionne en...
│ [Réponse détaillée basée sur le contenu enrichi]
└─────────────────────────────────────────────────────────────

📚 Sources:
  1 https://example.com/neural-networks-guide
  2 https://example.com/ml-fundamentals
```



## Limitations du Rag


La transformation du contenu ajouté en embeddings peut prendre un certain temps. c'est le principal goulot d'étranglement de ce système. On pourrait utiliser un odèle plus petit pour générer les embeddings, comme "miniailm", ou passer le texte de la recherche web / document directement, mais on perdrait le ranking des chunks, et la réponse finale pourrait être moins pertinente



## Architecture 


### Injection de dépendences avec Awilix
le RAG est orchéstré par la classe `services/rag.service.ts` la classe doit être instanciée avec un objet `{di}`, exporté depuis `services/di-container` qui expose les services et gère les états, pour éviter la multi-instanciation des classes et la perte des états

```typescript
export const di = {
    aiService: container.resolve<OllamaService>("aiService"),
    vectorStore: container.resolve<VectorStore>("vectorStore"),
    searchService: container.resolve<SearchService>("searchService"),
    textChunker: container.resolve<TextChunker>("textChunker")
}
```


puis, on initialise le RagService en lui passant l'objet `{di}`
```typescript
const ragService = new RAGService(di);
```
### Fonction "Factory" performSearch
Permet de changer le moteur de recherche utilisé par le RAG, en une seule ligne, depuis la config
```typescript
export async function performSearch(
    query: string,
    searchEngine: SearchEngine,
    config: WebSearchConfig,
    userAgent: string
): Promise<SearchResult[]> {

    switch (searchEngine) {
        case 'duckduckgo':
            return await searchDuckDuckGo(query, config, userAgent);
        case "bing":
            return await searchWithBing(query, config, userAgent)
        case "google":
            return await searchWithGoogle(query, config, userAgent)
        default:
            return await searchDuckDuckGo(query, config, userAgent);
    }
}
```




## Contribution 
Toutes les contributions sont les bienvenues !


## Licence
MIT