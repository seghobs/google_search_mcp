const { plugin } = require('./index.js');
const fs = require('fs');
const path = require('path');

/**
 * Manages a persistent browser instance for stealth searches.
 * Keeps the browser warm to avoid expensive re-launches.
 */
class StealthBrowserManager {
    constructor() {
        this.browser = null;
        this.userDataDir = null;
        this.isInitialized = false;
    }

    async ensureInitialized() {
        if (this.isInitialized && this.browser) return;

        console.error("[StealthManager] Initializing Warm Browser...");
        
        const serviceKey = process.env.FINGERPRINT_KEY || '';
        plugin.setServiceKey(serviceKey);
        plugin.setRequestTimeout(2 * 60000); 
        plugin.setEngineTimeout(5 * 60000);

        // 1. Fetch Fingerprint
        const fingerprint = await plugin.fetch({
            tags: ['Microsoft Windows', 'Chrome'],
        });
        
        if (!fingerprint) throw new Error("Failed to fetch fingerprint.");
        
        // 2. Apply
        plugin.useFingerprint(fingerprint, { safeElementSize: true });

        // 3. Launch
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this.userDataDir = path.join(dataDir, `persistent_profile_${Date.now()}`);
        
        this.browser = await plugin.launchPersistentContext(this.userDataDir, {
            headless: true,
        });

        this.isInitialized = true;
        console.error("[StealthManager] Browser is now WARM and ready.");
    }

    async performSearch(query, numResults = 5, lang = 'tr') {
        await this.ensureInitialized();
        
        const page = await this.browser.newPage();
        try {
            console.error(`[StealthManager] Searching: "${query}"`);
            
            // Navigate to Google
            await page.goto(`https://www.google.com/?hl=${lang}`, { waitUntil: 'networkidle' });
            
            // Basic check for cookie consent on first use or new page
            try {
                const consentButton = await page.$('button:has-text("Kabul ediyorum"), button:has-text("I agree"), button:has-text("Accept all")');
                if (consentButton) await consentButton.click();
            } catch (e) {}

            // Perform search
            const searchInput = await page.$('textarea[name="q"], input[name="q"]');
            if (searchInput) {
                await searchInput.click();
                await page.keyboard.type(query, { delay: 50 });
                await page.keyboard.press('Enter');
            } else {
                await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=${numResults+5}&hl=${lang}`, { waitUntil: 'networkidle' });
            }

            let allResults = [];
            let pagesVisited = 0;
            const maxPages = 3; // Limit to avoid detection

            while (allResults.length < numResults && pagesVisited < maxPages) {
                console.error(`[StealthManager] Parsing page ${pagesVisited + 1}...`);
                await page.waitForSelector('div.g, div.tF2Cxc', { timeout: 10000 }).catch(() => {});
                
                // Random scroll to mimic reading
                await page.mouse.wheel(0, 500 + Math.random() * 500);
                await new Promise(r => setTimeout(r, 1000));

                const pageResults = await page.evaluate((maxCount) => {
                    const items = [];
                    const blocks = document.querySelectorAll('div.g, div.tF2Cxc, div.MjjYud');
                    for (const block of blocks) {
                        const h3 = block.querySelector('h3');
                        const a = block.querySelector('a[href]');
                        if (!h3 || !a) continue;
                        const url = a.href;
                        if (!url.startsWith('http') || url.includes('google.com/search')) continue;
                        items.push({ title: h3.innerText.trim(), url, snippet: "" });
                    }
                    return items;
                }, numResults);

                // Add unique results
                for (const res of pageResults) {
                    if (!allResults.find(r => r.url === res.url)) {
                        allResults.push(res);
                    }
                }

                if (allResults.length >= numResults) break;

                // Try to go to next page
                const nextButton = await page.$('a#pnnext, a:has-text("Sonraki"), a:has-text("Next")');
                if (nextButton) {
                    console.error("[StealthManager] Moving to next page...");
                    await nextButton.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle' });
                    pagesVisited++;
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    break;
                }
            }

            return allResults.slice(0, numResults);
        } finally {
            await page.close(); // Close the TAB, but keep the BROWSER
        }
    }

    async performNewsSearch(query, numResults = 5, lang = 'tr') {
        await this.ensureInitialized();
        const page = await this.browser.newPage();
        try {
            console.error(`[StealthManager] News Search: "${query}"`);
            const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&num=${numResults}&hl=${lang}`;
            await page.goto(url, { waitUntil: 'networkidle' });
            
            await page.waitForSelector('div.SoaBEf, div.WlydOe', { timeout: 15000 }).catch(() => {});

            const results = await page.evaluate((maxCount) => {
                const items = [];
                const blocks = document.querySelectorAll('div.SoaBEf, div.WlydOe');
                for (const block of blocks) {
                    if (items.length >= maxCount) break;
                    const a = block.querySelector('a[href]');
                    const titleTag = block.querySelector('div.mCBkyc, h3');
                    if (a && titleTag) {
                        items.push({ title: titleTag.innerText.trim(), url: a.href });
                    }
                }
                return items;
            }, numResults);
            return results;
        } finally {
            await page.close();
        }
    }

    async shutdown() {
        if (this.browser) {
            console.error("[StealthManager] Shutting down browser...");
            await this.browser.close();
            this.browser = null;
            this.isInitialized = false;
            try {
                if (this.userDataDir) fs.rmSync(this.userDataDir, { recursive: true, force: true });
            } catch (e) {}
        }
    }
}

// Singleton instance
const manager = new StealthBrowserManager();

module.exports = { manager };
