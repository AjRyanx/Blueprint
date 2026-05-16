type CacheEntry = {
  response: string;
  timestamp: number;
  ttl: number;
};

export class SemanticCache {
  private store = new Map<string, CacheEntry>();

  constructor(private defaultTtlMs: number = 5 * 60 * 1000) {}

  private hash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `cache_${hash}`;
  }

  get(input: string): string | null {
    const key = this.hash(input);
    const entry = this.store.get(key);

    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.response;
  }

  set(input: string, response: string, ttl?: number): void {
    const key = this.hash(input);
    this.store.set(key, {
      response,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
