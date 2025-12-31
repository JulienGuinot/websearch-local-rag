async function hasInternetConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors", // évite les erreurs CORS
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}
