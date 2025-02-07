import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import type { CacheEntry } from './types';

export class CacheManager {
    private readonly cachePath = '/cache/storage.json';
    private readonly ttl: number;
    private isRefreshRunning = false;
    private lastRefreshTime = 0;
    private readonly REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
    private readonly BATCH_SIZE = 5;
    private readonly BATCH_DELAY = 1000; // 1 second

    constructor(ttlSeconds: number = 86400) {
        this.ttl = ttlSeconds * 1000;
    }

    private async fetchSitemap(): Promise<string[]> {
        try {
            const response = await fetch('http://nginx-proxy/api/sitemap.xml');
            if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`);
            
            const xml = await response.text();
            const parser = new XMLParser();
            const result = parser.parse(xml);
            
            if (!result.urlset?.url) {
                console.warn('Sitemap missing urlset or url entries');
                return [];
            }

            // Handle both single and multiple URL cases
            const urls = Array.isArray(result.urlset.url) 
                ? result.urlset.url.map((entry: any) => entry.loc)
                : [result.urlset.url.loc];

            return urls;
        } catch (error) {
            console.error('Sitemap fetch error:', error);
            throw error;
        }
    }

    private async loadCache(): Promise<Record<string, CacheEntry>> {
        try {
            const data = await fs.readFile(this.cachePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    private async saveCache(cache: Record<string, CacheEntry>): Promise<void> {
        await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
        await fs.writeFile(this.cachePath, JSON.stringify(cache), 'utf-8');
    }

    async get(url: string): Promise<string | null> {
        try {
            const cache = await this.loadCache();
            return cache[url]?.content || null;
        } catch (error) {
            console.error('Cache read error:', error);
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
            console.error('Cache write error:', error);
            throw error;
        }
    }

    private async refreshUrl(url: string, renderer: any): Promise<void> {
        try {
            console.log(`Refreshing: ${url}`);
            const content = await renderer.render(url);
            
            const cache = await this.loadCache();
            cache[url] = {
                content,
                timestamp: Date.now(),
                url
            };
            await this.saveCache(cache);
            
            console.log(`Refreshed: ${url}`);
        } catch (error) {
            console.error(`Refresh failed for ${url}:`, error);
            throw error;
        }
    }

    async refreshCache(renderer: any): Promise<void> {
        if (this.isRefreshRunning) return;
        
        const now = Date.now();
        if (now - this.lastRefreshTime < this.REFRESH_INTERVAL) return;

        this.isRefreshRunning = true;
        console.log('Starting cache refresh');

        try {
            // Get current URLs from sitemap
            const sitemapUrls = await this.fetchSitemap();
            if (!sitemapUrls.length) {
                throw new Error('No URLs found in sitemap');
            }

            // Load current cache
            const cache = await this.loadCache();
            
            // Remove entries not in sitemap
            const newCache: Record<string, CacheEntry> = {};
            for (const url of sitemapUrls) {
                if (cache[url]) {
                    newCache[url] = cache[url];
                }
            }
            await this.saveCache(newCache);

            // Process URLs in batches
            for (let i = 0; i < sitemapUrls.length; i += this.BATCH_SIZE) {
                const batch = sitemapUrls.slice(i, i + this.BATCH_SIZE);
                
                await Promise.all(batch.map(async (url) => {
                    const entry = newCache[url];
                    if (!entry || now - entry.timestamp > this.ttl) {
                        try {
                            await this.refreshUrl(url, renderer);
                        } catch (error) {
                            // Error already logged in refreshUrl
                        }
                    }
                }));

                if (i + this.BATCH_SIZE < sitemapUrls.length) {
                    await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
                }
            }

            this.lastRefreshTime = now;
            console.log('Cache refresh complete');
        } catch (error) {
            console.error('Cache refresh failed:', error);
            throw error;
        } finally {
            this.isRefreshRunning = false;
        }
    }

    async needsRefresh(url: string): Promise<boolean> {
        try {
            const cache = await this.loadCache();
            const entry = cache[url];
            if (!entry) return true;
            return Date.now() - entry.timestamp > this.ttl;
        } catch (error) {
            console.error('Cache check error:', error);
            return true;
        }
    }
}