const { manager } = require('./src/stealth_manager.js');

async function test() {
    try {
        console.log("Testing search...");
        const results = await manager.performSearch("Yapay zeka 2026", 3);
        console.log("Results found:", results.length);
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await manager.shutdown();
    }
}

test();
