# MCP Server Integration Guide

This project provides two MCP servers:
1.  **Python (Standard)**: Uses `curl_cffi` for fast, lightweight searches.
2.  **Node.js (Stealth - WARM MODE)**: Uses a persistent Playwright instance with fingerprints. The browser stays open as long as your IDE is open, making subsequent searches **instant**.

---

## 1. Configuration for AI Tools (Claude Desktop, Cursor, Antigravity, etc.)

Paste the following into your `mcp_config.json` (or `claude_desktop_config.json`):

### Stealth Node.js Server (Recommended for bypassing blocks)
```json
{
  "mcpServers": {
    "google-search-stealth": {
      "command": "node",
      "args": ["C:/Users/user/Desktop/google-search-mcp/src/mcp_server.js"],
      "env": {
        "FINGERPRINT_KEY": "" 
      }
    }
  }
}
```

### Fast Python Server (Lightweight)
```json
{
  "mcpServers": {
    "google-search": {
      "command": "python",
      "args": ["C:/Users/user/Desktop/google-search-mcp/server.py"]
    }
  }
}
```

---

## 2. Compatibility Checklist

- [x] **Claude Desktop**: Fully compatible via `claude_desktop_config.json`.
- [x] **Cursor**: Compatible via Settings -> Features -> MCP. Add the Node.js or Python server as a "stdio" server.
- [x] **Claude Code (CLI)**: Use `mcp add` command:
    ```bash
    mcp add google-search-stealth -- node C:/Users/user/Desktop/google-search-mcp/src/mcp_server.js
    ```
- [x] **Antigravity / Gemini**: Automatically detects and uses these servers when configured in the system.

---

## 3. Troubleshooting

- **CAPTCHA Issues**: If you still see CAPTCHAs, try setting a premium `FINGERPRINT_KEY` in the environment variables.
- **Node.js Errors**: Ensure `npm install` has been run in the project directory.
- **Windows Only**: Remember that the `playwright-with-fingerprints` plugin only works on **Windows**.
- **Warm Browser Mode**: The Node.js server now keeps the browser alive. The first search will take ~15-20s (launch + fingerprint), but every search after that will be much faster (~3-5s) because the browser is already open.

---

## 4. Fingerprint Management
The server automatically:
- Fetches a new fingerprint for every search.
- Uses the "free" API tier by default.
- Cleans up temporary browser profiles to save disk space.
