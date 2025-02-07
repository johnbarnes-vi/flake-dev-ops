import * as puppeteer from 'puppeteer';

export class Renderer {
    private browser: puppeteer.Browser | null = null;

    async initialize(): Promise<void> {
        this.browser = await puppeteer.launch({
            executablePath: process.env.CHROME_BIN,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async render(url: string): Promise<string> {
        if (!this.browser) await this.initialize();
        const page = await this.browser!.newPage();
        
        try {
            // Block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
    
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            
            return await page.content();
        } finally {
            await page.close();
            // Keep browser instance open for reuse
        }
    }
}