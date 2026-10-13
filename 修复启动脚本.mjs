// 维护脚本：把启动/配置脚本规范化成 CRLF + 路径加引号（cmd.exe 要求）
// 用法：node 修复启动脚本.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const AI_PROXY_LINES = [
  '@echo off',
  'chcp 65001 >nul',
  'title 实验台账 - 本地 AI 代理',
  'setlocal',
  'set "NODE="',
  'if exist "%~dp0runtime\\node\\node.exe" set "NODE=%~dp0runtime\\node\\node.exe"',
  'if not defined NODE if exist "%~dp0..\\runtime\\node\\node.exe" set "NODE=%~dp0..\\runtime\\node\\node.exe"',
  'if not defined NODE if exist "%~dp0..\\agh-setup\\node-v24.21.0-win-x64\\node.exe" set "NODE=%~dp0..\\agh-setup\\node-v24.21.0-win-x64\\node.exe"',
  'if not defined NODE if exist "%~dp0..\\AGH环境\\node-v24.21.0-win-x64\\node.exe" set "NODE=%~dp0..\\AGH环境\\node-v24.21.0-win-x64\\node.exe"',
  'if not defined NODE if exist "%LOCALAPPDATA%\\..\\Documents\\AGH环境\\node-v24.21.0-win-x64\\node.exe" set "NODE=%LOCALAPPDATA%\\..\\Documents\\AGH环境\\node-v24.21.0-win-x64\\node.exe"',
  'if not defined NODE set "NODE=node"',
  'echo ==========================================',
  'echo   实验台账 · 本地 AI 代理',
  'echo   保持此窗口开着，网页里的 AI 助手才能用',
  'echo   关掉窗口只影响 AI 助手，工具本身照常可用',
  'echo ==========================================',
  '"%NODE%" "%~dp0ai-proxy.mjs"',
  'echo.',
  'echo 代理已退出。按任意键关闭...',
  'pause >nul',
  'endlocal',
  '',
];

const FILES = {
  '启动AI代理.cmd': AI_PROXY_LINES,
  '启动实验台账.cmd': AI_PROXY_LINES,
  '首次配置AI.cmd': [
    '@echo off',
    'chcp 65001 >nul',
    'title 实验台账 - 首次配置 AI 助手（只需一次）',
    'echo ============================================',
    'echo   首次配置 AI 助手（每台电脑只需做一次）',
    'echo   浏览器会自动打开 AGH 设置页面，请：',
    'echo     1. 点「添加账户」',
    'echo     2. 供应商选 Agnes AI',
    'echo     3. 粘贴你自己的 API Key',
    'echo     4. 保存',
    'echo ============================================',
    'set "NODE="',
    'set "CLI="',
    'if exist "%~dp0..\\AGH环境\\node-v24.21.0-win-x64\\node.exe" set "NODE=%~dp0..\\AGH环境\\node-v24.21.0-win-x64\\node.exe"',
    'if not defined NODE if exist "%~dp0..\\agh-setup\\node-v24.21.0-win-x64\\node.exe" set "NODE=%~dp0..\\agh-setup\\node-v24.21.0-win-x64\\node.exe"',
    'if exist "%~dp0..\\AGH环境\\agnes-harness-main\\packages\\cli\\dist\\local\\agnes.mjs" set "CLI=%~dp0..\\AGH环境\\agnes-harness-main\\packages\\cli\\dist\\local\\agnes.mjs"',
    'if not defined CLI if exist "%~dp0..\\agnes-harness-main\\packages\\cli\\dist\\local\\agnes.mjs" set "CLI=%~dp0..\\agnes-harness-main\\packages\\cli\\dist\\local\\agnes.mjs"',
    'if not defined NODE echo [错误] 找不到 Node 运行环境（AGH环境\\node-v24.21.0-win-x64） & pause & exit /b 1',
    'if not defined CLI echo [错误] 找不到 AGH 运行包（AGH环境\\agnes-harness-main） & pause & exit /b 1',
    'cd /d "%~dp0.."',
    '"%NODE%" "%CLI%" serve --port 4188',
    'echo.',
    'echo 配置完成后，以后双击「启动AI代理.cmd」即可。',
    'pause >nul',
    '',
  ],
};

for (const [name, lines] of Object.entries(FILES)) {
  const body = lines.join('\r\n');
  const p = path.join(here, name);
  fs.writeFileSync(p, body, { encoding: 'utf8' });
  const buf = fs.readFileSync(p);
  const crlf = (buf.toString('utf8').match(/\r\n/g) || []).length;
  const lfOnly = (buf.toString('utf8').match(/(?<!\r)\n/g) || []).length;
  console.log('已写入 ' + name + '：' + buf.length + ' 字节，CRLF ' + crlf + ' 处，裸 LF ' + lfOnly + ' 处');
}
