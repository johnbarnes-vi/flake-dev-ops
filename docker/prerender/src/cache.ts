import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { Renderer } from './renderer';
import type { CacheEntry } from './types';

const DEBOUNCE_INTERVAL = 5000;
const SYNC_INTERVAL = 60000;
const TTL = 86400000;

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private syncQueue = new Set<string>();
  private isSyncScheduled = false;
  private lastSync = 0;
  private parser = new XMLParser();
  private refreshLock = false;
  private initialized = false;

  constructor() {
    this.initialize()
      .then(() => {
        console.log('[Cache] Initialization completed');
        this.initialized = true;
      })
      .catch(err => console.error('[Cache] Initialization failed:', err));

    setInterval(() => this.saveToDisk(), SYNC_INTERVAL);
  }

  private async initialize(): Promise<void> {
    console.log('[Cache] Starting initialization');
    await this.loadFromDisk();
    this.cleanupExpired();
    console.log(`[Cache] Memory cache ready with ${this.memoryCache.size} items`);
  }

  private async loadFromDisk(): Promise<void> {
    console.log('[Cache] Loading from disk...');
    try {
      const data = await fs.readFile('/cache/storage.json', 'utf-8');
      const entries: [string, CacheEntry][] = JSON.parse(data);

      console.log(`[Cache] Found ${entries.length} disk entries`);
      this.memoryCache = new Map(entries);

      console.log(`[Cache] Loaded ${this.memoryCache.size} valid entries`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('[Cache] No existing cache file found');
        await this.saveToDisk(true);
      } else {
        console.error('[Cache] Disk load error:', error);
      }
    }
  }

  async saveToDisk(force = false): Promise<void> {
    if (!force && Date.now() - this.lastSync < SYNC_INTERVAL) {
      console.log('[Cache] Skipping disk save (recently updated)');
      return;
    }

    console.log('[Cache] Starting disk save...');
    try {
      const entries = Array.from(this.memoryCache.entries());
      await fs.mkdir(path.dirname('/cache/storage.json'), { recursive: true });
      await fs.writeFile('/cache/storage.json', JSON.stringify(entries), 'utf-8');
      this.lastSync = Date.now();
      console.log(`[Cache] Saved ${entries.length} items to disk`);
    } catch (error) {
      console.error('[Cache] Disk save error:', error);
    }
  }

  async get(rawUrl: string): Promise<string | null> {
    if (!this.initialized) {
      console.warn('[Cache] Accessing cache before initialization completed');
    }
    const url = this.normalizeUrl(rawUrl);
    const entry = this.memoryCache.get(url);
    if (entry) {
      console.log(`[Cache] HIT for ${url} (age: ${Date.now() - entry.timestamp}ms)`);
      return entry.content;
    }

    console.log(`[Cache] MISS for ${url}`);
    return null;
  }

  async set(rawUrl: string, content: string): Promise<void> {
    const url = this.normalizeUrl(rawUrl);

    console.log(`[Cache] SET ${url}`);
    const entry: CacheEntry = {
      content,
      timestamp: Date.now(),
      url
    };

    this.memoryCache.set(url, entry);
    this.queueSync(url);
  }

  private queueSync(url: string): void {
    console.log(`[Cache] Queueing sync for ${url}`);
    this.syncQueue.add(url);

    if (!this.isSyncScheduled) {
      console.log('[Cache] Scheduling batched sync');
      this.isSyncScheduled = true;
      setTimeout(() => this.processSyncQueue(), DEBOUNCE_INTERVAL);
    }
  }

  private async processSyncQueue(): Promise<void> {
    console.log(`[Cache] Processing sync queue (${this.syncQueue.size} items)`);
    this.isSyncScheduled = false;
    await this.saveToDisk();
    this.syncQueue.clear();
  }
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [url, entry] of this.memoryCache) {
      if (now - entry.timestamp > TTL) {
        this.memoryCache.delete(url);
      }
    }
  }

  async needsRefresh(url: string): Promise<boolean> {
    const entry = this.memoryCache.get(url);
    return !entry || (Date.now() - entry.timestamp) > TTL;
  }

  private normalizeUrl(url: string): string {
    // Convert to HTTPS and remove trailing slashes
    return url
      .replace(/^http:\/\//i, 'https://')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  private async fetchSitemap(): Promise<string[]> {
    try {
      // Force HTTPS for sitemap retrieval
      const response = await fetch('http://myflashpal-backend:5000/api/sitemap.xml');
      const xml = await response.text();
      const result = this.parser.parse(xml);

      return result.urlset?.url
        ?.map((u: any) => this.normalizeUrl(u.loc))
        .filter(Boolean) || [];
    } catch (error) {
      console.error('Sitemap fetch error:', error);
      return [];
    }
  }

  async refreshCache(renderer: Renderer): Promise<void> {
    if (this.refreshLock) {
      console.log('[Cache] Refresh already in progress');
      return;
    }

    console.log('[Cache] Starting cache refresh');
    const startTime = Date.now();
    this.refreshLock = true;

    try {
      const sitemapUrls = await this.fetchSitemap();
      console.log(`[Cache] Sitemap contains ${sitemapUrls.length} URLs`);

      // Cleanup stale entries
      const initialSize = this.memoryCache.size;
      for (const [url] of this.memoryCache) {
        if (!sitemapUrls.includes(url)) {
          console.log(`[Cache] Removing stale entry: ${url}`);
          this.memoryCache.delete(url);
        }
      }
      console.log(`[Cache] Removed ${initialSize - this.memoryCache.size} stale entries`);

      // Refresh existing entries
      let refreshedCount = 0;
      const now = Date.now();

      for (const url of sitemapUrls) {
        const entry = this.memoryCache.get(url);
        const needsRefresh = !entry || (now - entry.timestamp > TTL);

        if (needsRefresh) {
          console.log(`[Cache] Refreshing ${url}`);
          try {
            const content = await renderer.render(url);
            await this.set(url, content);
            refreshedCount++;
          } catch (error) {
            console.error(`[Cache] Refresh failed for ${url}:`, error);
          }
        }
      }

      console.log(`[Cache] Refresh completed. Updated ${refreshedCount} items. ` +
        `Total duration: ${Date.now() - startTime}ms`);
    } finally {
      this.refreshLock = false;
      await this.saveToDisk(true);
    }
  }
}