@echo off
chcp 65001 >nul
title 实验台账 - 本地 AI 代理
setlocal
set "NODE="
if exist "%~dp0runtime\node\node.exe" set "NODE=%~dp0runtime\node\node.exe"
if not defined NODE if exist "%~dp0..\runtime\node\node.exe" set "NODE=%~dp0..\runtime\node\node.exe"
if not defined NODE if exist "%~dp0..\agh-setup\node-v24.21.0-win-x64\node.exe" set "NODE=%~dp0..\agh-setup\node-v24.21.0-win-x64\node.exe"
if not defined NODE if exist "%~dp0..\AGH环境\node-v24.21.0-win-x64\node.exe" set "NODE=%~dp0..\AGH环境\node-v24.21.0-win-x64\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\..\Documents\AGH环境\node-v24.21.0-win-x64\node.exe" set "NODE=%LOCALAPPDATA%\..\Documents\AGH环境\node-v24.21.0-win-x64\node.exe"
if not defined NODE set "NODE=node"
echo ==========================================
echo   实验台账 · 本地 AI 代理
echo   保持此窗口开着，网页里的 AI 助手才能用
echo   关掉窗口只影响 AI 助手，工具本身照常可用
echo ==========================================
"%NODE%" "%~dp0ai-proxy.mjs"
echo.
echo 代理已退出。按任意键关闭...
pause >nul
endlocal
