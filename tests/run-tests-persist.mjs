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
// 内存版 localStorage（file:// 下 jsdom 不给真 localStorage，产品代码里已有 try/catch 兜底）
const store = {};
const mockLS = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};
const dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable', url: 'file:///' + dir + 'index.html', pretendToBeVisual: true,
  beforeParse(win) {
    win.HTMLCanvasElement.prototype.getContext = () => fakeCtx();
    win.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 560, height: 280 });
    try { Object.defineProperty(win, 'localStorage', { value: mockLS, configurable: true }); } catch (e) { }
    win.fetch = () => Promise.reject(new Error('offline'));
    win.AbortController = AbortController;
    win.URL.createObjectURL = () => 'blob:mock';
    win.URL.revokeObjectURL = () => {};
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
const rowsOf = () => [...d.querySelectorAll('#tbl tbody tr')].map((r) => [...r.querySelectorAll('input')].map((i) => i.value));
const clearAll = () => { d.querySelector('#tbl tbody').innerHTML = ''; for (let i = 0; i < 6; i++) w.addRow(null); w.reindex(); };

console.log('=== 1) 自动草稿：保存 → 清空 → 恢复 ===');
w.switchExp(0); w.loadSample();
const before = rowsOf();
check('示例载入 6 行', before.length === 6 && before[0][0] === '50.00');
check('草稿已自动保存（状态行）', /草稿已自动保存/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('localStorage 里真的有数据', /lab-ledger:6/.test('x') || store['lab-ledger:drafts:v1'] !== undefined);
clearAll();
check('清空后表格全空', rowsOf().every((r) => r.every((c) => c === '')));
const restored = w.restoreDraftForExperiment(0);
check('恢复返回 true', restored === true);
const after = rowsOf();
check('恢复后与保存时一致', after.length === before.length && after[0][0] === '50.00' && after[5][1] === before[5][1], JSON.stringify(after[0]));
check('恢复状态提示', /已恢复本机草稿/.test(txt($('draftStatus'))), txt($('draftStatus')));

console.log('\n=== 2) 草稿按实验隔离 ===');
w.switchExp(1); w.loadSample();
const exp1rows = rowsOf();
check('实验1 草稿状态', /草稿已自动保存/.test(txt($('draftStatus'))));
w.switchExp(0);
const back0 = rowsOf();
check('切回实验0 是实验0 的草稿（不是实验1 的数据）', back0[0][0] === '50.00', JSON.stringify(back0[0]));
w.switchExp(1);
check('再切实验1 恢复其草稿', rowsOf()[0][0] === exp1rows[0][0], JSON.stringify(rowsOf()[0]));

console.log('\n=== 3) 项目文件：导出 → 解析 → 载入 ===');
w.switchExp(0); w.loadSample();
const text = w.projectFileText();
const obj = JSON.parse(text);
check('项目文件带 app/format 标识', obj.app === 'lab-ledger' && obj.format === 'project' && obj.version === 1);
check('项目文件含实验名与列', obj.experiment === '单摆测 g' && obj.columns.length === 3);
check('项目文件含 6 行原始读数', obj.rows.length === 6 && obj.rows[0][0] === '50.00');
clearAll();
const ok1 = w.loadProjectText(text);
check('载入成功', ok1 === true);
check('载入后数据还原', rowsOf()[0][0] === '50.00' && rowsOf()[5][1] === '1.417');
check('载入状态提示', /已载入 6 行/.test(txt($('draftStatus'))), txt($('draftStatus')));

console.log('\n=== 4) 导出快照（导出数据 JSON）也能载入 ===');
w.switchExp(0); w.loadSample();
const snap = JSON.stringify(w.buildReportData());
clearAll();
const ok2 = w.loadProjectText(snap);
check('报告快照载入成功', ok2 === true);
check('快照载入后数据还原', rowsOf()[0][0] === '50.00' && rowsOf().length === 6);

console.log('\n=== 5) 载入失败的各种拒绝路径 ===');
check('垃圾文本被拒', w.loadProjectText('不是json{{') === false && /载入失败/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('列数不符被拒', w.loadProjectText(JSON.stringify({ app: 'lab-ledger', format: 'project', version: 1, experiment: '单摆测 g', rows: [['50.00', '1.420']] })) === false && /3 列/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('非法数字被拒', w.loadProjectText(JSON.stringify({ app: 'lab-ledger', format: 'project', version: 1, experiment: '单摆测 g', rows: [['50.00', 'abc', '10']] })) === false && /不是合法数字/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('缺必填列被拒', w.loadProjectText(JSON.stringify({ app: 'lab-ledger', format: 'project', version: 1, experiment: '单摆测 g', rows: [['', '1.420', '10']] })) === false && /缺少必填/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('超出范围被拒', w.loadProjectText(JSON.stringify({ app: 'lab-ledger', format: 'project', version: 1, experiment: '单摆测 g', rows: [['50.00', '999', '10']] })) === false && /超出允许范围/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('未知实验被拒', w.loadProjectText(JSON.stringify({ app: 'lab-ledger', format: 'project', version: 1, experiment: '不存在的实验', rows: [['1', '2', '3']] })) === false && /没有这个实验/.test(txt($('draftStatus'))), txt($('draftStatus')));
check('拒绝后表格未被改动', rowsOf()[0][0] === '50.00');

console.log('\n=== 6) 载入时自动切到文件所属实验 ===');
w.switchExp(0); w.loadSample();
const exp0file = w.projectFileText();
w.switchExp(1); w.loadSample();
check('当前在实验1', rowsOf()[0][0] === '1.00', JSON.stringify(rowsOf()[0]));
w.loadProjectText(exp0file);
check('载入后自动切回实验0 并还原', rowsOf()[0][0] === '50.00' && d.querySelector('select').value === '0');

console.log('\n=== 7) 报告信息与 uB 随草稿保存/恢复 ===');
w.switchExp(0); w.loadSample();
$('reportStudent').value = '张三'; $('reportClass').value = '物理21-1班'; $('reportDate').value = '2026-10-07';
w.uBInput.value = '0.01';
w.recompute();
check('草稿状态正常', /草稿已自动保存/.test(txt($('draftStatus'))));
clearAll();
w.restoreDraftForExperiment(0);
check('姓名随草稿恢复', $('reportStudent').value === '张三', $('reportStudent').value);
check('班级随草稿恢复', $('reportClass').value === '物理21-1班');
check('日期随草稿恢复', $('reportDate').value === '2026-10-07');
check('uB 随草稿恢复', w.uBInput.value === '0.01', w.uBInput.value);
check('恢复后结果显示合成不确定度', txt($('results')).includes('合成标准不确定度 uC'));

console.log('\n=== 8) 报告与 CSV 包含新字段 ===');
w.switchExp(0); w.loadSample();
const d1 = w.buildReportData();
check('报告数据含 reportMeta', d1.reportMeta && d1.reportMeta.student === '张三');
check('报告数据含 uncertaintyInput', d1.uncertaintyInput && d1.uncertaintyInput.uB === '0.01');
w.uBInput.value = '';
const csv = w.buildReportCsv();
check('CSV 以 BOM 开头', csv.charCodeAt(0) === 0xFEFF);
check('CSV 含表头与数据', csv.includes('序号') && csv.includes('50.00') && csv.includes('9.789'));
check('CSV 含结果列头', csv.includes('g (m/s²)'));

console.log('\n=== 9) 无运行时错误 ===');
check('无 JS 错误', errors.length === 0, errors.join(' | '));

console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
