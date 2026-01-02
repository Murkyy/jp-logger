---
description: How to start browser automation for WSL with mirrored networking
---

# Browser Automation Setup for WSL

## Prerequisites (One-Time Setup)

1. Enable WSL2 mirrored networking in `C:\Users\<YourUsername>\.wslconfig`:
```ini
[wsl2]
networkingMode=mirrored
```

2. Restart WSL: `wsl --shutdown` (in PowerShell)

3. Copy Antigravity extension from Brave Nightly to Chrome (if not already done):
```bash
mkdir -p /mnt/c/ChromeDebug/Default/Extensions
cp -r "/mnt/c/Users/Julien/AppData/Local/BraveSoftware/Brave-Browser-Nightly/User Data/Default/Extensions/eeijfnjmjelapkebgockoeaadonbchdd" /mnt/c/ChromeDebug/Default/Extensions/
```

## Per-Session Setup

// turbo-all

1. Kill any existing browser instances on port 9222 and start Chrome with remote debugging:
```bash
powershell.exe -Command "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep 2; Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--remote-debugging-port=9222','--no-first-run','--no-default-browser-check','--user-data-dir=C:\ChromeDebug'"
```

2. Verify Chrome is ready (wait for JSON response with "Browser" field):
```bash
sleep 3 && curl -s http://127.0.0.1:9222/json/version
```

## Troubleshooting

### Port 9222 Already in Use
If another browser (e.g., Brave) is using port 9222:
```bash
powershell.exe -Command "netstat -ano | findstr ':9222' | findstr 'LISTEN'"
# Then kill the process using the PID shown:
powershell.exe -Command "taskkill /F /PID <PID>"
```

### Chrome Not Responding on Port 9222
- Make sure ALL Chrome/Brave windows are closed before starting with debug flag
- Chrome must be started fresh with `--remote-debugging-port=9222`
- Using `--user-data-dir=C:\ChromeDebug` creates a separate profile to avoid conflicts

### Extension Not Loading
The Antigravity Browser Extension must be installed in the Chrome profile. If it's missing:
1. Copy from Brave Nightly (see prerequisites)
2. Or manually enable it in `chrome://extensions` in the debug Chrome instance
