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
    win.fetch = () => Promise.reject(new Error('offline'));
    win.AbortController = AbortController;
    win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  },
});
const w = dom.window, d = w.document;
const $ = (id) => d.getElementById(id);
const txt = (el) => String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
await new Promise((r) => w.addEventListener('load', r));
await new Promise((r) => setTimeout(r, 600));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? ' → ' + extra : '')); }
};

console.log('=== 1) 严格数字解析（单元级） ===');
const sn = w.strictNumber;
for (const [v, want] of [['1.00', 1], ['-2.5e3', -2500], ['.5', 0.5]]) check(`合法 ${v} = ${want}`, sn(v) === want, 'got ' + sn(v));
for (const v of ['1.00abc', 'abc', '1,2', '', '  ', 'Infinity', 'NaN', '1.2.3', '--1', '+']) check(`拒绝 ${JSON.stringify(v)}`, !Number.isFinite(sn(v)), 'got ' + sn(v));

console.log('\n=== 2) 主表：非法输入必须被拒绝 ===');
w.switchExp(0); w.loadSample();
const row1 = d.querySelectorAll('#tbl tbody tr')[0];
row1.querySelector('.iL').value = '1.00abc';
w.recompute();
check('校验区报「非数值」', txt($('val')).includes('非数值'), txt($('val')).slice(0, 60));
check('该行结果不是数字', txt(row1.querySelector('.rres')) === '—', txt(row1.querySelector('.rres')));
const resTxt = txt($('results'));
check('结果区不含 NaN', !/NaN/.test(resTxt), resTxt.slice(0, 60));

console.log('\n=== 3) 只有 1 组数据：不出 NaN，明确提示 ===');
w.switchExp(0);
const tb = d.querySelector('#tbl tbody');
[...tb.rows].forEach((r, i) => { if (i > 0) r.remove(); });
tb.rows[0].querySelector('.iL').value = '50.0';
tb.rows[0].querySelector('.iT').value = '1.420';
w.recompute();
const r1 = txt($('results'));
check('提示只有 1 组有效数据', r1.includes('只有 1 组有效数据'), r1.slice(0, 80));
check('结果区不含 NaN', !/NaN/.test(r1), r1.slice(0, 80));
check('不显示最终结果 g = (…', !/最终结果/.test(r1));

console.log('\n=== 4) Excel 导入：坏数字整批拒绝 ===');
w.switchExp(0); w.loadSample();
$('imp').value = '50.0\t1.420\t6\n50.0\tabc\t6';
w.importText();
check('导入被拒绝并指出行号与列', /第 2 行/.test(txt($('impMsg'))) && /不是合法数字/.test(txt($('impMsg'))), txt($('impMsg')));
check('表格未被改成导入内容', d.querySelectorAll('#tbl tbody tr').length === 6, 'rows=' + d.querySelectorAll('#tbl tbody tr').length);
$('imp').value = '50.0\t1.420\t6\n50.5\t1.430\t6';
w.importText();
check('合法数据仍能导入', /已导入 2 行/.test(txt($('impMsg'))), txt($('impMsg')));

console.log('\n=== 5) 工具箱：非法 token 不再被静默丢弃 ===');
w.openTools(); w.toolTab(1);
$('stData').value = '1, abc, 2';
d.querySelector('#toolBody button').dispatchEvent(new w.Event('click', { bubbles: true }));
check('统计工具报出第 2 个输入非法', /第 2 个输入不是合法数字/.test(txt($('stRes'))), txt($('stRes')).slice(0, 70));
$('stData').value = '5';
d.querySelector('#toolBody button').dispatchEvent(new w.Event('click', { bubbles: true }));
check('单个数字提示需要至少 2 个', /至少 2 个数/.test(txt($('stRes'))), txt($('stRes')).slice(0, 70));

console.log('\n=== 6) 不确定度：负仪器误差限必须拒绝 ===');
w.toolTab(8);
const uf = [...$('toolBody').querySelectorAll('textarea,input')];
uf[0].value = '9.79 9.81 9.80'; uf[1].value = '-0.01';
d.querySelector('#toolBody button').dispatchEvent(new w.Event('click', { bubbles: true }));
check('负 Δ仪 被拒绝', /必须是正数/.test(txt($('uncRes'))), txt($('uncRes')).slice(0, 70));
uf[0].value = '9.79 9.81 9.80'; uf[1].value = '0.01';
d.querySelector('#toolBody button').dispatchEvent(new w.Event('click', { bubbles: true }));
check('正常输入仍能算出规范写法', /规范写法/.test(txt($('uncRes'))), txt($('uncRes')).slice(-40));

console.log('\n=== 7) 线性拟合：非法 token 也要报错 ===');
w.toolTab(2);
const ff = [...$('toolBody').querySelectorAll('textarea')];
ff[0].value = '1,2,3'; ff[1].value = '2,4,oops';
d.querySelector('#toolBody button').dispatchEvent(new w.Event('click', { bubbles: true }));
check('拟合报出非法输入', /不是合法数字/.test(txt($('fitRes'))), txt($('fitRes')).slice(0, 70));

console.log('\n=== 8) AI 面板：标签高亮 + 未启动提示 ===');
w.openAiPanel();
w.aiTask('ask');
const active = [...d.querySelectorAll('.aitab')].filter((b) => /active/.test(b.className));
check('切换任务后有且仅有 1 个标签高亮', active.length === 1, 'active=' + active.length);
check('高亮的是「自由提问」', active[0] && active[0].textContent.includes('自由提问'), active[0] ? active[0].textContent : 'none');
await new Promise((r) => setTimeout(r, 1500));
const st = txt($('aiStatus'));
check('代理未启动时提示含「代理未启动」', st.includes('代理未启动'), st);

console.log('\n=== 9) JS 报错 ===');
check('无运行时错误', errors.length === 0, errors.join(' | '));

console.log('\n=== 10) 单值输入严格校验（2026-10-07 强化）===');
const btn1 = () => d.querySelector('#toolBody button').dispatchEvent(new w.Event('click', { bubbles: true }));
const btnN = (n) => d.querySelectorAll('#toolBody button')[n].dispatchEvent(new w.Event('click', { bubbles: true }));
// 单位换算
w.toolTab(0);
$('ucVal').value = '1.5abc'; btn1();
check('单位换算拒绝 1.5abc', /不是合法数字/.test(txt($('ucRes'))), txt($('ucRes')).slice(0, 50));
$('ucVal').value = '1'; btn1();
check('单位换算正常值仍工作', txt($('ucRes')).includes('结果'), txt($('ucRes')).slice(0, 40));
// 有效数字
w.toolTab(3);
$('sigVal').value = 'abc'; btn1();
check('修约拒绝 abc', /不是合法数字/.test(txt($('sigRes'))), txt($('sigRes')).slice(0, 50));
$('sigVal').value = '-1.2345'; $('sigP').value = '4'; btn1();
check('修约允许负数', txt($('sigRes')).includes('1.234'), txt($('sigRes')).slice(0, 60));
// 相对误差
w.toolTab(4);
$('relM').value = '9.8abc'; btn1();
check('相对误差拒绝 9.8abc', /不是合法数字/.test(txt($('relRes'))), txt($('relRes')).slice(0, 50));
$('relM').value = '9.81'; $('relR').value = '9.79'; btn1();
check('相对误差正常值仍工作', txt($('relRes')).includes('%'), txt($('relRes')).slice(0, 40));
// SI 词头
w.toolTab(5);
$('siVal').value = '1.2.3'; btn1();
check('SI 词头拒绝 1.2.3', /不是合法数字/.test(txt($('siRes'))), txt($('siRes')).slice(0, 50));
$('siVal').value = '1.5'; btn1();
check('SI 词头正常值仍工作', txt($('siRes')).includes('结果'), txt($('siRes')).slice(0, 40));
// 浓度稀释
w.toolTab(6);
$('dC1').value = '0.5'; $('dV1').value = '100'; $('dC2').value = '-0.5'; $('dV2').value = '';
btn1();
check('稀释拒绝负浓度', /不能为负/.test(txt($('dilRes'))), txt($('dilRes')).slice(0, 60));
$('dC1').value = 'abc'; $('dV1').value = '100'; $('dC2').value = ''; $('dV2').value = '200';
btn1();
check('稀释拒绝 abc', /不是合法数字/.test(txt($('dilRes'))), txt($('dilRes')).slice(0, 60));
$('dC1').value = '0.5'; $('dV1').value = '100'; $('dC2').value = ''; $('dV2').value = '200';
btn1();
check('稀释正常值仍工作', txt($('dilRes')).includes('0.250000'), txt($('dilRes')).slice(0, 50));
$('mN').value = '-2'; $('mM').value = '58.44'; btnN(1);
check('摩尔换算拒绝负 n', /正数|大于/.test(txt($('molRes'))), txt($('molRes')).slice(0, 60));
$('mN').value = '2'; $('mM').value = '58.44'; btnN(1);
check('摩尔换算正常值仍工作', txt($('molRes')).includes('116.88'), txt($('molRes')).slice(0, 50));
// 溶液配制
w.toolTab(10);
$('solnC').value = '0.1'; $('solnV').value = '-500'; $('solnM').value = '58.44'; btn1();
check('溶液配制拒绝负体积', /正数|大于/.test(txt($('solnRes'))), txt($('solnRes')).slice(0, 60));
$('solnC').value = '0.1'; $('solnV').value = '500'; $('solnM').value = '58.44'; btn1();
check('溶液配制正常值仍工作', txt($('solnRes')).includes('2.922'), txt($('solnRes')).slice(0, 60));
// 几何体积
w.toolTab(11);
$('geoD').value = '-2'; btn1();
check('几何体积拒绝负直径', /正数|大于/.test(txt($('geoRes'))), txt($('geoRes')).slice(0, 60));
$('geoD').value = 'abc'; btn1();
check('几何体积拒绝 abc', /不是合法数字/.test(txt($('geoRes'))), txt($('geoRes')).slice(0, 60));
$('geoD').value = '2'; btn1();
check('几何体积正常值仍工作', txt($('geoRes')).includes('4.18879'), txt($('geoRes')).slice(0, 50));

console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
