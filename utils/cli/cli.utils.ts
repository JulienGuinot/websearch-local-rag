import {
  colorize,
  colors,
  dim,
  formatMarkdown,
  highlight,
  info,
} from "../cli/cli.formatting";

// Fonction pour découper les lignes trop longues
export function splitLines(lines: string[], maxWidth: number = 80): string[] {
  const splittedLines: string[] = [];

  lines.forEach((line) => {
    // Enlever les codes couleur ANSI pour calculer la vraie longueur
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "");

    if (cleanLine.length <= maxWidth) {
      splittedLines.push(line);
    } else {
      // Découper la ligne en respectant les mots
      const words = line.split(" ");
      let currentLine = "";
      let currentCleanLine = "";

      for (const word of words) {
        const cleanWord = word.replace(/\x1b\[[0-9;]*m/g, "");
        const testCleanLine =
          currentCleanLine + (currentCleanLine ? " " : "") + cleanWord;

        if (testCleanLine.length <= maxWidth) {
          currentLine += (currentLine ? " " : "") + word;
          currentCleanLine = testCleanLine;
        } else {
          if (currentLine) {
            splittedLines.push(currentLine);
          }
          currentLine = word;
          currentCleanLine = cleanWord;
        }
      }

      if (currentLine) {
        splittedLines.push(currentLine);
      }
    }
  });

  return splittedLines;
}

export function showHelp() {
  const helpBox = `
${colorize("┌────────────────────────────────────────────────────────────────┐", colors.blue)}
${colorize("│", colors.blue)} ${highlight("📚 COMMANDES DISPONIBLES")}                                       ${colorize("│", colors.blue)}
${colorize("├────────────────────────────────────────────────────────────────┤", colors.blue)}
${colorize("│", colors.blue)} ${info("search")} ${dim("<query>")}      ${colorize("│", colors.blue)} Recherche intelligente avec analyse auto ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("add-web")} ${dim("<query>")}     ${colorize("│", colors.blue)} Ajouter du contenu depuis le web         ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("add-file")} ${dim("<path>")}     ${colorize("│", colors.blue)} Ajouter un fichier texte                 ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("add-folder")} ${dim("<path>")}   ${colorize("│", colors.blue)} Ajouter les contenus d'un dossier        ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("file:")} ${dim("<file>")}        ${colorize("│", colors.blue)} Référencer un fichier de la base         ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("folder:")} ${dim("<folder>")}    ${colorize("│", colors.blue)} Référencer un dossier de la base         ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("stats")}               ${colorize("│", colors.blue)} Afficher les statistiques                ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("clear")}               ${colorize("│", colors.blue)} Vider la base de connaissances           ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("help")}                ${colorize("│", colors.blue)} Afficher cette aide                      ${colorize("│", colors.blue)}
${colorize("│", colors.blue)} ${info("exit")}                ${colorize("│", colors.blue)} Quitter le CLI                           ${colorize("│", colors.blue)}
${colorize("└────────────────────────────────────────────────────────────────┘", colors.blue)}
        `;
  console.log(helpBox);
}

export function displaySearchResult(result: any) {
  // Formatage et affichage de la réponse markdown
  const formattedAnswer = formatMarkdown(result.answer);
  console.log(
    `\n${colorize("┌─ RÉPONSE", colors.green)}${colorize("─".repeat(50), colors.green)}`
  );

  const answerLines = formattedAnswer.split("\n");

  const processedLines = splitLines(answerLines, 75); // Limite à 75 caractères
  processedLines.forEach((line) => {
    console.log(`${colorize("│", colors.green)} ${line}`);
  });

  console.log(
    `${colorize("└", colors.green)}${colorize("─".repeat(57), colors.green)}`
  );

  // Affichage des sources
  if (result.sources.length > 0) {
    const urls = result.sources
      .map((source: { metadata: { url: any } }) => source.metadata.url)
      .filter((url: any) => url)
      .filter(
        (url: any, index: any, array: string | any[]) =>
          array.indexOf(url) === index
      );

    if (urls.length > 0) {
      console.log(`\n${highlight("📚 Sources:")}`);
      urls.forEach((url: string, index: number) => {
        console.log(
          `  ${colorize((index + 1).toString(), colors.dim)} ${info(url!)}`
        );
      });
    }
  }
}
