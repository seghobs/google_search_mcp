const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

// GLOBAL FIX: Redirect all stdout to stderr. 
// This prevents library logs/ads from corrupting the MCP JSON-RPC stream.
const originalStdoutWrite = process.stdout.write;
process.stdout.write = function(chunk, encoding, callback) {
    if (typeof chunk === 'string' && (chunk.startsWith('{') || chunk.startsWith('['))) {
        return originalStdoutWrite.apply(process.stdout, arguments);
    }
    return process.stderr.write.apply(process.stderr, arguments);
};

const { manager } = require("./stealth_manager.js");

const server = new Server(
    {
        name: "google-search-playwright-persistent",
        version: "1.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "google_search",
                description: "Search Google using a PERSISTENT Playwright instance with fingerprints. Faster and more efficient.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query" },
                        num_results: { type: "number", description: "Number of results (default 5)", default: 5 },
                        lang: { type: "string", description: "Language code (default 'tr')", default: "tr" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "google_news",
                description: "Search Google News using a persistent stealth browser.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query" },
                        num_results: { type: "number", description: "Number of results (default 5)", default: 5 },
                        lang: { type: "string", description: "Language code (default 'tr')", default: "tr" },
                    },
                    required: ["query"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "google_search") {
            const results = await manager.performSearch(args.query, args.num_results || 5, args.lang || "tr");
            return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        }

        if (name === "google_news") {
            const results = await manager.performNewsSearch(args.query, args.num_results || 5, args.lang || "tr");
            return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        }
    } catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Browser Error: ${error.message}` }],
        };
    }

    throw new Error(`Tool not found: ${name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Stealth Search Persistent MCP server running...");
    
    // Warm up on start (optional, but makes first search faster)
    // manager.ensureInitialized().catch(e => console.error("Pre-warm failed:", e));
}

// Cleanup on exit
process.on('SIGINT', async () => {
    await manager.shutdown();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await manager.shutdown();
    process.exit(0);
});

main().catch((error) => {
    console.error("Fatal Server error:", error);
    process.exit(1);
});
