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
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            return await page.content();
        } finally {
            await page.close();
        }
    }
}