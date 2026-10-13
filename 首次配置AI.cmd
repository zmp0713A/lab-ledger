@echo off
chcp 65001 >nul
title 实验台账 - 首次配置 AI 助手（只需一次）
echo ============================================
echo   首次配置 AI 助手（每台电脑只需做一次）
echo   浏览器会自动打开 AGH 设置页面，请：
echo     1. 点「添加账户」
echo     2. 供应商选 Agnes AI
echo     3. 粘贴你自己的 API Key
echo     4. 保存
echo ============================================
set "NODE="
set "CLI="
if exist "%~dp0..\AGH环境\node-v24.21.0-win-x64\node.exe" set "NODE=%~dp0..\AGH环境\node-v24.21.0-win-x64\node.exe"
if not defined NODE if exist "%~dp0..\agh-setup\node-v24.21.0-win-x64\node.exe" set "NODE=%~dp0..\agh-setup\node-v24.21.0-win-x64\node.exe"
if exist "%~dp0..\AGH环境\agnes-harness-main\packages\cli\dist\local\agnes.mjs" set "CLI=%~dp0..\AGH环境\agnes-harness-main\packages\cli\dist\local\agnes.mjs"
if not defined CLI if exist "%~dp0..\agnes-harness-main\packages\cli\dist\local\agnes.mjs" set "CLI=%~dp0..\agnes-harness-main\packages\cli\dist\local\agnes.mjs"
if not defined NODE echo [错误] 找不到 Node 运行环境（AGH环境\node-v24.21.0-win-x64） & pause & exit /b 1
if not defined CLI echo [错误] 找不到 AGH 运行包（AGH环境\agnes-harness-main） & pause & exit /b 1
cd /d "%~dp0.."
"%NODE%" "%CLI%" serve --port 4188
echo.
echo 配置完成后，以后双击「启动AI代理.cmd」即可。
pause >nul
