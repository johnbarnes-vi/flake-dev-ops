import express, { Request, Response } from 'express';
import { CacheManager } from './cache';
import { Renderer } from './renderer';

const app = express();
const cache = new CacheManager();
const renderer = new Renderer();

// Cache refresh interval (12 hours)
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

async function handleCacheRefresh() {
    try {
        await cache.refreshCache(renderer);
    } catch (error) {
        console.error('Cache refresh failed:', error);
    }
}

// Schedule periodic cache refresh
setInterval(handleCacheRefresh, REFRESH_INTERVAL);

// Health check with optional cache refresh
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
    try {
        await handleCacheRefresh();
        res.status(200).send('healthy');
    } catch (error) {
        res.status(500).send('unhealthy');
    }
});

app.get('/render', async (req: Request, res: Response): Promise<void> => {
    const url = req.query.url as string;
    if (!url) {
        res.status(400).json({ error: 'URL parameter required' });
        return;
    }

    try {
        const cached = await cache.get(url);
        if (cached) {
            if (await cache.needsRefresh(url)) {
                renderer.render(url)
                    .then(content => cache.set(url, content))
                    .catch(error => console.error(`Background refresh failed for ${url}:`, error));
            }
            res.send(cached);
            return;
        }

        const content = await renderer.render(url);
        await cache.set(url, content);
        res.send(content);
    } catch (error) {
        console.error('Render error:', error);
        res.status(500).json({ error: 'Render failed' });
    }
});

// Force refresh endpoint for debugging
if (process.env.NODE_ENV === 'development') {
    app.post('/refresh', async (_req: Request, res: Response) => {
        try {
            await handleCacheRefresh();
            res.status(200).json({ message: 'Cache refresh completed' });
        } catch (error) {
            res.status(500).json({ error: 'Cache refresh failed' });
        }
    });
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Prerender service running on port ${port}`));