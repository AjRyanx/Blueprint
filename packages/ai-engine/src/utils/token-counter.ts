const TOKENS_PER_WORD = 0.75;
const TOKENS_PER_CHAR = 0.25;

export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).length;
  const chars = text.length;
  return Math.ceil(words * TOKENS_PER_WORD + chars * TOKENS_PER_CHAR);
}

export function isWithinContextBudget(text: string, maxTokens: number = 128_000): boolean {
  return estimateTokens(text) <= maxTokens * 0.7;
}

export function truncateToBudget(text: string, maxTokens: number = 128_000): string {
  const budget = maxTokens * 0.7;
  const estimated = estimateTokens(text);

  if (estimated <= budget) return text;

  const ratio = budget / estimated;
  const targetLength = Math.floor(text.length * ratio * 0.9);
  return text.slice(0, targetLength) + '\n\n[truncated for context budget]';
}
