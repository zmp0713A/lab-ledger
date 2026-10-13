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
const fakeCtx = () => new Proxy({}, { get: (t,p) => (p in t ? t[p] : noop), set:(t,p,v)=>{t[p]=v;return true;} });
const errors=[];
const dom = new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:'file:///'+dir+'index.html',pretendToBeVisual:true,
  beforeParse(win){ win.HTMLCanvasElement.prototype.getContext=()=>fakeCtx();
    win.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:560,height:280});
    win.fetch=()=>Promise.reject(new Error('offline')); win.AbortController=AbortController;
    win.addEventListener('error',e=>errors.push(String(e.message||e.error))); }});
const w=dom.window,d=w.document; const $=(id)=>d.getElementById(id);
const txt=(el)=>String((el&&el.textContent)||'').replace(/\s+/g,' ').trim();
await new Promise(r=>w.addEventListener('load',r)); await new Promise(r=>setTimeout(r,500));
let pass=0,fail=0; const check=(n,c,x='')=>{ if(c){pass++;console.log('  ✅ '+n);} else {fail++;console.log('  ❌ '+n+(x?' → '+x:''));} };

for (const i of [0,1,2,3,4,5]) {
  w.switchExp(i); w.loadSample();
  const before = d.querySelectorAll('#tbl tbody tr').length;
  w.demoBreak();
  const rows = d.querySelectorAll('#tbl tbody tr');
  const marked = [...rows].filter(r => r.className.includes('outlier-row')).length;
  const body = txt($('results'));
  check(`实验${i}：演示后仍保留全部 ${before} 行（未删数据）`, rows.length === before, 'rows=' + rows.length);
  check(`实验${i}：出现异常提示`, /疑似异常/.test(body) || /异常/.test(txt($('val'))), (body.slice(0,50)+' | '+txt($('val')).slice(0,50)));
  check(`实验${i}：结果区无 NaN`, !/NaN/.test(body));
  w.demoRestore();
  check(`实验${i}：恢复后无异常行`, [...d.querySelectorAll('#tbl tbody tr')].filter(r=>r.className.includes('outlier-row')).length===0);
}
console.log('\n=== JS 报错 ===');
check('无运行时错误', errors.length===0, errors.join(' | '));
console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail?1:0);
