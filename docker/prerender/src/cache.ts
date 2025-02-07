// docker/prerender/src/cache.ts
import fs from 'fs/promises';
import path from 'path';
import type { CacheEntry } from './types';

export class CacheManager {
    private cachePath: string;
    private ttl: number;
    private isRefreshRunning: boolean = false;
    private lastRefreshTime: number = 0;
    private readonly REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

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
                // If file doesn't exist, return empty cache
                return {};
            }
            console.error('Cache load error:', error);
            return {};
        }
    }

    private async saveCache(cache: Record<string, CacheEntry>): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
            await fs.writeFile(this.cachePath, JSON.stringify(cache), 'utf-8');
        } catch (error) {
            console.error('Cache save error:', error);
            throw error;
        }
    }

    async get(url: string): Promise<string | null> {
        try {
            const cache = await this.loadCache();
            const entry = cache[url];
            
            if (!entry) return null;
            
            // Instead of deleting expired entries, we'll still return them
            // This prevents gaps in cache coverage while refresh is pending
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
            throw error;
        }
    }

    async refreshUrl(url: string, renderer: any): Promise<void> {
        try {
            console.log(`Starting refresh for URL: ${url}`);
            const content = await renderer.render(url);
            await this.set(url, content);
            console.log(`Successfully refreshed cache for: ${url}`);
        } catch (error) {
            // If refresh fails, we'll keep any existing cache entry
            console.error(`Failed to refresh URL ${url}:`, error);
            
            // Re-throw the error so the caller can handle it
            throw error;
        }
    }

    async refreshCache(renderer: any): Promise<void> {
        const now = Date.now();
        
        if (this.isRefreshRunning) {
            return;
        }

        if (now - this.lastRefreshTime < this.REFRESH_INTERVAL) {
            return;
        }

        this.isRefreshRunning = true;
        console.log('Starting cache refresh cycle');

        try {
            const cache = await this.loadCache();
            
            // Process entries in batches to prevent memory issues
            const batchSize = 5;
            const entries = Object.values(cache);
            
            for (let i = 0; i < entries.length; i += batchSize) {
                const batch = entries.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (entry) => {
                    if (now - entry.timestamp > this.ttl) {
                        try {
                            await this.refreshUrl(entry.url, renderer);
                        } catch (error) {
                            // Error already logged in refreshUrl
                            // Continue with other entries
                        }
                    }
                }));

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('Cache refresh cycle completed');
            this.lastRefreshTime = now;
        } catch (error) {
            console.error('Cache refresh error:', error);
        } finally {
            this.isRefreshRunning = false;
        }
    }

    async needsRefresh(url: string): Promise<boolean> {
        const cache = await this.loadCache();
        const entry = cache[url];
        if (!entry) return true;
        return Date.now() - entry.timestamp > this.ttl;
    }
}