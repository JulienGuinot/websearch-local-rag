# RAG local + Websearch

### Skepticism

Service RAG avancé avec recherche web et ajout de documents.
Le contenu est transformé en sa représentation sémantique vectorielle (embeddings), puis stocké dans une matrice (VectorStore).
On compare ensuite l'embedding de la requete avec la matrice pour identifier les contenus les plus pertinents,
et ainsi enrichir la requête.\
Le projet n'a pas pour vocation de remplacer des LLM plus poussés et utilisés (Perplexity, Anthropic, Mistral etc), mais plutot de comprendre comment les représentations sémantiques fonctionnent, et d'obtenir un assistant hors-ligne capable de lire des fichiers.

La comparaison se fait par defaut en utilisant le produit scalaire, soit :

```typescript
export function dotProduct(vec1: number[], vec2: number[]): number {
  return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
}
```

Elle peut aussi se faire par similarité cosine ou euclidienne.\
Cela est configurable depuis `config/config.ts`

## Vector store

Les embeddings sont enregistrés dans le VectorStore (mémoire). Celui-ci est réinitialisé à la fermeture de programme (store non persistent).
On pourrait utiliser une base de données spécialisée (Pinecone, Chromadb, etc...) mais à mesure qu'on y ajouterait du contenu,
la récupération de sources par rapport à une requête pourrait perdre en pertinence. Stocker en mémoire est un choix personnel pour conserver une pertinence des sources à chaque utilisation, et offrir une expérience plus satisfaisante.

## Installation

```bash
git clone https://github.com/JulienGuinot/websearch-local-rag
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
        model:  'qwen2.5:0.5b',
        embeddingModel: 'nomic-embed-text',
        temperature: 0.7,
        maxTokens: 2048
    },
    vectorStore: {
        dimensions: 768,
        similarity: 'dot'
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
#Pour accès global (depuis n'importe quel path)
npm link
skepticism

#Accès local : confiné au dossier contenant le code
npm run cli
```

### Commandes disponibles

- `search <query>` - Recherche avec analyse automatique et enrichissement web si nécessaire
- `add-web <query>` - Ajouter du contenu depuis le web avec analyse intelligente
- `add-file <path>` - Ajouter un fichier texte à la base
- `add-folder <path>` - Ajouter les contenus d'un dossier à la base
- `file:<file>` - Utiliser un fichier de la base comme référence
- `folder:<path>` - Utiliser les contenus d'un dossier comme référence
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

## Exemples d'utilisation CLI

### Exemple avec un fichier

```
Skepticism> add-file smartcontract.rs
✓ Embeddings générés pour 29 chunks en 0.55s
Skepticism> que fais le smartcontract
Analysé smartcontract.rs
⠏ Recherche dans la base existante...
 Recherche RAG terminée en 4366ms avec 15 sources
✓ Recherche terminée!

┌─ RÉPONSE──────────────────────────────────────────────────
│
│ - DÉFINITION DU SMART CONTRACT
│ ==============================
│
│ Le smart contract est une application logicielle qui exécute des
│ instructions de manière décentralisée et sécurisée. Dans ce cas, le smart
│ contract est utilisé pour gérer les flux de prêt (flash-loan) entre deux
│ programmes : Orca et Raydium.
│
│
│ ▶ FLUX DE PRÊT
│ ──────────────
│
│ Le processus de prêt fonctionne comme suit :
│ 1.  Préparation du contexte : Le client crée un contexte de flash-loan en
│ fournissant des informations sur le programme à utiliser (Orca ou Raydium),
│ la quantité d'argent à emprunter, les paramètres de classement et les
│ conditions de paiement.
│ 2.  Exécution du prêt : Le smart contract exécute le prêt en utilisant les
│ informations fournies dans l'étape précédente.
│
│
│ ▶ EXÉCUTION DU SMART CONTRACT
│ ─────────────────────────────
│    Le smart contract vérifie les conditions d'exécution (par exemple, si le
│ programme est autorisé à être utilisé) avant de procéder.
│    Il utilise des instructions cpi_proxy_invoke pour appeler les functions du
│ programme cible (Orca ou Raydium).
│ •   Il traite les gains et les pertes dans le cas d'une transaction
│ réussie.
│
│ En résumé, le smart contract est une solution sécurisée pour gérer les flux
│ de prêt entre des programmes décentralisés.
└─────────────────────────────────────────────────────────

📚 Sources:
  1 smartcontract.rs
```

### Exemple avec un dossier:

```
Skepticism> add-folder dogs
⏭️  Dossier ignoré: .git
✓ Embeddings générés pour 7 chunks en 0.37s
✓ Embeddings générés pour 1 chunks en 0.02s
✓ Embeddings générés pour 5 chunks en 0.06s
✓ Embeddings générés pour 5 chunks en 0.05s
✓ Embeddings générés pour 1 chunks en 0.02s
⏭️  Dossier ignoré: venv
⏭️  Dossier ignoré: __pycache__
Skepticism> Que fais ce projet
Analysé inference.py
Analysé README.md
Analysé classifier.py
Analysé gpus_available.py
⠋ Recherche dans la base existante...
 Recherche RAG terminée en 5601ms avec 15 sources
✓ Recherche terminée!

┌─ RÉPONSE──────────────────────────────────────────────────
│ Ce projet est un classificateur de races de chiens basé sur le deep
│ learning. Il utilise une approche de transfer learning avec MobileNetV2
│ pré-entraîné sur ImageNet pour classifier les images de chiens parmi 120
│ races du dataset Stanford Dogs. Le projet permet d'inférer la race d'un
│ chien à partir d'une image, en prédissant la classe la plus probable de
│ l'image dans le dataset.
└─────────────────────────────────────────────────────────

📚 Sources:
  1 inference.py
  2 README.md
  3 classifier.py
  4 gpus_available.py
Skepticism>
```

## Limitations du Rag

La transformation du contenu ajouté en embeddings peut prendre un certain temps. c'est le principal goulot d'étranglement de ce système. On pourrait utiliser un modèle plus petit pour générer les embeddings, comme "miniailm", ou passer le texte de la recherche web / document directement, mais on perdrait en qualité sur le ranking des chunks, et la réponse finale pourrait être moins pertinente.
Plus le modèle d'embedding est petit, plus la dimension des embeddings (nombre de composants d'un vecteur) de sortie est petite :

#### Pour se rendre compte :

```
miniailm -> 384 dimensions soit un vecteur contenant 384 éléments
nomic-embed-text -> 768 dimensions soit un vecteur comprenant 768 éléments
```

## Architecture

### Injection de dépendences avec Awilix

le RAG est orchéstré par la classe `services/rag.service.ts` la classe doit être instanciée avec un objet `{di}`, exporté depuis `services/di-container` qui expose les services et gère les états, pour éviter la multi-instanciation des classes et la perte des états

```typescript
export const di = {
  aiService: container.resolve<OllamaService>("aiService"),
  vectorStore: container.resolve<VectorStore>("vectorStore"),
  searchService: container.resolve<SearchService>("searchService"),
  textChunker: container.resolve<TextChunker>("textChunker"),
};
```

puis, on initialise le RagService en lui passant l'objet `{di}`

```typescript
const ragService = new RAGService(di);
```

### Fonction "Factory" performSearch

Permet de changer le moteur de recherche utilisé par le RAG, en une seule ligne, depuis la config

- A noter que Google ne ne fonctionne jamais durablement (les sélécteurs html/css changent régulièrement)

```typescript
export async function performSearch(
  query: string,
  searchEngine: SearchEngine,
  config: WebSearchConfig,
  userAgent: string
): Promise<SearchResult[]> {
  switch (searchEngine) {
    case "duckduckgo":
      return await searchDuckDuckGo(query, config, userAgent);
    case "bing":
      return await searchWithBing(query, config, userAgent);
    case "google":
      return await searchWithGoogle(query, config, userAgent);
    default:
      return await searchDuckDuckGo(query, config, userAgent);
  }
}
```

## Contribution

Toutes les contributions sont les bienvenues !

## Licence

MIT
