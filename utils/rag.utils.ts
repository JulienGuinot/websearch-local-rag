import { ExtractedContent } from "../types/webSearch";
import { Document } from "../types/rag";
import fs from "fs/promises";

export function normalizeText(text: string): string {
  return text
    .toLowerCase() // Casse uniforme
    .normalize("NFD") // Décompose les accents
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^\w\s]/g, " ") // Remplace ponctuation par espaces
    .replace(/\s+/g, " ") // Normalise les espaces
    .trim();
}

export function validateQuery(query: string): void {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("La requête de recherche ne peut pas être vide");
  }

  if (query.trim().length < 2) {
    throw new Error(
      "La requête de recherche doit contenir au moins 2 caractères"
    );
  }
}

export function convertToDocuments(contents: ExtractedContent[]): Document[] {
  return contents.map((content, index) => ({
    id: `web_${Date.now()}_${index}`,
    content: content.content,
    metadata: {
      url: content.url,
      title: content.title,
      source: "websearch" as const,
      timestamp: content.extractedAt,
    },
  }));
}

export async function getFileNames(query: string) {
  const folderRefRegex = /folder:\s*([a-zA-Z0-9._][a-zA-Z0-9._/-]*)(?=\s|$)/gi;
  const folderMatches = [...query.matchAll(folderRefRegex)];
  const fileRefRegex = /file:([a-zA-Z0-9._-]+(?:\.[a-zA-Z0-9]+)+)/g;
  const fileMatches = [...query.matchAll(fileRefRegex)];
  const requestedFileNames = fileMatches.map((match) => match[1].trim());

  if (folderMatches.length > 0) {
    const folderPromises = folderMatches.map(async (folder) => {
      const folderFiles = await fs.readdir(folder[1].trim());
      return folderFiles;
    });
    const allFolderFiles = await Promise.all(folderPromises);
    requestedFileNames.push(...allFolderFiles.flat());
  }

  return requestedFileNames;
}
