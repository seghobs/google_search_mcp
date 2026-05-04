@echo off
TITLE Google Search MCP Oto-Kurulum
echo ===================================================
echo    Google Search MCP - Otomatik Kurulum Basliyor
echo ===================================================
echo.

echo [1/3] Node.js bagimliliklari yukleniyor...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!! HATA: Node.js bagimliliklari yuklenemedi.
    pause
    exit /b %ERRORLEVEL%
)
echo [+] Node.js bagimliliklari basariyla yuklendi.
echo.

echo [2/3] Python bagimliliklari yukleniyor...
call pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!! HATA: Python bagimliliklari yuklenemedi.
    pause
    exit /b %ERRORLEVEL%
)
echo [+] Python bagimliliklari basariyla yuklendi.
echo.

echo [3/3] Antigravity MCP Yapilandirmasi guncelleniyor...
call python configure_mcp.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!! UYARI: MCP yapilandirmasi otomatik tamamlanamadi.
    echo Lutfen manuel olarak ekleyin.
)
echo.

echo ===================================================
echo    KURULUM TAMAMLANDI!
echo    Google Search MCP artik asistaniniza (Antigravity/Gemini) 
echo    ve Cursor/Claude Desktop gibi araclara eklendi.
echo.
echo    Kullanmaya baslamak icin IDE'nizi yeniden baslatin.
echo ===================================================
echo.
pause
