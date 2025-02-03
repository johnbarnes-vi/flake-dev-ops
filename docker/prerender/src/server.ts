import express, { Request, Response } from 'express';
import { CacheManager } from './cache';
import { Renderer } from './renderer';

const app = express();
const cache = new CacheManager();
const renderer = new Renderer();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.send('healthy');
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
            // Check cache first
            const cached = cache.get(url);
            if (cached) {
                res.send(cached);
                return;
            }

            // Render and cache if not found
            const content = await renderer.render(url);
            cache.set(url, content);
            res.send(content);
        } catch (error) {
            console.error('Render error:', error);
            res.status(500).send('Render failed');
        }
    })();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Prerender service running on port ${port}`));