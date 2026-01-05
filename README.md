# RAG local + Websearch

### Skepticism

Advanced RAG service with web search and document addition capabilities.
Content is transformed into its semantic vector representation (embeddings) and stored in a matrix (VectorStore).
The embedding of the query is then compared with the matrix to identify the most relevant content,
thus enriching the query.\
This project is not intended to replace more advanced LLMs (Perplexity, Anthropic, Mistral, etc.), but rather to understand how semantic representations work and obtain an offline assistant capable of reading files.

By default, comparison is done using the dot product:

```typescript
export function dotProduct(vec1: number[], vec2: number[]): number {
  return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
```

It can also be done using cosine or Euclidean similarity.\
This is configurable from `config/config.ts`

## Vector store

Embeddings are stored in the VectorStore (memory). It is reinitialized when the program closes (non-persistent store).
You could use a specialized database (Pinecone, Chromadb, etc.), but as you add more content,
retrieving sources in relation to a query could lose relevance. Storing in memory is a personal choice to maintain source relevance with each use and provide a more satisfying experience.

## Installation

```bash
git clone https://github.com/JulienGuinot/websearch-local-rag
```

Ensure that Ollama is installed and running:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start the service
ollama serve

# Download necessary models
ollama pull qwen2.5:0.5b
ollama pull nomic-embed-text
```

Then

```bash
npm install
npm run dev
```

## Configuration

RAG configuration is done in the config/config.ts file

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

## Usage

### Interactive CLI

```bash
# For global access (from any path)
npm link
skepticism

# Local access: confined to the folder containing the code
npm run cli
```

### Available Commands

- `search <query>` - Search with automatic analysis and web enrichment if necessary
- `add-web <query>` - Add content from the web with intelligent analysis
- `add-file <path>` - Add a text file to the database
- `add-folder <path>` - Add folder contents to the database
- `file:<file>` - Use a file from the database as reference
- `folder:<path>` - Use folder contents as reference
- `stats` - Display database statistics
- `clear` - Clear the knowledge base
- `help` - Display help
- `exit` - Exit

### Web Server

```bash
npm run dev # Development
npm run build
npm start # Build version
```

## CLI Usage Examples

### Example with a file

```
Skepticism> add-file smartcontract.rs
✓ Embeddings générés pour 29 chunks en 0.55s
Skepticism> what does the smartcontract do
Analysé smartcontract.rs
⠏ Recherche dans la base existante...
 Recherche RAG terminée en 4366ms avec 15 sources
✓ Recherche terminée!

┌─ RÉPONSE──────────────────────────────────────────────────
│
│ - SMART CONTRACT DEFINITION
│ ============================
│
│ The smart contract is a software application that executes
│ instructions in a decentralized and secure manner. In this case, the smart
│ contract is used to manage flash-loan flows between two
│ programs: Orca and Raydium.
│
│
│ ▶ LOAN FLOW
│ ───────────
│
│ The lending process works as follows:
│ 1. Context preparation: The client creates a flash-loan context by
│ providing information about the program to use (Orca or Raydium),
│ the amount of money to borrow, ranking parameters and
│ payment conditions.
│ 2. Loan execution: The smart contract executes the loan using
│ information provided in the previous step.
│
│
│ ▶ SMART CONTRACT EXECUTION
│ ──────────────────────────
│ The smart contract verifies execution conditions (for example, if the
│ program is authorized to be used) before proceeding.
│ It uses cpi_proxy_invoke instructions to call functions of the
│ target program (Orca or Raydium).
│ • It handles gains and losses in the case of a successful
│ transaction.
│
│ In summary, the smart contract is a secure solution for managing
│ loan flows between decentralized programs.
└─────────────────────────────────────────────────────────

📚 Sources:
  1 smartcontract.rs
```

### Example with a folder:

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
Skepticism> What does this projet do
Analysé inference.py
Analysé README.md
Analysé classifier.py
Analysé gpus_available.py
⠋ Recherche dans la base existante...
 Recherche RAG terminée en 5601ms avec 15 sources
✓ Recherche terminée!

┌─ RÉPONSE──────────────────────────────────────────────────
│ This project is a dog breed classifier based on deep learning. It uses a transfer learning approach with MobileNetV2 pre-trained
| on ImageNet to classify dog images into 120 breeds from the Stanford Dogs dataset. The project enables dog breed inference from an
| image by predicting the most probable class corresponding to the input image within the dataset.
└─────────────────────────────────────────────────────────

📚 Sources:
  1 inference.py
  2 README.md
  3 classifier.py
  4 gpus_available.py

```

## RAG Limitations

Transforming added content into embeddings can take some time. This is the main bottleneck of this system. You could use a smaller model to generate embeddings, such as "miniailm", or pass the web search text / document directly, but you would lose quality in chunk ranking, and the final answer could be less relevant.
The smaller the embedding model, the smaller the dimension of the output embeddings (number of vector components):

#### To get an idea:

```
miniailm -> 384 dimensions meaning a vector containing 384 elements
nomic-embed-text -> 768 dimensions meaning a vector containing 768 elements
```

## Contributing

All contributions are welcome!

## License

MIT
