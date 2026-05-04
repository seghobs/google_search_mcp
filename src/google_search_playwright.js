const { plugin } = require('./index.js');
const fs = require('fs');
const path = require('path');

/**
 * Performs a Google search using Playwright with fingerprints.
 * Strictly follows the "fetch fingerprint first" rule.
 */
async function performSearch(query, numResults = 5, lang = 'tr', proxy = null) {
    // GLOBAL FIX: Redirect all stdout to stderr for this process to prevent library ads.
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = process.stderr.write.bind(process.stderr);

    try {
        const serviceKey = process.env.FINGERPRINT_KEY || '';
        plugin.setServiceKey(serviceKey);
        
        // Set a generous timeout for the engine and fetching (especially for free tier)
        plugin.setRequestTimeout(2 * 60000); 
        plugin.setEngineTimeout(5 * 60000);

        // 2. FETCH FINGERPRINT FIRST (Strictly before any browser action)
        console.error(`[Playwright] FETCHING FINGERPRINT for query: "${query}"...`);
        const fingerprint = await plugin.fetch({
            tags: ['Microsoft Windows', 'Chrome'],
        });
        
        if (!fingerprint) {
            throw new Error("CRITICAL: Failed to fetch fingerprint. The browser will NOT be launched.");
        }

        console.error("[Playwright] Fingerprint successfully obtained.");

        // 3. APPLY FINGERPRINT
        plugin.useFingerprint(fingerprint, {
            safeElementSize: true
        });
    } finally {
        // Restore stdout
        process.stdout.write = originalStdoutWrite;
    }

        if (proxy) {
            plugin.useProxy(proxy);
        }

        // 4. LAUNCH BROWSER (Only now!)
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const userDataDir = path.join(dataDir, `profile_${Date.now()}`);
        
        console.error("[Playwright] Launching browser with applied fingerprint...");
        const browser = await plugin.launchPersistentContext(userDataDir, {
            headless: true,
        });

        const page = await browser.newPage();
        
        // Human-like navigation
        const baseUrl = `https://www.google.com/?hl=${lang}`;
        console.error(`[Playwright] Navigating to: ${baseUrl}`);
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        
        // Handle cookie consent
        try {
            const consentButton = await page.$('button:has-text("Kabul ediyorum"), button:has-text("I agree"), button:has-text("Alle akzeptieren"), button:has-text("Accept all")');
            if (consentButton) {
                console.error("[Playwright] Clicking cookie consent button.");
                await consentButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
            }
        } catch (e) {}

        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
        
        const searchInput = await page.$('textarea[name="q"], input[name="q"]');
        if (searchInput) {
            await searchInput.click();
            await page.keyboard.type(query, { delay: 60 + Math.random() * 100 });
            await page.keyboard.press('Enter');
        } else {
            console.error("[Playwright] Search input not found, direct navigation fallback.");
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=${numResults + 5}&hl=${lang}`, { waitUntil: 'networkidle' });
        }
        
        // Wait for results
        await page.waitForSelector('div.g, div.tF2Cxc, div.MjjYud', { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));

        const content = await page.content();
        
        if (content.includes('g-recaptcha') || content.includes('captcha') || content.includes('id="captcha"') || content.includes('unusual traffic')) {
            fs.writeFileSync('captcha_detected.html', content);
            await browser.close();
            throw new Error("DETECTED: Google presented a CAPTCHA. Check captcha_detected.html");
        }

        const results = await page.evaluate((maxCount) => {
            const items = [];
            const blocks = document.querySelectorAll('div.g, div.tF2Cxc, div.MjjYud');
            
            for (const block of blocks) {
                if (items.length >= maxCount) break;

                const h3 = block.querySelector('h3');
                const a = block.querySelector('a[href]');
                if (!h3 || !a) continue;

                const url = a.href;
                if (!url.startsWith('http') || url.includes('google.com/search') || url.includes('google.com/intl')) continue;

                const title = h3.innerText.trim();
                if (!title || title === 'Harita' || title.includes('Görsel') || title.includes('Maps')) continue;

                let snippet = '';
                const snippetSelectors = ['div.VwiC3b', 'span.aCOpRe', 'div.s', 'div.kbS1fe', 'div.y6768e', 'div.MUwY0b'];
                for (const sel of snippetSelectors) {
                    const node = block.querySelector(sel);
                    if (node && node.innerText.trim()) {
                        snippet = node.innerText.trim();
                        break;
                    }
                }

                items.push({ title, url, snippet });
            }
            return items;
        }, numResults);

        await browser.close();
        
        // Cleanup
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}

        return results;

    } catch (error) {
        console.error(`[Playwright Error]: ${error.message}`);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const query = process.argv[2] || "test";
    const num = parseInt(process.argv[3]) || 5;
    performSearch(query, num)
        .then(res => console.log(JSON.stringify(res, null, 2)))
        .catch(err => {
            // Error logged in performSearch
            process.exit(1);
        });
}

module.exports = { performSearch };
