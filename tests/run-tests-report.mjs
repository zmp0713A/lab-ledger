import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// 按测试文件自身定位项目目录（可移植；不依赖任何绝对路径）
const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url))).replace(/\\/g, '/') + '/';
const html = fs.readFileSync(dir + 'index.html', 'utf8');
const noop = () => {};
const fakeCtx = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : noop), set: (t, p, v) => { t[p] = v; return true; } });
const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable', url: 'file:///' + dir + 'index.html', pretendToBeVisual: true,
  beforeParse(win) {
    win.HTMLCanvasElement.prototype.getContext = () => fakeCtx();
    win.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 560, height: 280 });
    // 可配置的 AI mock：offline（默认）/ canned / deferred
    let aiMode = 'offline', aiCanned = null;
    win.__aiMode = (m, payload) => { aiMode = m; aiCanned = payload || null; };
    win.__copied = null;
    Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: (t) => { win.__copied = t; return Promise.resolve(); } }, configurable: true });
    win.fetch = (url, opt) => {
      const u = String(url);
      if (u.indexOf('/api/ping') >= 0) return aiMode === 'offline' ? Promise.reject(new Error('offline')) : Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
      if (u.indexOf('/api/doctor') >= 0) return aiMode === 'offline' ? Promise.reject(new Error('offline')) : Promise.resolve({ json: () => Promise.resolve({ ok: true, hasAccount: true, node: 'n', aghCli: 'c', aghHome: 'h' }) });
      if (u.indexOf('/api/ai') >= 0) {
        if (aiMode === 'deferred') return new Promise((res) => { win.__resolveAi = res; });
        if (aiMode === 'canned' && aiCanned) return Promise.resolve({ json: () => Promise.resolve(aiCanned) });
      }
      return Promise.reject(new Error('offline'));
    };
    win.AbortController = AbortController;
    win.print = () => { win.__printed = true; };
    win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  },
});
const w = dom.window, d = w.document;
const $ = (id) => d.getElementById(id);
const txt = (el) => String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
await new Promise((r) => w.addEventListener('load', r));
await new Promise((r) => setTimeout(r, 600));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x ? ' → ' + x : '')); } };

console.log('=== 1) 导出报告：内容完整且真的触发打印 ===');
w.switchExp(0); w.loadSample();
w.printReport();
check('触发了打印', w.__printed === true);
const rv = txt($('reportView'));
check('报告含标题', /数据处理报告/.test(rv));
check('报告含实验名', /单摆测 g/.test(rv));
check('报告含公式', /4π²/.test(rv), rv.slice(0, 80));
check('报告含原始记录', /原始记录/.test(rv) && /50\.0/.test(rv));
check('报告含最终结果', /最终结果/.test(rv) && /9\.80/.test(rv));
check('报告含引擎自检', /引擎自检/.test(rv));
check('报告含异常值说明', /疑似异常值/.test(rv));
check('报告声明导出未发送数据（诚实版）', /导出操作未发送数据/.test(rv) && /经本地代理发送给 Agnes/.test(rv), rv.slice(0, 120));

console.log('\n=== 2) JSON 导出数据结构 ===');
const data = w.buildReportData();
check('含实验、公式、列', data.experiment === '单摆测 g' && !!data.formula && data.columns.length === 3);
check('含 6 行原始数据', data.rawRows.length === 6, 'rows=' + data.rawRows.length);
check('含计算结果与最终值', data.result && /9\.80/.test(data.result.finalResult || ''), JSON.stringify(data.result).slice(0, 80));
check('含自检结果', data.engineSelfCheck && data.engineSelfCheck.passed === true);
check('含校验摘要', typeof data.validationSummary === 'string' && data.validationSummary.length > 0);

console.log('\n=== 3) AI 整理数据：先预览，确认后才写入 ===');
w.switchExp(0); w.loadSample();
const rowsBefore = d.querySelectorAll('#tbl tbody tr').length;
w.aiLastCleanText = '50.0,1.420,6\n50.5,1.430,6';
w.aiFillTable();
const out1 = txt($('aiOut'));
check('显示候选预览表格', /候选数据/.test(out1) && /尚未写入表格/.test(out1));
check('预览阶段表格未被改动', d.querySelectorAll('#tbl tbody tr').length === rowsBefore);
check('有确认按钮', /确认覆盖表格/.test(out1));
w.aiApplyFill();
check('确认后写入 2 行', d.querySelectorAll('#tbl tbody tr').length === 2, 'rows=' + d.querySelectorAll('#tbl tbody tr').length);
check('提示已人工确认', /已按你的确认填入 2 行/.test(txt($('aiOut'))));
w.aiLastCleanText = '50.0,1.420,6';
w.aiFillTable();
check('重新预览不覆盖表格', d.querySelectorAll('#tbl tbody tr').length === 2);
w.aiCancelFill();
check('取消后表格不变', d.querySelectorAll('#tbl tbody tr').length === 2);

console.log('\n=== 4) AI 候选值也必须是合法数字 ===');
w.aiLastCleanText = '50.0,oops,6';
w.aiFillTable();
check('非法候选值被拒绝', /不是合法数字/.test(txt($('aiOut'))), txt($('aiOut')).slice(0, 70));

console.log('\n=== 5) 移动端与打印样式存在 ===');
check('样式含表格横向滚动容器', /tblscroll/.test(html));
check('样式含窄屏断点', /max-width:700px/.test(html));
check('样式含打印时只显示报告', /@media print/.test(html) && /body>\*:not\(#reportView\)/.test(html));
check('hintbox 拼写已修', !/[;{]ont-size/.test(html));

console.log('\n=== 6) 环境自检行（离线时明确说不可用） ===');
w.openAiPanel();
await new Promise((r) => setTimeout(r, 700));
const env = txt($('aiEnv'));
check('离线时环境自检行显示不可用', /环境自检不可用|本机环境/.test(env), env);

console.log('\n=== 8) AI 面板优化：任务提示 / 记忆 / 复制 / 等待计时 ===');
w.__aiMode('canned', { ok: true, text: '这是草稿文本：g = 9.80 m/s²。' });
w.openAiPanel();
await new Promise((r) => setTimeout(r, 300));
// 任务提示行
w.aiTask('ask');
check('任务提示行渲染', /自由提问|物理原理/.test(txt($('aiTaskHint'))), txt($('aiTaskHint')));
check('闭环独立区块存在', !!d.querySelector('.hyposec') && txt(d.querySelector('.hypotitle')).includes('科学假设检验闭环'));
// 发送 → 记忆 + 复制按钮
$('aiInput').value = '单摆为什么摆角要小于5度？';
$('aiSendBtn').dispatchEvent(new w.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 200));
const outAsk = $('aiOut');
check('草稿输出带复制按钮', !!outAsk.querySelector('.copybtn'), outAsk.textContent.slice(0, 40));
check('草稿内容正确显示', txt(outAsk).includes('这是草稿文本'));
// 复制按钮真的复制
outAsk.querySelector('.copybtn').dispatchEvent(new w.Event('click', { bubbles: true }));
check('点击复制得到全文', w.__copied === '这是草稿文本：g = 9.80 m/s²。', String(w.__copied));
// 切换任务不丢回答
w.aiTask('explain_error');
check('切走后输出区为空（该任务无记忆）', txt($('aiOut')).length === 0, txt($('aiOut')));
w.aiTask('ask');
check('切回后上次回答还在', txt($('aiOut')).includes('这是草稿文本'));
// 等待计时：deferred 时显示"已等待"
w.__aiMode('deferred', null);
$('aiInput').value = '再来一个问题';
$('aiSendBtn').dispatchEvent(new w.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 150));
check('等待时显示计时行', !!$('aiWait') && /已等待/.test(txt($('aiWait'))), txt($('aiWait')));
w.__resolveAi({ json: () => Promise.resolve({ ok: true, text: '第二个答案。' }) });
await new Promise((r) => setTimeout(r, 200));
check('返回后计时行消失、结果出现', !$('aiWait') && txt($('aiOut')).includes('第二个答案'), txt($('aiOut')).slice(0, 40));
check('第二次回答也带复制按钮', !!$('aiOut').querySelector('.copybtn'));

console.log('\n=== 9) JS 报错 ===');
check('无运行时错误', errors.length === 0, errors.join(' | '));

console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
