export function compressPriorPhase(phase: number, content: string): string {
  const lines = content.split('\n').filter(Boolean);
  if (lines.length <= 5) return content;

  const summary = lines.slice(0, 3).join('; ');
  const keyPoints = lines
    .filter((l) => l.startsWith('-') || l.startsWith('*') || l.match(/^\d+\./))
    .slice(0, 5)
    .join('\n');

  return `[Phase ${phase} Summary]\n${summary}\n\nKey points:\n${keyPoints}`;
}

export function compressConversation(messages: { role: string; content: string }[]): string {
  if (messages.length === 0) return '';

  const keyExchanges = messages
    .filter((m) => m.content.length > 50)
    .slice(-4)
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join('\n');

  return `Recent conversation:\n${keyExchanges}`;
}
