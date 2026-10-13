import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const dir = 'C:/Users/2007/Documents/deepseek-harness/default-workspace/lab-data-assistant/';
const html = fs.readFileSync(dir + 'index.html', 'utf8');
const noop = () => {};
const fakeCtx = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : noop), set: (t, p, v) => { t[p] = v; return true; } });
const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable', url: 'file:///' + dir + 'index.html', pretendToBeVisual: true,
  beforeParse(win) {
    win.HTMLCanvasElement.prototype.getContext = () => fakeCtx();
    win.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 560, height: 280 });
    win.AbortController = AbortController;
    win.AbortSignal = AbortSignal;   // 让页面用 Node 的 AbortSignal，方能与 Node fetch 匹配
    win.fetch = (...args) => fetch(...args);   // 用 Node 的真实 fetch 直连本地代理
    win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  },
});
const w = dom.window, d = w.document;
const $ = (id) => d.getElementById(id);
const txt = (el) => String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
await new Promise((r) => w.addEventListener('load', r));
await new Promise((r) => setTimeout(r, 500));

console.log('=== 真实端到端：Agnes 提假设 → 引擎检验 → Agnes 下结论 ===');
w.switchExp(0);
w.loadSample();
w.demoBreak();                       // 制造一个异常点，让假设有东西可提
console.log('数据准备：单摆 6 组，已把第 3 行改成异常值');
console.log('引擎事实（节选）：', JSON.stringify({
  validCount: w.evidencePack().validCount,
  mean: w.evidencePack().mean,
  outliers: w.evidencePack().suspectedOutliers,
}));

const t0 = Date.now();
await w.hypothesisRun();
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n总耗时：${secs} 秒`);
console.log('\n--- 面板实际渲染内容 ---');
console.log(txt($('aiOut')));
console.log('--- 渲染结束 ---\n');

const out = txt($('aiOut'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x ? ' → ' + x : '')); } };

check('AI 返回了结构化假设（不是原文兜底）', !out.includes('没有按要求返回结构化假设'), out.slice(0, 80));
check('渲染出「引擎判定」', out.includes('引擎判定'));
check('渲染出检验方式', /drop_one|split_half|column_corr/.test(out));
check('渲染出 AI 结论', out.includes('Agnes 的解释与建议'));
check('标注了「系统草稿」', out.includes('系统草稿'));
check('声明数字由引擎计算', out.includes('数字由本工具的确定性引擎计算'));
check('提示最终由人判断', out.includes('必须由你判断'));
check('AI 结论引用了引擎数字', /\d+\.\d+/.test(out.split('Agnes 的解释与建议')[1] || ''), '结论中未见小数');
check('无 JS 错误', errors.length === 0, errors.join(' | '));

console.log(`\n===== 真实端到端：${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
