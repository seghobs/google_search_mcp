"""
Google Search MCP Server
curl_cffi ile Google'ı scrape eder, API key gerektirmez.
"""

import json
import re
from urllib.parse import quote_plus, urljoin
from mcp.server.fastmcp import FastMCP
import subprocess
import os
from curl_cffi import requests
from bs4 import BeautifulSoup

# ── MCP sunucusunu oluştur ──────────────────────────────────────────────────
mcp = FastMCP("google-search")

# ── Sabitler ───────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _clean(text: str) -> str:
    """Gereksiz boşlukları temizle."""
    return re.sub(r"\s+", " ", text).strip()


def _parse_results(html: str, num_results: int) -> list[dict]:
    """Google HTML'ini parse ederek sonuçları çıkar."""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # Organik sonuç blokları — Google'ın <div class="g"> yapısı
    for block in soup.select("div.g, div[data-hveid]"):
        if len(results) >= num_results:
            break

        # Başlık + link
        a_tag = block.select_one("a[href]")
        h3_tag = block.select_one("h3")

        if not a_tag or not h3_tag:
            continue

        url = a_tag["href"]
        if not url.startswith("http"):
            continue

        title = _clean(h3_tag.get_text())

        # Snippet — birkaç farklı selectorı dene
        snippet = ""
        for sel in ["div.VwiC3b", "span.aCOpRe", "div[data-sncf]", "div.s"]:
            node = block.select_one(sel)
            if node:
                snippet = _clean(node.get_text())
                break

        if title and url:
            results.append({"title": title, "url": url, "snippet": snippet})

    return results


# ── Tool: google_search ────────────────────────────────────────────────────
@mcp.tool()
def google_search(
    query: str,
    num_results: int = 5,
    lang: str = "tr",
) -> str:
    """
    Google'da arama yapar ve sonuçları döndürür.

    Args:
        query:       Arama sorgusu
        num_results: Kaç sonuç istediğin (maks 10)
        lang:        Arayüz dili kodu, örn. 'tr', 'en'

    Returns:
        JSON formatında arama sonuçları (title, url, snippet)
    """
    num_results = max(1, min(num_results, 10))
    encoded = quote_plus(query)
    url = f"https://www.google.com/search?q={encoded}&num={num_results + 2}&hl={lang}&gl={lang}"

    try:
        resp = requests.get(
            url,
            headers=HEADERS,
            impersonate="chrome124",   # TLS parmak izi taklidi
            timeout=15,
        )
        resp.raise_for_status()
    except Exception as exc:
        return json.dumps({"error": str(exc)}, ensure_ascii=False)

    results = _parse_results(resp.text, num_results)

    if not results:
        # Debug: Save HTML to inspect
        with open("debug_google.html", "w", encoding="utf-8") as f:
            f.write(resp.text)
        return json.dumps(
            {"error": "Sonuç bulunamadı. HTML debug_google.html dosyasına kaydedildi."},
            ensure_ascii=False,
        )

    return json.dumps(results, ensure_ascii=False, indent=2)


# ── Tool: google_news ──────────────────────────────────────────────────────
@mcp.tool()
def google_news(
    query: str,
    num_results: int = 5,
    lang: str = "tr",
) -> str:
    """
    Google Haberler sekmesinde arama yapar.

    Args:
        query:       Arama sorgusu
        num_results: Kaç haber istediğin (maks 10)
        lang:        Dil kodu

    Returns:
        JSON formatında haber sonuçları (title, url, snippet, source)
    """
    num_results = max(1, min(num_results, 10))
    encoded = quote_plus(query)
    url = (
        f"https://www.google.com/search"
        f"?q={encoded}&tbm=nws&num={num_results + 2}&hl={lang}&gl={lang}"
    )

    try:
        resp = requests.get(
            url,
            headers=HEADERS,
            impersonate="chrome124",
            timeout=15,
        )
        resp.raise_for_status()
    except Exception as exc:
        return json.dumps({"error": str(exc)}, ensure_ascii=False)

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    for block in soup.select("div.SoaBEf, div.WlydOe, div[data-news-doc-id]"):
        if len(results) >= num_results:
            break

        a_tag = block.select_one("a[href]")
        title_tag = block.select_one("div.mCBkyc, div.n0jPhd, div.BNeawe")
        source_tag = block.select_one("div.XTjFC, span.xQ82C")
        snippet_tag = block.select_one("div.GI74Re, div.Y3v8qd")

        if not a_tag:
            continue

        href = a_tag.get("href", "")
        if href.startswith("/url?q="):
            href = href.split("/url?q=")[1].split("&")[0]

        if not href.startswith("http"):
            continue

        results.append(
            {
                "title": _clean(title_tag.get_text()) if title_tag else "",
                "url": href,
                "source": _clean(source_tag.get_text()) if source_tag else "",
                "snippet": _clean(snippet_tag.get_text()) if snippet_tag else "",
            }
        )

    if not results:
        return json.dumps(
            {"error": "Haber bulunamadı veya Google yapısı değişti."},
            ensure_ascii=False,
        )

    return json.dumps(results, ensure_ascii=False, indent=2)


# ── Tool: google_search_stealth ──────────────────────────────────────────────
@mcp.tool()
def google_search_stealth(
    query: str,
    num_results: int = 5,
    lang: str = "tr",
) -> str:
    """
    Playwright ve parmak izi (fingerprint) koruması kullanarak Google'da arama yapar.
    Daha yavaştır ama bot korumalarını geçme ihtimali daha yüksektir.

    Args:
        query:       Arama sorgusu
        num_results: Kaç sonuç istediğin (maks 10)
        lang:        Dil kodu

    Returns:
        JSON formatında arama sonuçları
    """
    try:
        # Node.js scriptini mutlak yol ile çağır
        base_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(base_dir, "src", "google_search_playwright.js")
        
        cmd = ["node", script_path, query, str(num_results)]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or e.stdout or str(e)
        return json.dumps({"error": f"Playwright hatası: {error_msg}"}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


# ── Tool: google_news_stealth ────────────────────────────────────────────────
@mcp.tool()
def google_news_stealth(
    query: str,
    num_results: int = 5,
    lang: str = "tr",
) -> str:
    """
    Fingerprint korumalı Google Haberler araması yapar.

    Args:
        query:       Arama sorgusu
        num_results: Kaç haber istediğin (maks 10)
        lang:        Dil kodu
    """
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(base_dir, "src", "google_news_playwright.js")
        
        cmd = ["node", script_path, query, str(num_results)]
        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8", check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or e.stdout or str(e)
        return json.dumps({"error": f"Playwright News hatası: {error_msg}"}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


# ── Giriş noktası ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
