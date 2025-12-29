#!/usr/bin/env node
import * as readline from "readline";

import {
  colors,
  colorize,
  success,
  info,
  highlight,
  showLoadingSpinner,
  stopSpinner,
} from "./utils/cli/cli.formatting";
import BaseContext from "./contexts/base-context";
import { RAGService } from "./services/rag.service";
import { di } from "./services/di-container";
import { displaySearchResult, showHelp } from "./utils/cli/cli.utils";

export class RAGCLI extends BaseContext {
  private ragService = new RAGService(this.di);
  private rl: readline.Interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  async start() {
    const spinner = showLoadingSpinner("Initialisation du service RAG...");
    await this.ragService.initialize();
    stopSpinner(spinner, "Service RAG initialisé avec succès!");
    showHelp();
    this.startInteractiveMode();
  }

  private startInteractiveMode() {
    const prompt = `${colorize("Skepticism", colors.bright + colors.magenta)}${colorize(">", colors.cyan)} `;
    this.rl.question(prompt, async (input) => {
      const [command, ...args] = input.trim().split(" ");

      switch (command.toLowerCase()) {
        case "search":
          await this.handleSearch(args.join(" "));
          break;
        case "add-web":
          await this.handleAddWeb(args.join(" "));
          break;
        case "add-file":
          await this.ragService.addFile(args.join(" "));
          break;

        case "add-folder":
          await this.ragService.addFolder(args.join(" "));
          break;
        case "stats":
          await this.handleStats();
          break;

        case "debug":
          await console.log(this.di.vectorStore.listChunks());
          break;
        case "clear":
          await this.handleClear();
          break;
        case "help":
          showHelp();
          break;
        case "exit":
          console.log(`\n${success("👋 Au revoir!")}`);
          this.rl.close();
          return;
        default:
          if (command) {
            await this.handleSearch(command + " " + args.join(" "));
          }
      }

      this.startInteractiveMode();
    });
  }

  private async handleSearch(query: string) {
    if (!query) {
      console.log(`✗ Veuillez fournir une requête de recherche.`);
      return;
    }

    let currentSpinner: NodeJS.Timeout | null = null;

    try {
      // Étape 1: Vérifier d'abord dans la base existante
      currentSpinner = showLoadingSpinner(
        "Recherche dans la base existante..."
      );

      const initialResult = await this.ragService.search({
        query,
        includeWebSearch: false, // Pas de recherche web pour le moment
      });

      let needsMoreContent = false;
      //initialResult.sources.length == 0||
      //initialResult.answer.includes("Je n'ai pas trouvé") ||
      //initialResult.answer.includes("IDK") ||
      //initialResult.answer.length < 5 ||
      if (initialResult.sources.length === 0) needsMoreContent = true;
      if (initialResult.answer.includes("IDK")) needsMoreContent = true;

      if (needsMoreContent) {
        stopSpinner(
          currentSpinner,
          "Base existante insuffisante, enrichissement nécessaire"
        );

        currentSpinner = showLoadingSpinner("Recherche web en cours...");

        const enrichment = await this.ragService.addFromWebSearch(
          query,
          8,
          true
        );

        stopSpinner(currentSpinner, "Enrichissement web terminé");
        currentSpinner = null;

        if (enrichment.topicAnalysis) {
          const { topics, removedWords, cleanedQuery } =
            enrichment.topicAnalysis;
          console.log(`\n${highlight("📊 Analyse automatique:")}`);
          console.log(`  ${info("Requête originale:")} "${query}"`);
          console.log(
            `  ${info("Requête retenue:")} "${cleanedQuery || query}"`
          );
          console.log(
            `  ${info("Sujets identifiés:")} ${topics.length > 0 ? topics.join(", ") : "—"}`
          );
          console.log(
            `  ${info("Stop words supprimés:")} ${removedWords.length > 0 ? removedWords.join(", ") : "—"}`
          );
        }

        if (enrichment.executedQueries.length > 0) {
          console.log(
            `  ${info("Requêtes exécutées:")} ${enrichment.executedQueries.join(" | ")}`
          );
        }

        console.log(
          `${success("✓")} ${enrichment.documentsAdded} nouveaux documents ajoutés`
        );

        // Nouvelle recherche avec le contenu enrichi
        currentSpinner = showLoadingSpinner(
          "Génération de la réponse finale..."
        );

        // Recherche finale (avec ou sans enrichissement)
        const finalResult = await this.ragService.search({
          query,
          includeWebSearch: false, // On a déjà enrichi si nécessaire
        });

        stopSpinner(currentSpinner, "Recherche terminée!");
        currentSpinner = null;
        displaySearchResult(finalResult);
      } else {
        // Pas besoin d'enrichissement, utiliser le résultat initial
        stopSpinner(currentSpinner, "Recherche terminée!");
        currentSpinner = null;
        displaySearchResult(initialResult);
      }
    } catch (error: any) {
      if (currentSpinner) {
        clearInterval(currentSpinner);
      }
      console.log(`\r ✗ Erreur lors de la recherche: ${error}`);
    }
  }

  private async handleAddWeb(query: string) {
    if (!query) {
      console.log(`✗ Veuillez fournir une requête de recherche web.`);
      return;
    }

    console.log(
      `\n${info("🌐 Ajout de contenu web intelligent:")} ${highlight('"' + query + '"')}`
    );
    const spinner = showLoadingSpinner("Analyse et recherche web...");

    try {
      const result = await this.ragService.addFromWebSearch(query, 8, true);
      stopSpinner(
        spinner,
        `${result.documentsAdded} documents ajoutés avec succès!`
      );

      if (result.topicAnalysis) {
        console.log(`\n${highlight("📊 Analyse des sujets:")}`);
        console.log(
          `  ${info("Sujets identifiés:")} ${result.topicAnalysis.topics.join(", ")}`
        );
        console.log(
          `  ${info("Stop words supprimés:")} ${result.topicAnalysis.removedWords.join(", ")}`
        );
        console.log(
          `  ${info("Requête optimisée:")} "${result.topicAnalysis.cleanedQuery}"`
        );
      }
      if (result.executedQueries.length > 0) {
        console.log(
          `  ${info("Requêtes exécutées:")} ${result.executedQueries.join(" | ")}`
        );
      }
      console.log("");
    } catch (error: any) {
      clearInterval(spinner);
      console.log(`\r ✗ Erreur lors de l'ajout: ${error}`);
    }
  }

  private async handleStats() {
    console.log("📊 Statistiques du RAG:");
    const stats = await this.di.vectorStore.getStats();

    console.log(`  Documents: ${stats.sources.length}`);
    console.log(`  Chunks: ${stats.totalChunks}`);
    console.log(`  Dimensions de la matrice: ${stats.dimensions}`);
    console.log("  Sources: ");

    stats.sources.forEach((source, index) => {
      console.log(`    ${index + 1}: ${source.source.substring(0, 80)}`);
    });
  }

  private async handleClear() {
    this.rl.question(
      "⚠️  Êtes-vous sûr de vouloir vider la base de connaissances? (oui/non): ",
      async (answer) => {
        if (answer.toLowerCase() === "oui" || answer.toLowerCase() === "o") {
          const stats = await this.di.vectorStore.getStats();
          const sources = stats.sources;
          await this.ragService.clear();
          sources.length <= 0
            ? console.log("Rien à supprimer")
            : console.log(`Suppression de ${sources.length} sources`);
        } else {
          console.log("❌ Opération annulée.\n");
        }
        this.startInteractiveMode();
      }
    );
    return;
  }
}

// Point d'entrée
async function main() {
  const cli = new RAGCLI(di);
  await cli.start();
}

// Gestion propre de l'arrêt
process.on("SIGINT", () => {
  console.log("\n👋 Au revoir!");
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}
