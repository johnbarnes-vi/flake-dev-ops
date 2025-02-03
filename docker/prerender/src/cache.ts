// docker/prerender/src/cache.ts
import fs from 'fs/promises';
import path from 'path';
import type { CacheEntry } from './types';

export class CacheManager {
    private cachePath: string;
    private ttl: number;

    constructor(ttlSeconds: number = 86400) {
        this.ttl = ttlSeconds * 1000;
        this.cachePath = process.env.CACHE_PATH || '/cache/storage.json';
    }

    private async loadCache(): Promise<Record<string, CacheEntry>> {
        try {
            const data = await fs.readFile(this.cachePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return {};
            }
            console.error('Cache load error:', error);
            return {};
        }
    }

    private async saveCache(cache: Record<string, CacheEntry>): Promise<void> {
        await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
        await fs.writeFile(this.cachePath, JSON.stringify(cache), 'utf-8');
    }

    async get(url: string): Promise<string | null> {
        try {
            const cache = await this.loadCache();
            const entry = cache[url];
            
            if (!entry) return null;
            
            if (Date.now() - entry.timestamp > this.ttl) {
                delete cache[url];
                await this.saveCache(cache);
                return null;
            }
            
            return entry.content;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(url: string, content: string): Promise<void> {
        try {
            const cache = await this.loadCache();
            cache[url] = {
                content,
                timestamp: Date.now(),
                url
            };
            await this.saveCache(cache);
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async clearExpired(): Promise<void> {
        try {
            const cache = await this.loadCache();
            const now = Date.now();
            let modified = false;
            
            for (const url in cache) {
                if (now - cache[url].timestamp > this.ttl) {
                    delete cache[url];
                    modified = true;
                }
            }
            
            if (modified) {
                await this.saveCache(cache);
            }
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }
}