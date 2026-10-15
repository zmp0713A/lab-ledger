import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 驱动 AGH `config` 向导，把用户的 Agnes API Key 交给本机 AGH 后端保存。
// 注意：新版向导的提示写在 stderr（旧版在 stdout），且没有账户时不会出现
// 「Account [0 = add]」这一问 —— 两个流都要监听，且按“出现什么问什么”推进。
export function configureKey(apiKey, o) {
  return new Promise((resolve) => {
    const tmpDir = path.join(o.here, '..', '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const env = { ...process.env, AGH_HOME: o.aghHome, TEMP: tmpDir, TMP: tmpDir, PATH: path.dirname(o.nodeExe) + (o.isWin ? ';' : ':') + (process.env.PATH || '') };
    const child = spawn(o.nodeExe, [o.cliEntry, 'config'], { env, stdio: ['pipe', 'pipe', 'pipe'] });

    let outAll = '';
    let settled = false;
    const sent = { name: false, provider: false, auth: false, base: false, key: false, model: false };

    const done = (r) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill(); } catch (e) { }
      resolve(r);
    };
    const timer = setTimeout(() => done({ ok: false, error: '配置超时（180 秒）：向导未按预期推进。最后输出：' + outAll.slice(-300) }), 180000);

    const answer = (s, tag) => {
      try { child.stdin.write(s + '\n'); } catch (e) { }
    };

    // 按当前累计输出决定下一步回答（每条只答一次，顺序推进）
    const maybe = () => {
      if (!sent.name && /Account name:/.test(outAll)) {
        sent.name = true;
        return answer('实验台账AI', 'name');
      }
      if (sent.name && !sent.provider && /Provider \[\d+-\d+\]:/.test(outAll)) {
        sent.provider = true;
        const m = outAll.match(/(\d+)\)\s*[^\n]*Agnes AI/);
        return answer(m ? m[1] : '12', 'provider');
      }
      if (sent.provider && !sent.auth && /Authentication \[/.test(outAll)) {
        sent.auth = true;
        return answer('1', 'auth=api-key');
      }
      if (sent.provider && !sent.base && /Base URL \[/.test(outAll)) {
        sent.base = true;
        return answer('', 'base=default');
      }
      if (sent.base && !sent.key && /API key/.test(outAll)) {
        sent.key = true;
        return answer(apiKey, 'key');
      }
      if (sent.key && !sent.model && /Model \[\d+-\d+\]:/.test(outAll)) {
        sent.model = true;
        const m = outAll.match(/(\d+)\)\s*[^\n]*agnes-3\.0-flash/i) || outAll.match(/(\d+)\)\s*[^\n]*agnes/i);
        return answer(m ? m[1] : '1', 'model');
      }
    };

    const feed = (chunk) => {
      outAll += chunk;
      if (/Configuration saved/.test(outAll)) {
        const restart = /Restart Agnes/.test(outAll);
        return done({ ok: true, text: outAll.slice(-400), restartNeeded: restart });
      }
      if (/configuration test failed|configuration save failed/.test(outAll)) {
        const m = outAll.match(/configuration (?:test|save) failed[^\n]*/);
        return done({ ok: false, error: (m ? m[0] : 'configuration failed').slice(0, 300) });
      }
      maybe();
    };

    child.stdout.on('data', (d) => feed(d.toString()));
    child.stderr.on('data', (d) => feed(d.toString()));
    child.on('error', (e) => done({ ok: false, error: '启动 config 向导失败：' + e.message }));
    child.on('close', () => {
      if (/Configuration saved/.test(outAll)) return done({ ok: true, text: outAll.slice(-400), restartNeeded: /Restart Agnes/.test(outAll) });
      done({ ok: false, error: (outAll.slice(-300) || '配置未完成（向导提前退出）') });
    });
  });
}
