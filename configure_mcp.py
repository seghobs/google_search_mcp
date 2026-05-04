import json
import os
import sys

def configure():
    # 1. Determine paths
    user_profile = os.environ.get('USERPROFILE')
    if not user_profile:
        print("!!! HATA: USERPROFILE dizini bulunamadi.")
        return

    config_path = os.path.join(user_profile, '.gemini', 'antigravity', 'mcp_config.json')
    current_dir = os.getcwd().replace('\\', '/')
    
    print(f"[*] MCP Ayar Dosyasi: {config_path}")
    
    # 2. Check if config exists
    if not os.path.exists(config_path):
        print("[!] mcp_config.json bulunamadi, yeni oluşturuluyor...")
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        config = {"mcpServers": {}}
    else:
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception as e:
            print(f"!!! HATA: Yapilandirma dosyasi okunamadi: {e}")
            return

    if "mcpServers" not in config:
        config["mcpServers"] = {}

    # 3. Add new servers
    changed = False
    
    # Stealth Node.js Server
    stealth_name = "google-search-stealth"
    stealth_config = {
        "command": "node",
        "args": [f"{current_dir}/src/mcp_server.js"],
        "env": { "FINGERPRINT_KEY": "" }
    }
    
    if stealth_name not in config["mcpServers"] or config["mcpServers"][stealth_name] != stealth_config:
        config["mcpServers"][stealth_name] = stealth_config
        print(f"[+] '{stealth_name}' eklendi/guncellendi.")
        changed = True

    # Fast Python Server
    fast_name = "google-search-fast"
    fast_config = {
        "command": "python",
        "args": [f"{current_dir}/server.py"]
    }

    if fast_name not in config["mcpServers"] or config["mcpServers"][fast_name] != fast_config:
        config["mcpServers"][fast_name] = fast_config
        print(f"[+] '{fast_name}' eklendi/guncellendi.")
        changed = True

    # 4. Save
    if changed:
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print("[OK] MCP Yapilandirmasi basariyla kaydedildi.")
        except Exception as e:
            print(f"!!! HATA: Kaydedilirken sorun olustu: {e}")
    else:
        print("[*] Yapilandirma zaten guncel.")

if __name__ == "__main__":
    configure()
