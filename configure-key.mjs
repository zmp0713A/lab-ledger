import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function configureKey(apiKey, o) {
  return new Promise((resolve) => {
    const tmpDir = path.join(o.here, '..', '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const env = { ...process.env, AGH_HOME: o.aghHome, TEMP: tmpDir, TMP: tmpDir, PATH: path.dirname(o.nodeExe) + (o.isWin ? ';' : ':') + (process.env.PATH || '') };
    const child = spawn(o.nodeExe, [o.cliEntry, 'config'], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let outAll = '';
    const sent = { add: false, name: false, provider: false, base: false, key: false, model: false };
    const timer = setTimeout(() => { try { child.kill(); } catch (e) { } resolve({ ok: false, error: '配置超时（180 秒）' }); }, 180000);
    const maybe = () => {
      if (!sent.add && /Account \[0 = add\]/.test(outAll)) { sent.add = true; child.stdin.write('0\n'); }
      else if (sent.add && !sent.name && /Account name:/.test(outAll)) { sent.name = true; child.stdin.write('实验台账AI\n'); }
      else if (sent.name && !sent.provider && /Provider \[/.test(outAll)) {
        sent.provider = true;
        const m = outAll.match(/(\d+)\)\s*[^\n]*agnes-ai/);
        child.stdin.write((m ? m[1] : '1') + '\n');
      }
      else if (sent.provider && !sent.base && /Base URL/.test(outAll)) { sent.base = true; child.stdin.write('\n'); }
      else if (sent.base && !sent.key && /API key/.test(outAll)) { sent.key = true; child.stdin.write(apiKey + '\n'); }
      else if (sent.key && !sent.model && /Model \[/.test(outAll)) {
        sent.model = true;
        const m = outAll.match(/(\d+)\)\s*[^\n]*agnes-3\.0-flash/);
        child.stdin.write((m ? m[1] : '1') + '\n');
      }
    };
    child.stdout.on('data', (d) => {
      outAll += d.toString();
      if (/Saved/.test(outAll)) { clearTimeout(timer); resolve({ ok: true, text: outAll.slice(-300) }); return; }
      if (/configuration test failed|configuration:/.test(outAll)) { clearTimeout(timer); try { child.kill(); } catch (e) { } resolve({ ok: false, error: outAll.slice(-200) }); return; }
      maybe();
    });
    child.stderr.on('data', () => { });
    child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: '启动 config 向导失败：' + e.message }); });
    child.on('close', () => {
      if (/Saved/.test(outAll)) { clearTimeout(timer); resolve({ ok: true, text: outAll.slice(-300) }); }
      else { clearTimeout(timer); resolve({ ok: false, error: outAll.slice(-200) || '配置未完成' }); }
    });
  });
}
