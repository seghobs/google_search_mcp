"""
Sunucuyu başlatmadan araçları doğrudan test eder.
Kullanım: python test_server.py
"""
import json
from server import google_search, google_news


def pretty(label: str, result: str):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print('='*60)
    try:
        data = json.loads(result)
        if isinstance(data, list):
            for i, item in enumerate(data, 1):
                print(f"\n[{i}] {item.get('title', '—')}")
                print(f"    URL     : {item.get('url', '—')}")
                src = item.get("source")
                if src:
                    print(f"    Kaynak  : {src}")
                snip = item.get("snippet", "")
                if snip:
                    print(f"    Snippet : {snip[:120]}{'...' if len(snip)>120 else ''}")
        else:
            print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception:
        print(result)


if __name__ == "__main__":
    # --- Web arama testi ---
    pretty(
        "google_search('yapay zeka haberleri', num_results=3)",
        google_search("yapay zeka haberleri", num_results=3),
    )

    # --- Haber arama testi ---
    pretty(
        "google_news('teknoloji haberleri', num_results=3)",
        google_news("teknoloji haberleri", num_results=3),
    )
