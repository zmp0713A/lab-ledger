// ============================================================
// run-tests.mjs — 实验台账 · 无头浏览器自动化回归测试
//
// 用 jsdom 真实加载 ../index.html（含全部 <script>），
// 直接调用页面里的函数（switchExp/loadSample/recompute/toolTab...），
// 验证的是页面真的能算出预期数字，而不是代码看起来对。
//
// 运行：npm install && npm test   （或 node run-tests.mjs）
// ============================================================
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = join(here, '..', 'index.html');
const html = readFileSync(indexPath, 'utf8');

// ---------- 假 canvas 2d 上下文（jsdom 没有 canvas） ----------
function makeFakeCtx(cv) {
  const noop = () => {};
  const ctx = {
    canvas: cv,
    clearRect: noop, fillRect: noop, strokeRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, arcTo: noop, rect: noop, fill: noop, stroke: noop,
    clip: noop, save: noop, restore: noop,
    translate: noop, rotate: noop, scale: noop, setTransform: noop,
    fillText: noop, strokeText: noop, measureText: (s) => ({ width: String(s).length * 7 }),
    setLineDash: noop, getLineDash: () => [],
    drawImage: noop, createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({}),
    getImageData: () => ({ data: [] }), putImageData: noop,
  };
  return ctx;
}

// ---------- 简单断言工具 ----------
const results = [];
function check(name, actual, expected) {
  const ok = (typeof expected === 'function') ? expected(actual) : actual === expected;
  results.push({ name, actual, expected, ok });
}
function contains(name, haystack, needle) {
  const h = String(haystack ?? '').replace(/\s+/g, '');
  const n = String(needle).replace(/\s+/g, '');
  results.push({ name, actual: String(haystack ?? '').slice(0, 120), expected: '包含「' + needle + '」', ok: h.includes(n) });
}
function notContains(name, haystack, needle) {
  const h = String(haystack ?? '').replace(/\s+/g, '');
  const n = String(needle).replace(/\s+/g, '');
  results.push({ name, actual: h.slice(0, 120), expected: '不包含「' + needle + '」', ok: !h.includes(n) });
}

// ---------- 加载页面 ----------
const dom = new JSDOM(html, {
  url: pathToFileURL(indexPath).href,
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
});
const w = dom.window;
const doc = w.document;

// 等待 load（外部 <script> 全部执行完）
await new Promise((resolve) => {
  if (w.document.readyState === 'complete') resolve();
  else w.addEventListener('load', () => resolve());
});
await new Promise(r => setTimeout(r, 200));

// canvas 换成假的（chart.js 有数据时会真的调用 getContext）
const cv = doc.getElementById('chart');
if (cv) cv.getContext = () => makeFakeCtx(cv);

// 让 openAiPanel 里的 AbortController / fetch 可用（jsdom window 没有）
w.AbortController = w.AbortController || globalThis.AbortController;

const $id = (id) => doc.getElementById(id);
const valText = () => $id('val').textContent;
const resText = () => $id('results').textContent;
const resHtml = () => $id('results').innerHTML;

// ============================================================
// C1：初始空表格（必须先跑，页面刚加载 = 6 行空表）
// ============================================================
w.clearRows(); // 确保 6 行空表
contains('C1 校验区提示还没有数据', valText(), '还没有数据');
contains('C1 结果区提示还没有数据', resText(), '还没有数据');
notContains('C1 空表不出数字结果', resHtml(), '±');

// ============================================================
// A 组：正常用例 —— 7 个实验
// ============================================================
const A = [
  [0, '9.7963', '9.80 ± 0.02'],
  [1, '49.85',  '49.85 ± 0.07'],
  [2, '1.5004', null],
  [3, '0.0996', null],
  [4, '50.0',   null],
  [5, '100.0',  null],
  [6, '9.7962', '9.796 ± 0.007'],
];
for (const [i, meanStr, finalStr] of A) {
  w.switchExp(i);
  w.loadSample();
  contains('A 实验' + i + ' 结果区含均值 ' + meanStr, resText(), meanStr);
  if (finalStr) contains('A 实验' + i + ' 最终结果 ' + finalStr, resText(), finalStr);
  contains('A 实验' + i + ' 校验通过', valText(), '校验通过');
  contains('A 实验' + i + ' 引擎自检通过', resText(), '引擎自检 ✅');
}

// ============================================================
// B 组：边界用例
// ============================================================
// B1：单摆只填 L 和 T（不填次数n）
w.switchExp(0);
w.loadSample();
doc.querySelectorAll('.in').forEach(el => { el.value = ''; });
w.recompute();
contains('B1 不填次数n 仍校验通过', valText(), '校验通过');
contains('B1 不填次数n 结果正常', resText(), '9.7963');

// B2：单摆只填前 3 行（3 组均值 9.7940 → 最终结果 9.79；仍出数字）
w.switchExp(0);
doc.querySelector('#tbl tbody').innerHTML = '';
w.addRow(['50.00', '1.420', '10']);
w.addRow(['50.00', '1.418', '10']);
w.addRow(['50.00', '1.421', '10']);
contains('B2 只填3行 结果区仍出数字', resText(), '9.79');
contains('B2 只填3行 提示不足6组', valText(), '不足6组');

// B3/B4：工具——单位换算
w.openTools();
w.toolTab(0);
w.ucCat.value = '压力(Pa)';
w.ucOnCat();
w.ucVal.value = '1';
w.ucFrom.value = 'atm';
w.ucTo.value = 'Pa';
w.ucCalc();
contains('B3 1 atm→Pa 含 101325', $id('ucRes').textContent, '101325');

w.ucCat.value = '温度';
w.ucOnCat();
w.ucVal.value = '0';
w.ucFrom.value = '℃';
w.ucTo.value = 'K';
w.ucCalc();
contains('B4 0 ℃→K 含 273.15', $id('ucRes').textContent, '273.15');

// B5：有效数字修约（四舍六入五成双）
w.toolTab(3);
w.sigVal.value = '2.5'; w.sigP.value = '1'; w.sigCalc();
contains('B5 2.5 取1位 → 2', $id('sigRes').textContent, '2');
w.sigVal.value = '3.5'; w.sigP.value = '1'; w.sigCalc();
contains('B5 3.5 取1位 → 4（五成双）', $id('sigRes').textContent, '4');

// B6：格拉布斯检验输入 12 个数据（n>10 不乱标可疑）
w.toolTab(9);
w.grabData.value = '10,10.1,9.9,10.2,9.8,10.05,9.95,10.1,9.9,10.0,9.8,10.2';
w.grabCalc();
contains('B6 n=12 格拉布斯 未发现可疑数据', $id('grabRes').textContent, '未发现可疑数据');

// B7：B 类不确定度 uB —— 填入后出现 uB/uC 卡片，U 按 2·√(uA²+uB²) 合成
w.switchExp(0);
w.loadSample();
w.uBInput.value = '0.01';
w.recompute();
contains('B7 填 uB 后显示 B 类卡片', resText(), 'B 类标准不确定度 uB');
contains('B7 显示合成标准不确定度 uC', resText(), '合成标准不确定度 uC');
contains('B7 合成后最终结果 9.80 ± 0.03', resText(), '9.80 ± 0.03');
w.uBInput.value = '';
w.recompute();
notContains('B7 清空 uB 后不再显示 B 类卡片', resText(), 'B 类标准不确定度 uB');
contains('B7 清空 uB 后回到 9.80 ± 0.02', resText(), '9.80 ± 0.02');

// ============================================================
// C 组：失败用例（必须拒绝，不许编造）
// ============================================================
// C2：导入列数不符 → 拒绝且表格行数不变
w.switchExp(1); // 伏安法 2 列
$id('imp').value = '1.00,0.0201,99';
w.importText();
contains('C2 列数不符 报错第1行', $id('impMsg').textContent, '第1行');
check('C2 列数不符 表格行数仍为6', doc.querySelectorAll('#tbl tbody tr').length, 6);

// C3：非数值（摆长填 abc、周期填 1.420，次数列留空——可选列不影响触发非数值检查）
w.switchExp(0);
w.clearRows();
doc.querySelector('#tbl tbody tr:nth-child(1) .iL').value = 'abc';
doc.querySelector('#tbl tbody tr:nth-child(1) .iT').value = '1.420';
w.recompute();
contains('C3 非数值 abc 被拦截', valText(), '非数值');
notContains('C3 非数值 不出数字结果', resHtml(), '±');

// C4：异常值 —— 载入示例后把第 3 行周期改成 1.9
w.switchExp(0);
w.loadSample();
doc.querySelectorAll('#tbl tbody tr')[2].querySelector('.iT').value = '1.9';
w.recompute();
check('C4 第3行标黄 outlier-row', doc.querySelectorAll('#tbl tbody tr')[2].classList.contains('outlier-row'), true);
contains('C4 结果区提示疑似异常', resText(), '疑似异常');
contains('C4 异常值不删数据 仍有平均', resText(), '平均');

// C5：AI 面板 —— fetch 必定失败 → 代理未启动
w.fetch = () => Promise.reject(new Error('no proxy'));
w.openAiPanel();
await new Promise(r => setTimeout(r, 100));
contains('C5 fetch失败 显示代理未启动', $id('aiStatus').textContent, '代理未启动');
w.closeAiPanel();

// C6：uB 输入非法 → 校验区报错 + 结果区锁定，不出数字
w.switchExp(0);
w.loadSample();
w.uBInput.value = 'abc';
w.recompute();
contains('C6 uB 非法 校验区报错', valText(), 'uB 必须是非负的有限数字');
contains('C6 uB 非法 结果区暂停生成', resText(), 'uB 输入无效，已暂停生成最终结果');
notContains('C6 uB 非法 不出数字结果', resHtml(), '±');
w.uBInput.value = '';
w.recompute();

// ============================================================
// D 组：工具简查（4 个）
// ============================================================
// D1：单位换算 1 atm → Pa
w.openTools();
w.toolTab(0);
w.ucCat.value = '压力(Pa)'; w.ucOnCat();
w.ucVal.value = '1'; w.ucFrom.value = 'atm'; w.ucTo.value = 'Pa';
w.ucCalc();
contains('D 单位换算 1atm→Pa', $id('ucRes').textContent, '101325');

// D2：统计·方差 1 2 3 4 5 → 样本方差 s²=2.5
w.toolTab(1);
w.stData.value = '1 2 3 4 5';
w.stCalc();
contains('D 统计 1~5 样本方差2.5', $id('stRes').textContent, '2.5');

// D3：溶液配制 0.1 mol/L、250 mL、58.44 g/mol → 1.461 g
w.toolTab(10);
w.solnC.value = '0.1'; w.solnV.value = '250'; w.solnM.value = '58.44';
w.solnCalc();
contains('D 溶液配制 含1.461', $id('solnRes').textContent, '1.461');

// D4：几何体积 球 d=2 → V=π·8/6≈4.18879
w.toolTab(11);
w.geoShape.value = '球(直径 d)';
w.geo11BuildInputs();
w.geoD.value = '2';
w.geoCalc();
contains('D 几何体积 球d=2 含4.18879', $id('geoRes').textContent, '4.18879');

// ============================================================
// 统计与输出
// ============================================================
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok);
console.log('\n============================================');
console.log('✅ 通过 ' + pass + ' 项   ❌ 失败 ' + fail.length + ' 项');
for (const f of fail) {
  console.log('\n  ❌ ' + f.name);
  console.log('     期望：' + f.expected);
  console.log('     实际：' + f.actual);
}
console.log('============================================');
process.exit(fail.length ? 1 : 0);
