/**
 * Extracts plain text from raw uploaded file buffers or text submissions.
 */
export async function extractResumeText(fileBuffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();

  // If text or markdown file
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return fileBuffer.toString("utf-8");
  }

  // Fallback: extract readable ascii/utf-8 strings from binary buffers (PDFs or docs)
  const rawString = fileBuffer.toString("latin1");
  const textMatches = rawString.match(/[\x20-\x7E\t\r\n]{4,}/g) || [];
  const extracted = textMatches.join(" ").replace(/\s+/g, " ").trim();

  return extracted.slice(0, 5000);
}
