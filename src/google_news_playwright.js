const { plugin } = require('./index.js');
const fs = require('fs');
const path = require('path');

async function performNewsSearch(query, numResults = 5, lang = 'tr', proxy = null) {
    const serviceKey = process.env.FINGERPRINT_KEY || '';
    plugin.setServiceKey(serviceKey);
    plugin.setRequestTimeout(2 * 60000); 

    // GLOBAL FIX: Redirect all stdout to stderr for this process to prevent library ads.
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = process.stderr.write.bind(process.stderr);

    try {
        console.error(`[Playwright News] FETCHING FINGERPRINT for query: "${query}"...`);
        const fingerprint = await plugin.fetch({
            tags: ['Microsoft Windows', 'Chrome'],
        });
        
        if (!fingerprint) throw new Error("Failed to fetch fingerprint.");
        plugin.useFingerprint(fingerprint, { safeElementSize: true });
    } finally {
        process.stdout.write = originalStdoutWrite;
    }

        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const userDataDir = path.join(dataDir, `news_profile_${Date.now()}`);
        
        const browser = await plugin.launchPersistentContext(userDataDir, { headless: true });
        const page = await browser.newPage();
        
        // Go to News tab directly or navigate
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&num=${numResults + 2}&hl=${lang}`;
        console.error(`[Playwright News] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle' });
        
        await page.waitForSelector('div.SoaBEf, div.WlydOe', { timeout: 15000 }).catch(() => {});

        const results = await page.evaluate((maxCount) => {
            const items = [];
            const blocks = document.querySelectorAll('div.SoaBEf, div.WlydOe, div[data-news-doc-id]');
            
            for (const block of blocks) {
                if (items.length >= maxCount) break;

                const a = block.querySelector('a[href]');
                const titleTag = block.querySelector('div.mCBkyc, div.n0jPhd, div.BNeawe, h3');
                const sourceTag = block.querySelector('div.XTjFC, span.xQ82C, div.Mg7P1b');
                const snippetTag = block.querySelector('div.GI74Re, div.Y3v8qd, div.h1uUmc');

                if (!a || !titleTag) continue;

                items.push({
                    title: titleTag.innerText.trim(),
                    url: a.href,
                    source: sourceTag ? sourceTag.innerText.trim() : "Unknown",
                    snippet: snippetTag ? snippetTag.innerText.trim() : ""
                });
            }
            return items;
        }, numResults);

        await browser.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
        return results;

    } catch (error) {
        console.error(`[Playwright News Error]: ${error.message}`);
        throw error;
    }
}

if (require.main === module) {
    const query = process.argv[2] || "test";
    const num = parseInt(process.argv[3]) || 5;
    performNewsSearch(query, num).then(res => console.log(JSON.stringify(res, null, 2))).catch(() => process.exit(1));
}

module.exports = { performNewsSearch };
