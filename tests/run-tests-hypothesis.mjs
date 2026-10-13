import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const dir = 'C:/Users/2007/Documents/deepseek-harness/default-workspace/lab-data-assistant/';
const html = fs.readFileSync(dir + 'index.html', 'utf8');
const noop = () => {};
const fakeCtx = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : noop), set: (t, p, v) => { t[p] = v; return true; } });

// 可控的假 AI：按调用顺序返回预设响应
let aiQueue = [];
const calls = [];
const mkDom = () => {
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: 'usable', url: 'file:///' + dir + 'index.html', pretendToBeVisual: true,
    beforeParse(win) {
      win.HTMLCanvasElement.prototype.getContext = () => fakeCtx();
      win.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 560, height: 280 });
      win.AbortController = AbortController;
      win.fetch = (url, opt) => {
        if (String(url).indexOf('/api/ping') >= 0) return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
        if (String(url).indexOf('/api/doctor') >= 0) return Promise.resolve({ json: () => Promise.resolve({ ok: true, hasAccount: true }) });
        if (String(url).indexOf('/api/ai') >= 0) {
          const body = JSON.parse(opt.body);
          calls.push(body.task);
          const next = aiQueue.shift();
          if (!next) return Promise.reject(new Error('no canned response'));
          return Promise.resolve({ json: () => Promise.resolve(next) });
        }
        return Promise.reject(new Error('unexpected url'));
      };
      win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
    },
  });
  return { dom, errors };
};
const first = mkDom();
const w = first.dom.window, d = w.document;
const $ = (id) => d.getElementById(id);
const txt = (el) => String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
await new Promise((r) => w.addEventListener('load', r));
await new Promise((r) => setTimeout(r, 600));

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x ? ' → ' + x : '')); } };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

console.log('=== 1) 引擎检验①：剔除单点（数学正确性用测试独立复算） ===');
w.switchExp(0); w.loadSample();
const res0 = w.computeAll();
const drop3 = w.testDropOne(3);
const kept = res0.valid.filter((v) => v.row !== 3).map((v) => v.g);
const expMean = kept.reduce((a, b) => a + b, 0) / kept.length;
const expSD = Math.sqrt(kept.reduce((a, b) => a + Math.pow(b - expMean, 2), 0) / (kept.length - 1));
check('droppedRow 正确', drop3.droppedRow === 3);
check('remaining = 5', drop3.remaining === 5);
check('meanAfter 与独立复算一致', near(drop3.meanAfter, expMean, 1e-7), drop3.meanAfter + ' vs ' + expMean);
check('sampleSDAfter 与独立复算一致', near(drop3.sampleSDAfter, expSD, 1e-6), drop3.sampleSDAfter + ' vs ' + expSD);
check('closerToStandard / sdShrank 是布尔', typeof drop3.closerToStandard === 'boolean' && typeof drop3.sdShrank === 'boolean');
check('无效行号被拒绝', w.testDropOne(99).ok === false);
w.switchExp(0);
[...d.querySelectorAll('#tbl tbody tr')].forEach((r, i) => { if (i > 2) r.remove(); });
w.recompute();
check('有效组数不足时拒绝剔除检验', w.testDropOne(3).ok === false, JSON.stringify(w.testDropOne(3)));

console.log('\n=== 2) 引擎检验②：前后半段漂移 ===');
w.switchExp(0); w.loadSample();
const sh = w.testSplitHalf();
const v = w.computeAll().valid.slice().sort((a, b) => a.row - b.row);
const half = Math.floor(v.length / 2);
const ma = v.slice(0, half).reduce((s, x) => s + x.g, 0) / half;
const mb = v.slice(v.length - half).reduce((s, x) => s + x.g, 0) / half;
check('firstMean 正确', near(sh.firstMean, ma, 1e-7), sh.firstMean + ' vs ' + ma);
check('lastMean 正确', near(sh.lastMean, mb, 1e-7), sh.lastMean + ' vs ' + mb);
check('difference = 后半 − 前半', near(sh.difference, mb - ma, 1e-7));
check('differenceInSD = 差值/标准差', near(sh.differenceInSD, (mb - ma) / w.computeAll().sd, 1e-4));
check('notable 是布尔', typeof sh.notable === 'boolean');

console.log('\n=== 3) 引擎检验③：列相关性（用完美线性关系验证） ===');
w.switchExp(1); // 伏安法：列0 电压U，列1 电流I
const rows = [...d.querySelectorAll('#tbl tbody tr')];
const Us = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
rows.forEach((r, i) => {
  const ins = r.querySelectorAll('input');
  ins[0].value = String(Us[i]);
  ins[1].value = String(Us[i] / 50);
});
w.recompute();
const corr = w.testColumnCorr(0, 1);
check('完美正相关 r ≈ 1', near(corr.r, 1, 1e-3), 'r=' + corr.r);
check('r² ≈ 1', near(corr.r2, 1, 1e-3), 'r2=' + corr.r2);
check('方向为正相关', corr.direction === '正相关', corr.direction);
check('strong = true', corr.strong === true);
check('列越界被拒绝', w.testColumnCorr(0, 9).ok === false);
// 常数列 → 无法计算
rows.forEach((r) => { r.querySelectorAll('input')[0].value = '2.0'; });
w.recompute();
check('某列无变化时拒绝', w.testColumnCorr(0, 1).ok === false, JSON.stringify(w.testColumnCorr(0, 1)));

console.log('\n=== 4) JSON 提取鲁棒性 ===');
const ex = w.extractHypotheses;
check('纯 JSON', !!ex('{"hypotheses":[{"id":1,"test":"split_half"}]}'));
check('带前后废话', !!ex('好的，我的假设是：{"hypotheses":[{"id":1,"claim":"a","test":"drop_one","row":3}]} 以上。'));
check('markdown 代码块', !!ex('```json\n{"hypotheses":[{"id":1,"test":"split_half"}]}\n```'));
check('含花括号字符串不被截断', !!ex('{"hypotheses":[{"id":1,"claim":"若 { 出现","test":"split_half"}]}'));
check('空 hypotheses 视为失败', ex('{"hypotheses":[]}') === null);
check('非 JSON 返回 null', ex('我不会输出 JSON') === null);
check('空输入返回 null', ex('') === null);

console.log('\n=== 5) 完整闭环（假 AI：提假设 → 引擎检验 → 下结论） ===');
aiQueue = [
  { ok: true, text: '{"hypotheses":[{"id":1,"claim":"第3组周期偏小源于计时起点提前","predicts":"剔除后相对误差变小","test":"drop_one","row":3},{"id":2,"claim":"后半段存在系统性漂移","predicts":"前后半段均值差超过一个标准差","test":"split_half"}]}' },
  { ok: true, text: '检验结论：假设1 …\n可能原因：…\n建议：…' },
];
calls.length = 0;
w.switchExp(0); w.loadSample();
await w.hypothesisRun();
await new Promise((r) => setTimeout(r, 200));
const out = txt($('aiOut'));
check('共发起两次 AI 调用', calls.length === 2, 'calls=' + JSON.stringify(calls));
check('第一次是 hypothesis_propose', calls[0] === 'hypothesis_propose', String(calls[0]));
check('第二次是 hypothesis_conclude', calls[1] === 'hypothesis_conclude', String(calls[1]));
check('渲染出假设1 的原文', out.includes('第3组周期偏小源于计时起点提前'));
check('渲染出假设2 的原文', out.includes('后半段存在系统性漂移'));
check('显示引擎判定（不是 AI 判定）', out.includes('引擎判定'));
check('显示检验方式', out.includes('drop_one') && out.includes('split_half'));
check('显示 AI 结论并标注草稿', out.includes('系统草稿') && out.includes('Agnes 的解释与建议'));
check('声明分工（数字由引擎算）', out.includes('数字由本工具的确定性引擎计算'));
check('提示最终由人判断', out.includes('必须由你判断'));

console.log('\n=== 6) 异常路径 ===');
aiQueue = [{ ok: true, text: '我不太想输出 JSON，这是纯文字回答。' }];
calls.length = 0;
await w.hypothesisRun();
await new Promise((r) => setTimeout(r, 150));
const out2 = txt($('aiOut'));
check('AI 不给 JSON 时不崩、给原文', out2.includes('没有按要求返回结构化假设') && out2.includes('我不太想输出 JSON'));
check('未做任何自动检验（未第二次调用）', calls.length === 1, 'calls=' + calls.length);

aiQueue = [{ ok: false, error: 'AI 代理连接失败：模拟故障' }];
calls.length = 0;
await w.hypothesisRun();
await new Promise((r) => setTimeout(r, 150));
check('AI 调用失败时明确报错', txt($('aiOut')).includes('模拟故障'), txt($('aiOut')).slice(0, 60));

aiQueue = [];
calls.length = 0;
w.switchExp(0);
[...d.querySelectorAll('#tbl tbody tr')].forEach((r, i) => { if (i > 1) r.remove(); });
w.recompute();
await w.hypothesisRun();
await new Promise((r) => setTimeout(r, 100));
check('有效数据不足 3 组时拒绝运行', txt($('aiOut')).includes('至少需要 3 组有效数据'), txt($('aiOut')).slice(0, 60));
check('拒绝时未调用 AI', calls.length === 0, 'calls=' + calls.length);

console.log('\n=== 7) 复查修复回归：XSS 与全同数据 ===');
// XSS：AI 返回恶意 id（img 标签）→ 渲染后必须被转义，不得产生真实元素
w.switchExp(0); w.loadSample();
aiQueue = [
  { ok: true, text: '{"hypotheses":[{"id":"<img src=x onerror=alert(1)>","claim":"第3组计时出错","predicts":"剔除后更接近","test":"drop_one","row":3}]}' },
  { ok: true, text: '结论：假设1被支持。' },
];
await w.hypothesisRun();
await new Promise((r) => setTimeout(r, 200));
const outX = $('aiOut');
check('恶意 id 未生成 img 元素', outX.querySelectorAll('img').length === 0, 'img 数量=' + outX.querySelectorAll('img').length);
check('恶意 id 以转义文本显示', outX.textContent.includes('<img src=x onerror=alert(1)>'));
check('其它内容仍正常渲染', txt(outX).includes('引擎判定') && txt(outX).includes('Agnes 的解释与建议'));

// 全同数据：标准差为 0 → testSplitHalf 必须明确拒绝，不得产出 NaN
w.switchExp(1);
const rows2 = [...d.querySelectorAll('#tbl tbody tr')];
rows2.forEach((r) => {
  const ins = r.querySelectorAll('input');
  ins[0].value = '1.0'; ins[1].value = '0.02';
});
w.recompute();
const sh0 = w.testSplitHalf();
check('全同数据时拒绝分段检验', sh0.ok === false && /标准差为 0/.test(sh0.reason || ''), JSON.stringify(sh0));
const corrSame = w.testColumnCorr(0, 0);
check('同列自相关被拒绝', corrSame.ok === false && /自相关/.test(corrSame.reason || ''), JSON.stringify(corrSame));

console.log('\n=== 8) 物理模型检验 model_fit ===');
// 载入不同摆长数据
w.switchExp(0);
w.loadModelSample();
const mf = w.testModelFit();
check('模型检验可用', mf.ok === true, JSON.stringify(mf).slice(0, 100));
check('由斜率反推 g ≈ 9.79', Math.abs(mf.derivedValue - 9.79) < 0.1, 'g=' + mf.derivedValue);
check('被判定为支持模型', mf.supported === true);
check('斜率 ≈ 4π²/g ≈ 4.03', Math.abs(mf.slope - 4.0325) < 0.05, 'k=' + mf.slope);
check('R² ≈ 1（数据几乎完美线性）', mf.r2 > 0.999, 'r2=' + mf.r2);
// 独立复算斜率（测试自己从表格数据算一遍，再和引擎结果比）
const rows3 = [...d.querySelectorAll('#tbl tbody tr')];
const X = [], Y = [];
rows3.forEach((r) => {
  const ins = r.querySelectorAll('input');
  const L = Number(ins[0].value) / 100, T = Number(ins[1].value);
  X.push(L); Y.push(T * T);
});
const n3 = X.length, mx3 = X.reduce((a, b) => a + b, 0) / n3, my3 = Y.reduce((a, b) => a + b, 0) / n3;
let sxy3 = 0, sxx3 = 0;
for (let i = 0; i < n3; i++) { sxy3 += (X[i] - mx3) * (Y[i] - my3); sxx3 += (X[i] - mx3) * (X[i] - mx3); }
const k3 = sxy3 / sxx3;
check('引擎斜率与独立复算一致', Math.abs(mf.slope - k3) < 1e-4, mf.slope + ' vs ' + k3);
check('反推值 = 4π²/斜率', Math.abs(mf.derivedValue - 4 * Math.PI * Math.PI / mf.slope) < 1e-4, mf.derivedValue + ' vs ' + 4 * Math.PI * Math.PI / mf.slope);
check('偏差按百分比给出', Math.abs(mf.relativeDeviationPercent - Math.abs(mf.derivedValue - 9.79) / 9.79 * 100) < 0.01);
// 拒绝路径
w.loadSample();
const mf2 = w.testModelFit();
check('摆长全相同时拒绝并提示', mf2.ok === false && /全部相同|不同摆长/.test(mf2.reason || ''), JSON.stringify(mf2));
w.switchExp(1); w.loadSample();
const mf3 = w.testModelFit();
check('无配置的实验拒绝', mf3.ok === false && /没有配置/.test(mf3.reason || ''), JSON.stringify(mf3));
// 全流程：假 AI 提出 model_fit
w.switchExp(0); w.loadModelSample();
aiQueue = [
  { ok: true, text: '{"hypotheses":[{"id":1,"claim":"单摆数据符合简谐运动模型 T=2π√(L/g)","predicts":"T² 与 L 成正比，斜率反推的 g 应接近 9.79","test":"model_fit"}]}' },
  { ok: true, text: '结论：数据支持简谐模型。' },
];
await w.hypothesisRun();
await new Promise((r) => setTimeout(r, 200));
const outM = txt($('aiOut'));
check('闭环渲染出模型检验判定', outM.includes('反推 g') && outM.includes('数据支持该物理模型'), outM.slice(0, 100));
check('渲染出定律文字与拟合细节', outM.includes('T = 2π√(L/g)') && outM.includes('斜率 k'), outM.slice(0, 140));

console.log('\n=== 9) 无运行时错误 ===');
check('无 JS 错误', first.errors.length === 0, first.errors.join(' | '));
check('AI 面板有假设检验按钮', !!$('aiHypoBtn'));

console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
