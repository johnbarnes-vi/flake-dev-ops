// docker/prerender/src/cache.ts
import type { CacheEntry } from './types';

export class CacheManager {
    private cache: Map<string, CacheEntry> = new Map();
    private ttl: number;

    constructor(ttlSeconds: number = 86400) {
        this.ttl = ttlSeconds * 1000;
    }

    get(url: string): string | null {
        const entry = this.cache.get(url);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(url);
            return null;
        }
        return entry.content;
    }

    set(url: string, content: string): void {
        this.cache.set(url, {
            content,
            timestamp: Date.now(),
            url
        });
    }
}