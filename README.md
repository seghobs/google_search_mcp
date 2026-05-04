# Google Search MCP Server (Stealth & Fast)

Bu proje, yapay zeka asistanları (Claude, Cursor, Antigravity vb.) için gelişmiş bir Google arama altyapısı sunar. Hem hız hem de gizlilik (anti-bot) odaklı iki farklı sunucu içerir.

## 🚀 Özellikler

- **Gizli Mod (Stealth)**: Playwright + Fingerprint kullanarak Google'ın bot korumalarını aşar.
- **Warm Browser**: Tarayıcıyı açık tutarak sonraki aramaları anında gerçekleştirir.
- **Derin Arama**: İlk sayfada sonuç bulamazsa otomatik olarak sonraki sayfalara geçer.
- **Haber Araması**: Google Haberler üzerinden güncel içeriklere erişim.
- **Hızlı Mod**: Python tabanlı hafif ve seri arama.

---

## 📖 Kullanım Kılavuzu ve Tetikleyiciler

Yapay zeka asistanına (Claude, Cursor vb.) aşağıdaki komutları vererek araçları tetikleyebilirsiniz:

### 1. Gizli Arama (Playwright + Fingerprint)
Google'ın bot korumasını aşmak ve en güvenilir veriyi almak için:
- *"**Gizli arama** kullanarak [konu] hakkında bilgi bul."*
- *"**Stealth search** yap: [konu]"*
- *"Google'da **detaylı ve gizli** bir araştırma yap."*
- *"Bot korumasına takılmadan [konu] araması yap."*

### 2. Haber Araması
- *"**Güncel haberleri** getir: [konu]"*
- *"**Google Haberler**'de [konu] araması yap."*
- *"[konu] ile ilgili **son dakika haberleri** neler?"*

### 3. Standart / Hızlı Arama
- *"Google'da **hızlıca** [konu] ara."*
- *"Arama yap: [konu]"*

---

## 💡 Profesyonel İpucu (Kesin Tetikleme)

Eğer yapay zeka bazen araçları kullanmak yerine kendi (eski) bilgisinden cevap veriyorsa, ona şu şekilde **kesin emir** verebilirsiniz:

> **"Kendi bilgini kullanma, `google_search_stealth` aracını kullanarak internetten en güncel 10 sonucu getir ve bana özetle."**

### Arka Plandaki Araç İsimleri:
- `google_search_stealth`: Playwright ile derin, gizli ve garantili arama.
- `google_news_stealth`: Gizli haber araması.
- `google_search`: Hızlı, standart web araması.
- `google_news`: Hızlı haber araması.

---

## 🛠️ Kurulum ve Yapılandırma

### 1. Gereksinimler
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Windows İşletim Sistemi** (Stealth mod için gereklidir)

### 2. Yükleme
En kolay kurulum için proje dizinindeki **`oto_kurulum.bat`** dosyasını çift tıklayarak çalıştırın.

Alternatif olarak terminal üzerinden manuel yükleme yapabilirsiniz:
```bash
# Node.js bağımlılıkları
npm install

# Python bağımlılıkları
pip install -r requirements.txt
```

### 3. IDE Entegrasyonu (Claude Desktop, Cursor vb.)
Aşağıdaki yapılandırmayı `mcp_config.json` veya Claude Desktop ayarlarınıza ekleyin. 
**NOT:** Dosya yollarını (`C:/...`) kendi bilgisayarınıza göre güncellediğimden emin olun.

#### 🕵️ Stealth (Gizli) Sunucu - Önerilen
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

#### ⚡ Hızlı Sunucu
```json
{
  "mcpServers": {
    "google-search-fast": {
      "command": "python",
      "args": ["C:/Users/user/Desktop/google-search-mcp/server.py"]
    }
  }
}
```

---

## ⚠️ Önemli Notlar
- **Windows**: Stealth modu (parmak izi koruması) sadece Windows üzerinde çalışır.
- **Fingerprint**: Ücretsiz sürüm kullanıldığı için ilk arama (tarayıcı açılışı) 20-30 saniye sürebilir. Sonraki aramalar "Warm Browser" sayesinde çok daha hızlıdır.
