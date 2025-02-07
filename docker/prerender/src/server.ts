// docker/prerender/src/server.ts
import express, { Request, Response } from 'express';
import { CacheManager } from './cache';
import { Renderer } from './renderer';

const app = express();
const cache = new CacheManager();
const renderer = new Renderer();

// Set up periodic cache refresh
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
setInterval(() => {
    cache.refreshCache(renderer)
        .catch(error => console.error('Scheduled refresh failed:', error));
}, REFRESH_INTERVAL);

// Health check endpoint that can trigger refresh if needed
app.get('/health', (_req: Request, res: Response) => {
    cache.refreshCache(renderer)
        .catch(error => {
            console.error('Health check refresh failed:', error);
        })
        .finally(() => {
            res.send('healthy');
        });
});

// Render endpoint
app.get('/render', (req: Request, res: Response) => {
    const url = req.query.url as string;
    if (!url) {
        res.status(400).send('URL required');
        return;
    }

    (async () => {
        try {
            // Always return cached content if it exists
            const cached = await cache.get(url);
            if (cached) {
                // Check if content needs refresh
                const needsRefresh = await cache.needsRefresh(url);
                if (needsRefresh) {
                    // Trigger refresh in the background
                    cache.refreshUrl(url, renderer)
                        .catch(error => {
                            console.error(`Background refresh failed for ${url}:`, error);
                        });
                }
                // Return cached content immediately
                res.send(cached);
                return;
            }

            // If no cache exists, render and cache
            const content = await renderer.render(url);
            await cache.set(url, content);
            res.send(content);
        } catch (error) {
            console.error('Render error:', error);
            res.status(500).send('Render failed');
        }
    })();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Prerender service running on port ${port}`));