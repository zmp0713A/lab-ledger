@echo off
echo [%DATE% %TIME%] autostart entry fired >> "%~dp0autostart-check.log"
:loop
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0ai-proxy-watchdog.ps1"
echo [%DATE% %TIME%] watchdog exited, restarting >> "%~dp0autostart-check.log"
timeout /t 5 /nobreak >nul
goto loop