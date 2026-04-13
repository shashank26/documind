export function extractCitations(text: string) {
  const matches = text.match(/\[(\d+)\]/g) || [];
  return [...new Set(matches.map((m) => Number(m.replace(/\D/g, ''))))];
}

export function getPreview(content: string) {
  return (
    content
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9., ]/g, '')
      .split('.')
      .slice(0, 2)
      .join('.')
      .trim() + '.'
  );
}
