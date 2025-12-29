const OLLAMA_URL = "http://localhost:11434";
//const MODEL = "nomic-embed-text";
const MODEL = "all-minilm";
//const MODEL = "qwen3-embedding:0.6b";
//const MODEL = "paraphrase-multilingual:278m"

// Génère du texte artificiel
function generateText(size = 200): string {
  return "This is a benchmark document used to test embedding performance.I want to embeddings models".repeat(
    Math.ceil(size / 60)
  );
}

async function embedBatch(texts: string[]) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json: any = await res.json();
  return json.embeddings;
}

async function runBenchmark() {
  const BATCH_SIZES = [1, 8, 16, 32, 64];
  const TOTAL_TEXTS = 256;

  console.log("🧪 Ollama Embedding Benchmark");
  console.log(`Model: ${MODEL}`);
  console.log(`Total texts: ${TOTAL_TEXTS}`);
  console.log("----------------------------------");

  for (const batchSize of BATCH_SIZES) {
    const texts = Array.from({ length: TOTAL_TEXTS }, () => generateText());

    const start = performance.now();

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      await embedBatch(batch);
    }

    const end = performance.now();
    const duration = (end - start) / 1000;

    console.log(
      `Batch ${batchSize.toString().padEnd(2)} → ${duration.toFixed(
        2
      )}s | ${(TOTAL_TEXTS / duration).toFixed(1)} embeds/s`
    );
  }
}

runBenchmark().catch(console.error);
