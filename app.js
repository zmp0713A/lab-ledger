// ===== 多实验配置 =====
const EXPS = [
  {
    name:'单摆测 g',
    cols:[
      {label:'摆长L(cm)', cls:'iL', req:true, min:0.01, max:200, ph:'50.00', maxHint:'cm 偏大，疑似mm误填'},
      {label:'周期T(s)',  cls:'iT', req:true, min:0.01, max:200, ph:'1.420'},
      {label:'次数n',     cls:'in', req:false, int:true, min:1, max:200, ph:'10', intHint:'不是1~200的正整数'}
    ],
    calc:function(v){ return 4*Math.PI*Math.PI*(v[0]/100)/(v[1]*v[1]); },
    formulaText:'g<sub>i</sub> = 4π²·L<sub>i</sub>/T<sub>i</sub>²（L 已换算为 m）',
    resultName:'g', resultUnit:'m/s²', stdValue:9.79,
    sample:[['50.00','1.420','10'],['50.00','1.418','10'],['50.00','1.421','10'],['50.00','1.419','10'],['50.00','1.422','10'],['50.00','1.417','10']],
    selfTest:{ sample:[['50.00','1.420'],['50.00','1.418'],['50.00','1.421'],['50.00','1.419'],['50.00','1.422'],['50.00','1.417']], expect:9.7963, tol:0.001 },
    // 物理模型检验：用数据拟合 T² ∝ L，由斜率反推 g，与标准值比对（AI 假设检验闭环的第 4 种检验）
    modelTest:{
      xCol:0, xLabel:'摆长 L', xFactor:0.01, xUnit:'m',
      yCol:1, yLabel:'T²', yPower:2, yUnit:'s²',
      derive:function(slope){ return 4*Math.PI*Math.PI/slope; },
      derivedName:'g', derivedUnit:'m/s²',
      expectedValue:9.79, tolerancePercent:2,
      lawText:'简谐运动模型 T = 2π√(L/g)：T² 应与 L 成正比，斜率应等于 4π²/g，由拟合斜率可反推 g'
    },
    modelSample:[['30.00','1.100','10'],['40.00','1.270','10'],['50.00','1.420','10'],['60.00','1.555','10'],['70.00','1.680','10'],['80.00','1.796','10']],
    info:{principle:'小角度（摆角 < 5°）下单摆近似做简谐运动，周期 T = 2π√(L/g)，由此得 g = 4π²L/T²。',formula:'g = 4π² L / T²',gear:'单摆装置（细线 + 金属小球）、米尺、秒表或光电门',tips:'摆长要量到球心；摆角不要超过 5°；测 30~50 个周期的总时间再除以次数；同一摆长重复测 6 次以上。'}
  },
  {
    name:'伏安法测电阻',
    cols:[
      {label:'电压U(V)', cls:'iU', req:true, min:0.01, max:30,  ph:'1.00', maxHint:'超出量程'},
      {label:'电流I(A)', cls:'iI', req:true, min:0.0001, max:2, ph:'0.0201', maxHint:'超出量程'}
    ],
    calc:function(v){ return v[0]/v[1]; },
    formulaText:'R<sub>i</sub> = U<sub>i</sub>/I<sub>i</sub>',
    resultName:'R', resultUnit:'Ω', stdValue:50,
    sample:[['1.00','0.0201'],['2.00','0.0402'],['3.00','0.0601'],['4.00','0.0803'],['5.00','0.1002'],['6.00','0.1201']],
    selfTest:{ sample:[['1.00','0.0201'],['2.00','0.0402'],['3.00','0.0601'],['4.00','0.0803'],['5.00','0.1002'],['6.00','0.1201']], expect:49.8485, tol:0.001 },
    info:{principle:'欧姆定律 R = U/I。改变电压取多组数据，逐组求电阻再平均。',formula:'R = U / I',gear:'直流电源、电压表、电流表、滑动变阻器、待测电阻',tips:'注意电流表内接/外接带来的系统误差；电压从低到高取 6 组以上；每次同时读 U 和 I。'}
  },
  {
    name:'分光计测棱镜折射率',
    cols:[
      {label:'顶角A(°)',       cls:'iA', req:true, min:30, max:90, ph:'60.00', maxHint:'顶角一般在 30~90 度'},
      {label:'最小偏向角δ(°)', cls:'iD', req:true, min:10, max:80, ph:'37.20', maxHint:'最小偏向角一般在 10~80 度'}
    ],
    calc:function(v){ return Math.sin((v[0]+v[1])/2*Math.PI/180)/Math.sin(v[0]/2*Math.PI/180); },
    formulaText:'n<sub>i</sub> = sin((A<sub>i</sub>+δ<sub>i</sub>)/2) / sin(A<sub>i</sub>/2)',
    resultName:'n', resultUnit:'', stdValue:1.50,
    sample:[['60.00','37.20'],['60.00','37.24'],['60.00','37.18'],['60.00','37.22'],['60.00','37.26'],['60.00','37.21']],
    selfTest:{ sample:[['60.00','37.20'],['60.00','37.24'],['60.00','37.18'],['60.00','37.22'],['60.00','37.26'],['60.00','37.21']], expect:1.500434, tol:0.0005 },
    info:{principle:'最小偏向角法：测出棱镜顶角 A 与最小偏向角 δ，由 n = sin((A+δ)/2) / sin(A/2) 求折射率。',formula:'n = sin((A+δ)/2) ÷ sin(A/2)',gear:'分光计（望远镜、准直管、载物台、双游标刻度盘）、钠光灯、三棱镜',tips:'先调望远镜聚焦无穷远，再调准直管与载物台水平；两个游标都要读数并取平均；缓慢转动载物台找最小偏向角。'}
  },
  {
    name:'滴定测盐酸浓度',
    cols:[
      {label:'V(NaOH)(mL)',   cls:'iVn', req:true, min:0.01, max:100, ph:'19.90', maxHint:'体积应在 0.01~100 mL'},
      {label:'V(HCl)(mL)',    cls:'iVh', req:true, min:0.01, max:100, ph:'20.00', maxHint:'体积应在 0.01~100 mL'},
      {label:'c(NaOH)(mol/L)',cls:'iCn', req:true, min:0.0001, max:5, ph:'0.1000', maxHint:'浓度应在 0.0001~5 mol/L'}
    ],
    calc:function(v){ return v[2]*v[0]/v[1]; },
    formulaText:'c(HCl)<sub>i</sub> = c(NaOH)·V(NaOH)<sub>i</sub> / V(HCl)<sub>i</sub>',
    resultName:'c(HCl)', resultUnit:'mol/L', stdValue:0.1000,
    sample:[['19.90','20.00','0.1000'],['19.95','20.00','0.1000'],['19.88','20.00','0.1000'],['19.92','20.00','0.1000'],['19.94','20.00','0.1000'],['19.91','20.00','0.1000']],
    selfTest:{ sample:[['19.90','20.00','0.1000'],['19.95','20.00','0.1000'],['19.88','20.00','0.1000'],['19.92','20.00','0.1000'],['19.94','20.00','0.1000'],['19.91','20.00','0.1000']], expect:0.0995833, tol:0.000001 },
    info:{principle:'酸碱中和：c(HCl)·V(HCl) = c(NaOH)·V(NaOH)，用已知浓度的标准液标定未知浓度。',formula:'c(HCl) = c(NaOH) × V(NaOH) ÷ V(HCl)',gear:'酸式/碱式滴定管、移液管、锥形瓶、铁架台、指示剂（酚酞或甲基橙）',tips:'滴定管先用待装液润洗并排尽气泡；读数读到 0.01 mL；临近终点改为半滴加入；做 3 次以上平行实验。'}
  },
  {
    name:'惠斯通电桥测电阻',
    cols:[
      {label:'电阻箱R(Ω)', cls:'iR',  req:true, min:0.01, max:99999, ph:'100.0'},
      {label:'左臂l1(cm)', cls:'iL1', req:true, min:0.1, max:100, ph:'30.0'},
      {label:'右臂l2(cm)', cls:'iL2', req:true, min:0.1, max:100, ph:'60.0'}
    ],
    calc:function(v){ return v[0]*v[1]/v[2]; },
    formulaText:'R<sub>x</sub> = R·l<sub>1</sub>/l<sub>2</sub>',
    resultName:'Rx', resultUnit:'Ω', stdValue:50,
    sample:[['100.0','30.0','60.0'],['100.0','29.9','60.0'],['100.0','30.1','60.0'],['100.0','30.0','60.0'],['100.0','30.2','60.0'],['100.0','29.8','60.0']],
    selfTest:{ sample:[['100.0','30.0','60.0'],['100.0','29.9','60.0'],['100.0','30.1','60.0'],['100.0','30.0','60.0'],['100.0','30.2','60.0'],['100.0','29.8','60.0']], expect:50.0, tol:0.001 },
    info:{principle:'电桥平衡时检流计指零，此时待测电阻 Rx = R·l₁/l₂（R 为电阻箱读数，l₁ l₂ 为两臂长度）。',formula:'Rx = R × l₁ ÷ l₂',gear:'滑线式（或箱式）电桥、检流计、电阻箱、直流电源',tips:'先粗调后细调；交换左右两臂再测一次可消除比例臂误差；检流计用点按法保护。'}
  },
  {
    name:'示波器测频率',
    cols:[
      {label:'时基(ms/div)', cls:'iTb', req:true, min:0.0001, max:1000, ph:'0.5'},
      {label:'波形格数(div)', cls:'iDv', req:true, min:0.1, max:100, ph:'20.0'}
    ],
    calc:function(v){ return 1000/(v[0]*v[1]); },
    formulaText:'f = 1000 / (时基 × 格数)',
    resultName:'f', resultUnit:'Hz', stdValue:100,
    sample:[['0.5','20.0'],['0.5','20.1'],['0.5','19.9'],['0.5','20.0'],['0.5','20.2'],['0.5','19.8']],
    selfTest:{ sample:[['0.5','20.0'],['0.5','20.1'],['0.5','19.9'],['0.5','20.0'],['0.5','20.2'],['0.5','19.8']], expect:100.00417, tol:0.001 },
    info:{principle:'一个完整波形在屏幕上占 n 格、时基为 t(ms/div)，则周期 T = n·t，频率 f = 1/T。',formula:'f = 1000 ÷ (时基 × 格数)   （时基 ms/div，结果 Hz）',gear:'示波器、信号发生器、探头',tips:'先校准时基与零点；波形调到屏幕中央、幅度适中；读一个完整周期占的格数（含小数）；可用李萨如图形法交叉验证。'}
  },
  {
    name:'自由落体测 g',
    cols:[
      {label:'下落高度h(m)', cls:'ih', req:true, min:0.001, max:20, ph:'0.5000'},
      {label:'下落时间t(s)', cls:'it', req:true, min:0.01, max:20, ph:'0.3195'}
    ],
    calc:function(v){ return 2*v[0]/(v[1]*v[1]); },
    formulaText:'g<sub>i</sub> = 2h<sub>i</sub>/t<sub>i</sub>²（从静止释放，忽略空气阻力）',
    resultName:'g', resultUnit:'m/s²', stdValue:9.79,
    sample:[['0.5000','0.3194'],['0.5000','0.3195'],['0.5000','0.3196'],['0.5000','0.3193'],['0.5000','0.3197'],['0.5000','0.3195']],
    selfTest:{ sample:[['0.5000','0.3194'],['0.5000','0.3195'],['0.5000','0.3196'],['0.5000','0.3193'],['0.5000','0.3197'],['0.5000','0.3195']], expect:9.79621905, tol:0.000001 },
    info:{principle:'物体从静止自由下落、可忽略空气阻力时，h = ½gt²，因此 g = 2h/t²。',formula:'g = 2h / t²',gear:'自由落体装置、光电门或电子计时器、米尺',tips:'用电子计时器记录短时下落过程；高度从释放点量到检测点；保证竖直下落，避免手动秒表带来的较大反应误差；同一高度重复测量至少 6 次。'}
  }
];
let cur = 0;
let EXP = EXPS[0];

// ===== 工具 =====
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
// 严格数字解析：整串必须是有限数字，拒绝 1.2abc、Infinity、单独正负号等伪数字。
function strictNumber(s){
  const t=String(s).trim();
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)) return NaN;
  const n=Number(t);
  return Number.isFinite(n)?n:NaN;
}

// ===== 台账持久化（两层）=====
// ① 自动草稿：原始读数自动存进本机浏览器的 localStorage，防"刷新/误关丢数据"
// ② 项目文件：手动「保存项目」导出 .ledger.json，可移交/归档/换电脑继续；「载入项目」严格校验后恢复
const DRAFT_STORAGE_KEY='lab-ledger:drafts:v1';
let draftRestoring=false;

function setDraftStatus(text, bad){
  const el=$('draftStatus');
  if(!el) return;
  el.textContent=text||'';
  el.classList.toggle('bad', !!bad);
}

// B 类标准不确定度输入：留空 = 未提供（仅 A 类）；非法 = invalid
function readUB(){
  const raw=$('uBInput')?$('uBInput').value.trim():'';
  if(raw==='') return {entered:false, valid:true, value:0};
  const value=strictNumber(raw);
  return Number.isFinite(value)&&value>=0
    ? {entered:true, valid:true, value:value}
    : {entered:true, valid:false, value:NaN};
}

// 报告元信息（姓名/班级/日期，选填）
function getReportMeta(){
  return {
    student:$('reportStudent')?$('reportStudent').value.trim():'',
    className:$('reportClass')?$('reportClass').value.trim():'',
    date:$('reportDate')?$('reportDate').value:''
  };
}
function applyReportMeta(meta){
  const value=meta&&typeof meta==='object'?meta:{};
  if($('reportStudent')) $('reportStudent').value=typeof value.student==='string'?value.student:'';
  if($('reportClass')) $('reportClass').value=typeof value.className==='string'?value.className:'';
  if($('reportDate')) $('reportDate').value=typeof value.date==='string'?value.date:'';
}

// 读取草稿库；浏览器禁用本地存储时返回 null（不影响主功能）
function readDraftStore(){
  try{
    const raw=window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if(!raw) return {version:1, activeExperiment:0, experiments:{}};
    const data=JSON.parse(raw);
    if(!data||data.version!==1||!data.experiments||typeof data.experiments!=='object'){
      return {version:1, activeExperiment:0, experiments:{}};
    }
    return data;
  }catch(e){ return null; }
}

function saveDraft(){
  if(draftRestoring||!$('tbl')) return false;
  const data=readDraftStore();
  if(!data){ setDraftStatus('本机草稿未保存（浏览器禁用了本地存储）', true); return false; }
  const rows=[...$('tbl').tBodies[0].rows].map(function(row){ return rowVals(row); });
  // 空表不覆盖草稿：误清空后刷新仍能恢复上次的数据
  const hasAny=rows.some(function(r){ return r.some(function(v){ return String(v).trim()!==''; }); });
  if(!hasAny){ setDraftStatus('表格为空，草稿未更新（保留上次保存的草稿）'); return false; }
  data.experiments[String(cur)]={rows:rows, meta:getReportMeta(), uB:($('uBInput')?$('uBInput').value.trim():''), updatedAt:Date.now()};
  data.activeExperiment=cur;
  try{
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    setDraftStatus('草稿已自动保存在本机浏览器');
    return true;
  }catch(e){
    setDraftStatus('本机草稿未保存（存储空间不可用）', true);
    return false;
  }
}

function restoreDraftForExperiment(i){
  const data=readDraftStore();
  if(!data||!data.experiments) return false;
  const draft=data.experiments[String(i)];
  if(!draft||!Array.isArray(draft.rows)||draft.rows.length===0) return false;
  const tbody=$('tbl').tBodies[0];
  draftRestoring=true;
  tbody.innerHTML='';
  applyReportMeta(draft.meta);
  if($('uBInput')) $('uBInput').value=typeof draft.uB==='string'?draft.uB:'';
  draft.rows.forEach(function(saved){
    if(!Array.isArray(saved)) return;
    addRow(EXP.cols.map(function(_,idx){ return saved[idx]===undefined?'':String(saved[idx]); }));
  });
  draftRestoring=false;
  reindex();
  recompute();
  if($('uBUnit')) $('uBUnit').textContent='单位：'+EXP.resultUnit;
  setDraftStatus('已恢复本机草稿（数据未离开这台设备）');
  return true;
}

// ===== 项目文件：可移交、可归档的台账快照 =====
function projectFileText(){
  return JSON.stringify({
    app:'lab-ledger', format:'project', version:1,
    savedAt:new Date().toISOString(),
    experiment:EXP.name,
    columns:EXP.cols.map(function(c){ return c.label; }),
    rows:[...$('tbl').tBodies[0].rows].map(function(r){ return rowVals(r); })
  }, null, 2);
}

function saveProjectFile(){
  const blob=new Blob([projectFileText()], {type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='实验台账-'+EXP.name+'-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.ledger.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); },2000);
  setDraftStatus('项目文件已导出（含全部原始读数，可移交/归档）');
}

// 解析项目文件或「导出数据(JSON)」的报告快照 → {rows, experiment} 或 {error}
function parseProjectText(text){
  let obj;
  try{ obj=JSON.parse(String(text==null?'':text)); }
  catch(e){ return {error:'不是合法的 JSON 文件'}; }
  if(!obj||typeof obj!=='object') return {error:'文件内容不是对象'};
  if(obj.app==='lab-ledger'&&obj.format==='project'&&Array.isArray(obj.rows)){
    return {rows:obj.rows, experiment:obj.experiment||null};
  }
  if(obj.experiment&&Array.isArray(obj.rawRows)){
    // 兼容：把「导出数据(JSON)」的报告快照当作项目文件载入
    return {
      rows:obj.rawRows.map(function(r){ return (r&&Array.isArray(r.values))?r.values:[]; }),
      experiment:obj.experiment
    };
  }
  return {error:'不认识的台账文件（既不是项目文件，也不是本工具的导出快照）'};
}

// 载入并严格校验项目文件；任何一格不合法都整批拒绝，绝不半途写入
function loadProjectText(text){
  const parsed=parseProjectText(text);
  if(parsed.error){ setDraftStatus('载入失败：'+parsed.error, true); return false; }
  if(parsed.experiment){
    let idx=-1;
    for(let k=0;k<EXPS.length;k++){ if(EXPS[k].name===parsed.experiment) idx=k; }
    if(idx<0){ setDraftStatus('载入失败：文件属于「'+parsed.experiment+'」，本工具里没有这个实验', true); return false; }
    if(idx!==cur) switchExp(idx);
  }
  const rows=parsed.rows, K=EXP.cols.length;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const len=(r&&typeof r.length==='number')?r.length:-1;
    if(!Array.isArray(r)||len!==K){
      setDraftStatus('载入失败：第 '+(i+1)+' 行有 '+(len<0?'—':len)+' 列，当前实验需要 '+K+' 列', true);
      return false;
    }
    for(let j=0;j<K;j++){
      const raw=String(r[j]==null?'':r[j]).trim();
      if(raw===''){
        if(EXP.cols[j].req){ setDraftStatus('载入失败：第 '+(i+1)+' 行缺少必填列 '+EXP.cols[j].label, true); return false; }
        continue;
      }
      const n=strictNumber(raw);
      if(!Number.isFinite(n)){ setDraftStatus('载入失败：第 '+(i+1)+' 行第 '+(j+1)+' 列不是合法数字：'+raw, true); return false; }
      if((EXP.cols[j].int&&!Number.isInteger(n))||n<EXP.cols[j].min||n>EXP.cols[j].max){
        setDraftStatus('载入失败：第 '+(i+1)+' 行 '+EXP.cols[j].label+' 超出允许范围', true); return false;
      }
    }
  }
  draftRestoring=true;
  $('tbl').tBodies[0].innerHTML='';
  rows.forEach(function(r){ addRow(r.map(function(v){ return v==null?'':String(v); })); });
  draftRestoring=false;
  reindex();
  recompute();
  setDraftStatus('已载入 '+rows.length+' 行（数据来自文件，已逐格校验）');
  return true;
}

function onProjectFilePicked(input){
  const f=input.files&&input.files[0];
  if(!f) return;
  const reader=new FileReader();
  reader.onload=function(){ loadProjectText(reader.result); input.value=''; };
  reader.onerror=function(){ setDraftStatus('读取文件失败', true); };
  reader.readAsText(f, 'utf-8');
}

// ===== 占位：图表由 chart.js 提供 =====
function chartReady(res){}

// ===== 增行 =====
function addRow(vals){
  const r=document.createElement('tr');
  let h='<td></td>';
  EXP.cols.forEach(function(c,idx){
    const v = vals ? vals[idx] : '';
    const ph = c.ph ? ' placeholder="例 '+esc(c.ph)+'"' : '';
    h+='<td><input class="'+c.cls+'" value="'+esc(v)+'"'+ph+'></td>';
  });
  h+='<td class=rres></td>';
  h+='<td><button onclick="delRow(this)">删除</button></td>';
  r.innerHTML=h;
  $('tbl').tBodies[0].appendChild(r);
  for(const inp of r.querySelectorAll('input')) inp.oninput=recompute;
  reindex(); recompute();
}
function delRow(b){b.closest('tr').remove();reindex();recompute()}
function reindex(){
  let i=1;
  for(const r of $('tbl').tBodies[0].rows) r.cells[0].textContent=i++;
}

// 读某一行按 EXP.cols 取值（返回与 cols 同序的数组）
function rowVals(row){
  return EXP.cols.map(function(c){return row.querySelector('.'+c.cls).value.trim();});
}

// ===== 表头重建 =====
function rebuildHead(){
  const hr=$('hrow');
  hr.innerHTML='<th>序号</th>'+EXP.cols.map(function(c){return '<th>'+esc(c.label)+'</th>'}).join('')+'<th>结果</th><th>操作</th>';
}

// ===== 载入示例数据 =====
function loadSample(){
  $('tbl').tBodies[0].innerHTML='';
  EXP.sample.forEach(function(v){addRow(v);});
}

// ===== 从 Excel 粘贴导入 =====
function importText(){
  const ta=$('imp'); if(!ta)return;
  const msg=$('impMsg');
  const text=ta.value;
  // 按行切分，跳过空行
  const lines=text.split(/\r?\n/).map(function(s){return s.trim();}).filter(function(s){return s!=='';});
  if(lines.length===0){msg.innerHTML='<div class="err">没有可导入的数据</div>';return}
  const K=EXP.cols.length;
  // 每行用 Tab / 逗号 / 连续空格 切分（先 Tab，无 Tab 再逗号，再无逗号则按连续空格）
  const parsed=lines.map(function(line){
    if(line.indexOf('\t')>=0) return line.split('\t');
    if(line.indexOf(',')>=0) return line.split(',');
    return line.split(/\s+/);
  });
  // 检查列数，不符则报错且不导入任何数据
  for(let i=0;i<parsed.length;i++){
    if(parsed[i].length!==K){
      msg.innerHTML='<div class="err">第 '+(i+1)+' 行有 '+parsed[i].length+' 列，当前实验需要 '+K+' 列</div>';
      return;
    }
  }
  // 检查每个非空单元格必须是完整、有限且在范围内的数字；任何一格有错则整批拒绝。
  for(let i=0;i<parsed.length;i++){
    for(let j=0;j<K;j++){
      const raw=String(parsed[i][j]).trim(), c=EXP.cols[j];
      if(raw===''){
        if(c.req){msg.innerHTML='<div class="err">第 '+(i+1)+' 行缺少 '+esc(c.label)+'</div>';return;}
        continue;
      }
      const num=strictNumber(raw);
      if(!Number.isFinite(num)){msg.innerHTML='<div class="err">第 '+(i+1)+' 行第 '+(j+1)+' 列不是合法数字：'+esc(raw)+'</div>';return;}
      if((c.int&&!Number.isInteger(num))||num<c.min||num>c.max){msg.innerHTML='<div class="err">第 '+(i+1)+' 行 '+esc(c.label)+' 超出允许范围</div>';return;}
    }
  }
  // 全部合法：清空 tbody，按列顺序导入
  $('tbl').tBodies[0].innerHTML='';
  parsed.forEach(function(vals){
    addRow(vals.map(function(s){return s.trim();}));
  });
  recompute();
  ta.value='';
  msg.innerHTML='<div class="ok">已导入 '+parsed.length+' 行</div>';
}

// ===== 实验速览 =====
function renderExpInfo(){
  var n=$('eiName'), f=$('eiFormula'), b=$('eiBody');
  if(!n||!f||!b) return;
  var inf=EXP.info||{};
  n.textContent=EXP.name;
  f.innerHTML=inf.formula||'';
  b.innerHTML='<div><b>实验原理　</b>'+(inf.principle||'')+'</div>'
    +'<div><b>主要器材　</b>'+(inf.gear||'')+'</div>'
    +'<div><b>操作要点　</b>'+(inf.tips||'')+'</div>'
    +'<div><b>数据要求　</b>至少 6 组有效读数；除标记为可选的列外，每一列都要填。</div>';
}
function toggleExpInfo(){ var b=$('eiBody'); if(!b) return; b.style.display=(b.style.display==='none'?'block':'none'); }

// ===== 切换实验 =====
function switchExp(i){
  draftRestoring=true;          // 切换期间的空白行不参与自动保存
  cur=+i; EXP=EXPS[cur];
  const picker=$('expSelect');
  if(picker) picker.value=String(cur);
  rebuildHead();
  $('tbl').tBodies[0].innerHTML='';
  for(let k=0;k<6;k++) addRow(null);
  renderExpInfo();
  var eb=$('eiBody'); if(eb) eb.style.display='none';
  recompute();
  draftRestoring=false;
  restoreDraftForExperiment(cur);   // 切回来时恢复该实验的本机草稿（若有）
}

function setTblStatus(){
  var el=document.getElementById('tblStatus');
  if(!el) return;
  var res=computeAll();
  var n=res?res.valid.length:0;
  var rows=[...$('tbl').tBodies[0].rows];
  var anyValue=false;
  rows.forEach(function(r){rowVals(r).forEach(function(v){if(v.trim()!=='')anyValue=true;});});
  if(!anyValue){ el.innerHTML='\u25CB \u8868\u683c\u8fd8\u6ca1\u6709\u6570\u636e\uff08\u7070\u8272\u300c\u4f8b\u300d\u6570\u5b57\u53ea\u662f\u683c\u5f0f\u63d0\u793a\uff09'; return; }
  if(n<rows.length){ el.innerHTML='\u25CF \u5df2\u586b <b>'+n+'</b> \u7ec4\uff0c\u8fd8\u5dee\u5fc5\u586b\u9879'; } else { el.innerHTML='\u25CF \u5df2\u586b <b>'+n+'</b> \u7ec4'; }
}

// ===== 数据校验 =====
function validate(){
  const rows=[...$('tbl').tBodies[0].rows];
  const groups={}; let okCount=0; let anyValue=false;
  const b=readUB();
  rows.forEach(function(r,i){
    const vals=rowVals(r);
    const rowNo=i+1;
    vals.forEach(function(v){ if(v.trim()!=='') anyValue=true; });
    const miss=[];
    EXP.cols.forEach(function(c,idx){ if(c.req && vals[idx]==='') miss.push(c.label); });
    if(miss.length){
      const key='missing:'+miss.join('、');
      if((groups[key]=groups[key]||{msg:'缺少'+miss.join('、'),rows:[]}).rows.indexOf(rowNo)<0) groups[key].rows.push(rowNo);
      return;
    }
    let bad=false;
    EXP.cols.forEach(function(c,idx){
      if (vals[idx] === '') return;          // 空值不在这里校验（必填列已在 miss 段处理）
      const num=strictNumber(vals[idx]);
      if(!Number.isFinite(num)){ const key='nonnum:'+c.label+':'+vals[idx]; if((groups[key]=groups[key]||{msg:'非数值：'+c.label+'="'+vals[idx]+'"',rows:[]}).rows.indexOf(rowNo)<0) groups[key].rows.push(rowNo); bad=true; return; }
      if(c.int && !Number.isInteger(num)){ const key='int:'+c.label+':'+num; (groups[key]=groups[key]||{msg:c.label+'='+num+'，'+(c.intHint||'应为正整数'),rows:[]}).rows.push(rowNo); bad=true; return; }
      if(num < c.min){ const key='min:'+c.label; (groups[key]=groups[key]||{msg:c.label+' 小于最小值'+c.min,rows:[]}).rows.push(rowNo); bad=true; return; }
      if(num > c.max){ const key='max:'+c.label+':'+num; (groups[key]=groups[key]||{msg:c.label+'='+num+'，'+(c.maxHint||'超出范围'),rows:[]}).rows.push(rowNo); bad=true; return; }
    });
    if(bad){return}
    okCount++;
  });
  // 空表格：中性灰字，不报错
  if(!anyValue && okCount===0 && b.valid){
    $('val').innerHTML='<div class="idle">还没有数据。填满 6 组读数后会自动校验；也可以先点「载入示例数据」看看效果。</div>';
    setTblStatus();
    return;
  }
  if(!b.valid){
    groups['uB']={msg:'B 类标准不确定度 uB 必须是非负的有限数字；请修正或留空',rows:[]};
  }
  const merged=[];
  Object.values(groups).forEach(function(g){
    g.rows.sort(function(a,b){return a-b});
    merged.push({msg:g.msg, rows:g.rows});
  });
  if(okCount<6) merged.push({msg:'有效组数'+okCount+'，不足6组', rows:[]});
  if(merged.length===0){ $('val').innerHTML='<div class="ok">校验通过</div>'; setTblStatus(); return; }
  const shown=merged.slice(0,6);
  const extra=merged.length-6;
  const label=function(rs){
    if(!rs||rs.length===0) return '';
    // 连续 → a–b；不连续 → a、b、c
    if(rs.length>1){
      let allConsec=true; for(let k=1;k<rs.length;k++){ if(rs[k]!==rs[k-1]+1){allConsec=false;break} }
      if(allConsec) return '第'+rs[0]+'–'+rs[rs.length-1]+' 行：';
      return '第 '+rs.join('、')+' 行：';
    }
    return '第'+rs[0]+'行：';
  };
  $('val').innerHTML = shown.map(function(g){
    const pre=g.rows&&g.rows.length>0 ? label(g.rows) : '';
    return '<div class="err">⚠ '+pre+esc(g.msg)+'</div>';
  }).concat(extra>0?['<div class="err">…还有 '+extra+' 条问题</div>']:[]).join('');
  setTblStatus();
}

// ===== 格拉布斯异常值检测（只提示，绝不自动删） =====
function grabbsCheck(){
  const res=computeAll();
  if(!res||res.valid.length<3) return [];
  const xs=res.valid.map(function(v){return v.g});
  const mean=xs.reduce(function(a,b){return a+b},0)/xs.length;
  const sd=Math.sqrt(xs.reduce(function(a,b){return a+Math.pow(b-mean,2)},0)/(xs.length-1));
  if(sd===0) return [];
  const n=res.valid.length;
  if(n<3||n>10) return [];
  const crit={3:1.153,4:1.463,5:1.672,6:1.822,7:1.938,8:2.032,9:2.110,10:2.176};
  const cv=crit[n];
  const out=[];
  res.valid.forEach(function(v){
    const z=Math.abs(v.g-mean)/sd;
    if(z>cv) out.push(v.row);
  });
  return out;
}

// ===== 每行结果实时更新 =====
function updateRowResults(){
  const rows=[...$('tbl').tBodies[0].rows];
  if(!selfCheck().ok){
    rows.forEach(function(r){
      const td=r.querySelector('.rres');
      if(td){td.textContent='—';td.classList.add('empty');}
      r.classList.remove('outlier-row');
    });
    return;
  }
  const outliers=new Set(grabbsCheck());
  rows.forEach(function(r,i){
    const vals=rowVals(r);
    const nums=vals.map(function(v){return v===''?NaN:strictNumber(v);});
    const td=r.querySelector('.rres');
    if(!td)return;
    const bad=vals.some(function(v,idx){
      if(v==='') return false;
      const n=nums[idx], c=EXP.cols[idx];
      return !Number.isFinite(n)||(c.int&&!Number.isInteger(n))||n<c.min||n>c.max;
    });
    const res=bad?NaN:EXP.calc(nums);
    if(isFinite(res)){
      const s=Number(res).toPrecision(6); // 保留合适位数，去掉多余 0
      td.textContent=String(s);
      td.classList.remove('empty');
    } else {
      td.textContent='\u2014';
      td.classList.add('empty');
    }
    // 可疑行标黄
    const rowNo=i+1;
    r.classList.toggle('outlier-row',outliers.has(rowNo));
  });
}

// ===== 计算 + 结果区 =====
function computeAll(){
  const rows=[...$('tbl').tBodies[0].rows];
  const valid=[];
  rows.forEach(function(r,i){
    const vals=rowVals(r);
    const nums=vals.map(function(v){ return v === '' ? NaN : strictNumber(v); });
    let bad = false;
    EXP.cols.forEach(function(c,idx){
      if(vals[idx] === '') return;                    // 空列跳过校验，交给公式决定
      const num = nums[idx];
      if (!Number.isFinite(num)) { bad = true; return; }
      if (c.int && !Number.isInteger(num)) { bad = true; return; }
      if (num < c.min || num > c.max) { bad = true; return; }
    });
    if (bad) return;
    const res = EXP.calc(nums);
    if (!isFinite(res)) return;                        // 公式算不出（缺它需要的列）→ 跳过这行
    valid.push({row:i+1, g:res, raw:nums});
  });
  if(valid.length===0)return null;
  const gs=valid.map(function(v){return v.g});
  const mean=gs.reduce(function(a,b){return a+b},0)/gs.length;
  const b=readUB();
  if(!b.valid) return {valid,mean,N:valid.length,invalidUB:true};
  // 1 组数据可以显示该行试算，但样本标准差和不确定度没有统计意义。
  if(valid.length<2) return {valid,mean,N:valid.length,insufficient:true};
  const sd=Math.sqrt(gs.reduce(function(a,b){return a+Math.pow(b-mean,2)},0)/(gs.length-1));
  const rel=Math.abs(mean-EXP.stdValue)/EXP.stdValue*100;
  const N=valid.length;
  const uA=sd/Math.sqrt(N);
  const uB=b.value;
  const uC=Math.hypot(uA,uB);
  const U=2*uC;
  const eExp=U===0?null:Math.floor(Math.log10(U));
  const U2=U===0?0:Math.round(U/Math.pow(10,eExp))*Math.pow(10,eExp);
  let d=U===0?4:0;
  if(U!==0) for(let k=0;k<=10;k++){if(Math.abs(U2*Math.pow(10,k)-Math.round(U2*Math.pow(10,k)))<1e-9){d=k;break}}
  return {valid,mean,sd,rel,N,uA,uB,uC,uBEntered:b.entered,U,U2,eExp,d,meanRounded:mean.toFixed(d),U2Shown:U2.toFixed(d)};
}

function renderResults(){
  const res=computeAll();
  if(!res){
    $('results').innerHTML='<div class=emptybox>还没有数据：点上方「载入示例数据」看看效果，或直接在表格里填自己的数据（改任何一格都会自动重算）。</div>';
    const ch=$('chart'), hint=$('chartHint');
    if(ch) ch.style.display='none';
    if(hint) hint.style.display='block';
    chartReady(null); return;
  }
  if(res.invalidUB){
    $('results').innerHTML='<div class=err>uB 输入无效，已暂停生成最终结果。请输入非负有限数字，或清空该项。</div>';
    const ch=$('chart'), hint=$('chartHint');
    if(ch) ch.style.display='none';
    if(hint) hint.style.display='block';
    chartReady(null); return;
  }
  const sc=selfCheck();
  if(!sc.ok){
    $('results').innerHTML='<div class="selfcheck bad">引擎自检 ❌ 结果不可信，已锁定；请检查实验计算配置。</div>';
    const ch=$('chart'), hint=$('chartHint');
    if(ch) ch.style.display='none';
    if(hint) hint.style.display='block';
    chartReady(null); return;
  }
  if(res.insufficient){
    $('results').innerHTML='<div class=emptybox><b>当前只有 1 组有效数据</b><br>该行试算值为 '+EXP.resultName+' = '+res.mean.toPrecision(6)+' '+EXP.resultUnit+'；至少需要 2 组才能计算样本标准差与不确定度，建议按实验要求补足 6 组。</div>';
    const ch0=$('chart'), hint0=$('chartHint');
    if(ch0) ch0.style.display='none';
    if(hint0) hint0.style.display='block';
    chartReady(null); return;
  }
  const {mean,sd,rel,N,uA,uB,uC,uBEntered,U,U2,d,meanRounded,U2Shown}=res;
  const ch2=$('chart'), hint2=$('chartHint');
  if(ch2) ch2.style.display='block';
  if(hint2) hint2.style.display='none';
  const unit=EXP.resultUnit, name=EXP.resultName;
  let html='';
  html+='<div class=resgrid>';
  html+='<div class=rescard><span class=rlabel>平均</span><span class=rvalue>'+mean.toFixed(4)+'</span><span class=runit>'+unit+'</span><button class=magnify onclick=traceMean()>🔍</button></div>';
  html+='<div class=rescard><span class=rlabel>样本标准差 s</span><span class=rvalue>'+sd.toFixed(4)+'</span><span class=runit>'+unit+'</span><button class=magnify onclick=traceSD()>🔍</button></div>';
  html+='<div class=rescard><span class=rlabel>相对误差</span><span class=rvalue>'+rel.toFixed(2)+'%</span><button class=magnify onclick=traceRel()>🔍</button></div>';
  html+='<div class=rescard><span class=rlabel>A 类不确定度 uA</span><span class=rvalue>'+uA.toFixed(4)+'</span><span class=runit>'+unit+'</span><button class=magnify onclick=traceUA()>🔍</button></div>';
  if(uBEntered){
    html+='<div class=rescard><span class=rlabel>B 类标准不确定度 uB（人工输入）</span><span class=rvalue>'+uB.toPrecision(4)+'</span><span class=runit>'+unit+'</span></div>';
    html+='<div class=rescard><span class=rlabel>合成标准不确定度 uC</span><span class=rvalue>'+uC.toPrecision(4)+'</span><span class=runit>'+unit+'</span><button class=magnify onclick=traceU()>🔍</button></div>';
  }
  html+='<div class=rescard><span class=rlabel>扩展不确定度 U (k=2)</span><span class=rvalue>'+U2Shown+'</span><span class=runit>'+unit+'</span><button class=magnify onclick=traceU()>🔍</button></div>';
  html+='</div>';
  html+='<div class=finalbox><span class=rlabel>最终结果</span><div class=finalval>'+name+' = ('+meanRounded+' ± '+U2Shown+') '+unit+'</div></div>';
  html+='<div class="selfcheck ok">引擎自检 ✅ 自检数据 '+name+'bar='+EXP.selfTest.expect+'，与已知答案一致</div>';
  const outliers=grabbsCheck();
  if(outliers.length>0){
    const groups=outliers.map(function(n){return '\u7b2c '+n+' \u7ec4'}).join('\u3001');
    html+='<div class=outlier>⚠ '+groups+'\u6570\u636e\u7591\u4f3c\u5f02\u5e38\uff08\u683c\u62c9\u5e03\u65af\u68c0\u9a8c\uff0cα=0.05\uff09\u3002\u672c\u5de5\u5177\u53ea\u63d0\u793a\uff0c\u4e0d\u4f1a\u81ea\u52a8\u5220\u9664\uff0c\u8bf7\u4eba\u5de5\u5224\u65ad\u3002</div>';
  }
  $('results').innerHTML=html;
  chartReady(res);
}

function recompute(){validate();renderResults();updateRowResults();saveDraft()}

// ===== 引擎自检 selfCheck =====
function selfCheck(){
  const t=EXP.selfTest;
  const gs=t.sample.map(function(row){return EXP.calc(row.map(parseFloat));});
  const gbar=gs.reduce(function(a,b){return a+b},0)/gs.length;
  const ok=Math.abs(gbar-t.expect)<=t.tol;
  return {ok:ok, mean:gbar};
}

// ===== 现场演示辅助：一键制造异常 / 一键恢复 =====
// 演示"会拒绝 + 只提示不删除 + 可追溯"三件事，避免现场手抖改错格子。
function demoBreak(){
  switchExp(cur);           // 先回到当前实验的干净状态
  loadSample();             // 载入示例（每个实验都预置了示例数据）
  const rows=[...$('tbl').tBodies[0].rows];
  if(rows.length<3){ return; }
  const target=rows[2];     // 第 3 行
  // 取最后一个"必填"列（跳过可选的记录列，例如单摆的「次数n」——改它不影响计算）
  const reqCols=EXP.cols.filter(function(c){return c.req;});
  const col=reqCols.length?reqCols[reqCols.length-1]:EXP.cols[EXP.cols.length-1];
  const inp=target.querySelector('.'+col.cls);
  if(!inp) return;
  // 取一个仍在该列允许范围内、但明显偏离其余数据的值 → 触发格拉布斯异常提示
  let bad=col.min+(col.max-col.min)*0.9;
  if(col.int) bad=Math.round(bad);
  if(bad===Number(inp.value)) bad=col.min+(col.max-col.min)*0.1;
  inp.value=String(Number(bad.toPrecision(4)));
  recompute();
  const status=$('tblStatus');
  if(status) status.innerHTML='● 已把第 3 行的「'+col.label+'」改成异常值用于演示（数据未被删除，可点「↺ 恢复示例」还原）';
}
function demoRestore(){
  switchExp(cur);
  loadSample();
  const status=$('tblStatus');
  if(status) status.innerHTML='● 已恢复为干净的示例数据';
}

// ===== AI 假设检验闭环：AI 提假设，下面这些函数负责"确定性检验" =====
// 设计原则：AI 只说"要检验什么"，检验过程与数字全部由本文件计算，可复算、可追溯。

// 证据包：交给 AI 的全部客观事实（AI 不得自行计算，只能用这里给的数）
function evidencePack(){
  const res=computeAll();
  const rows=[...$('tbl').tBodies[0].rows];
  const raw=[];
  rows.forEach(function(r,i){
    const v=rowVals(r);
    if(v.some(function(x){return String(x).trim()!=='';})) raw.push({row:i+1, values:v});
  });
  const out={
    experiment:EXP.name,
    formula:EXP.formulaText,
    resultName:EXP.resultName,
    resultUnit:EXP.resultUnit,
    standardValue:EXP.stdValue,
    columns:EXP.cols.map(function(c){return c.label;}),
    rawRows:raw,
    suspectedOutliers:grabbsCheck(),
    validCount:res?res.N:0
  };
  if(res&&!res.insufficient){
    out.mean=Number(res.mean.toPrecision(8));
    out.sampleSD=Number(res.sd.toPrecision(6));
    out.relativeErrorPercent=Number(res.rel.toPrecision(4));
    out.uA=Number(res.uA.toPrecision(6));
    out.U=Number(res.U2Shown);
    out.perRow=res.valid.map(function(v){
      return {row:v.row, value:Number(v.g.toPrecision(8)), inputs:v.raw.map(function(x){return Number.isFinite(x)?x:null;})};
    });
  }
  return out;
}

// 检验①：剔除某一行后，结果如何变化（判断该点是否为"过失误差"）
function testDropOne(k){
  const res=computeAll();
  if(!res||!res.valid||res.valid.length<3) return {ok:false, reason:'有效组数不足 3 组，无法做剔除检验'};
  if(res.insufficient) return {ok:false, reason:'有效组数不足，无法做剔除检验'};
  const kept=res.valid.filter(function(v){return v.row!==k;});
  if(kept.length===res.valid.length) return {ok:false, reason:'第 '+k+' 组不在当前有效数据中'};
  if(kept.length<2) return {ok:false, reason:'剔除后剩余不足 2 组，无法统计'};
  const gs=kept.map(function(v){return v.g;});
  const mean=gs.reduce(function(a,b){return a+b;},0)/gs.length;
  const sd=Math.sqrt(gs.reduce(function(a,b){return a+Math.pow(b-mean,2);},0)/(gs.length-1));
  const rel=Math.abs(mean-EXP.stdValue)/EXP.stdValue*100;
  const before=Math.abs(res.mean-EXP.stdValue)/EXP.stdValue*100;
  return {
    ok:true, droppedRow:k, remaining:kept.length,
    meanAfter:Number(mean.toPrecision(8)), meanBefore:Number(res.mean.toPrecision(8)),
    sampleSDAfter:Number(sd.toPrecision(6)), sampleSDBefore:Number(res.sd.toPrecision(6)),
    relativeErrorPercentAfter:Number(rel.toPrecision(4)),
    relativeErrorPercentBefore:Number(before.toPrecision(4)),
    closerToStandard: rel<before,
    sdShrank: sd<res.sd
  };
}

// 检验②：前后半段均值是否出现漂移（判断有没有系统性趋势，例如仪器零漂）
function testSplitHalf(){
  const res=computeAll();
  if(!res||res.insufficient||!res.valid||res.valid.length<4) return {ok:false, reason:'有效组数不足 4 组，无法做分段检验'};
  if(res.sd===0) return {ok:false, reason:'所有结果完全相同（标准差为 0），无法判断漂移'};
  const v=res.valid.slice().sort(function(a,b){return a.row-b.row;});
  const half=Math.floor(v.length/2);
  const a=v.slice(0,half), b=v.slice(v.length-half);
  const ma=a.reduce(function(s,x){return s+x.g;},0)/a.length;
  const mb=b.reduce(function(s,x){return s+x.g;},0)/b.length;
  const diff=mb-ma;
  return {
    ok:true,
    firstRows:a.map(function(x){return x.row;}), lastRows:b.map(function(x){return x.row;}),
    firstMean:Number(ma.toPrecision(8)), lastMean:Number(mb.toPrecision(8)),
    difference:Number(diff.toPrecision(8)),
    sampleSD:Number(res.sd.toPrecision(6)),
    differenceInSD:Number((diff/res.sd).toPrecision(4)),
    notable: Math.abs(diff)>res.sd
  };
}

// 检验③：两列之间的相关系数（判断"某列变化是否伴随结果同向变化"）
function testColumnCorr(ci,cj){
  if(!EXP.cols[ci]||!EXP.cols[cj]) return {ok:false, reason:'列序号超出范围'};
  if(Number(ci)===Number(cj)) return {ok:false, reason:'同一列的自相关恒为 1，没有检验意义，请选两列不同的数据'};
  const rows=[...$('tbl').tBodies[0].rows];
  const xs=[],ys=[];
  rows.forEach(function(r){
    const vals=rowVals(r);
    const a=vals[ci]===''?NaN:strictNumber(vals[ci]);
    const b=vals[cj]===''?NaN:strictNumber(vals[cj]);
    if(Number.isFinite(a)&&Number.isFinite(b)){xs.push(a);ys.push(b);}
  });
  if(xs.length<3) return {ok:false, reason:'这两列的有效配对数不足 3 组'};
  const n=xs.length;
  const mx=xs.reduce(function(a,b){return a+b;},0)/n, my=ys.reduce(function(a,b){return a+b;},0)/n;
  let sxy=0,sxx=0,syy=0;
  for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy;}
  if(sxx===0||syy===0) return {ok:false, reason:'其中一列数值没有变化，无法计算相关性'};
  const rr=Math.max(-1,Math.min(1,sxy/Math.sqrt(sxx*syy)));
  return {
    ok:true, pairs:n,
    columnA:EXP.cols[ci].label, columnB:EXP.cols[cj].label,
    r:Number(rr.toPrecision(4)), r2:Number((rr*rr).toPrecision(4)),
    direction: rr>0?'正相关':(rr<0?'负相关':'无相关'),
    strong: Math.abs(rr)>=0.7
  };
}

// 检验④：物理模型检验——用数据拟合该实验对应的物理定律，由拟合参数反推物理量并与标准值比对
//（例如单摆：拟合 T²∝L，斜率 = 4π²/g，由斜率反推 g）
function testModelFit(){
  const mt=EXP.modelTest;
  if(!mt) return {ok:false, reason:'当前实验没有配置物理模型检验（目前只有「单摆测 g」支持）'};
  const rows=[...$('tbl').tBodies[0].rows];
  const xs=[],ys=[];
  rows.forEach(function(r){
    const vals=rowVals(r);
    const xv=vals[mt.xCol]===''?NaN:strictNumber(vals[mt.xCol]);
    const yv=vals[mt.yCol]===''?NaN:strictNumber(vals[mt.yCol]);
    if(Number.isFinite(xv)&&Number.isFinite(yv)&&xv>0&&yv>0){
      xs.push(xv*mt.xFactor);
      ys.push(Math.pow(yv,mt.yPower));
    }
  });
  if(xs.length<3) return {ok:false, reason:'模型检验需要至少 3 组有效数据（当前 '+xs.length+' 组）。不同摆长的示例：点 AI 面板里的「准备模型检验数据」'};
  const uniq={};
  xs.forEach(function(x){ uniq[x.toFixed(4)]=1; });
  if(Object.keys(uniq).length<2) return {ok:false, reason:mt.xLabel+' 全部相同，无法拟合模型。请点 AI 面板里的「准备模型检验数据」载入不同摆长的示例'};
  const n=xs.length;
  const mx=xs.reduce(function(a,b){return a+b;},0)/n, my=ys.reduce(function(a,b){return a+b;},0)/n;
  let sxy=0,sxx=0,syy=0;
  for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy;}
  if(sxx===0||syy===0) return {ok:false, reason:'数据没有变化，无法拟合'};
  const k=sxy/sxx;
  const b=my-k*mx;
  const r=Math.max(-1,Math.min(1,sxy/Math.sqrt(sxx*syy)));
  const derived=mt.derive(k);
  const expected=(mt.expectedValue!==undefined)?mt.expectedValue:EXP.stdValue;
  const relDev=Math.abs(derived-expected)/expected*100;
  return {
    ok:true, points:n,
    xLabel:mt.xLabel, xUnit:mt.xUnit, yLabel:mt.yLabel,
    slope:Number(k.toPrecision(6)), intercept:Number(b.toPrecision(6)), r2:Number((r*r).toPrecision(4)),
    derivedValue:Number(derived.toPrecision(6)), derivedName:mt.derivedName, derivedUnit:mt.derivedUnit,
    expectedValue:expected, relativeDeviationPercent:Number(relDev.toPrecision(4)),
    tolerancePercent:mt.tolerancePercent, supported: relDev<=mt.tolerancePercent, lawText:mt.lawText
  };
}

// 载入"模型检验"用的示例数据（不同摆长；只有配置了 modelSample 的实验才有）
function loadModelSample(){
  if(!EXP.modelSample){
    const s=$('tblStatus');
    if(s) s.innerHTML='● 当前实验没有模型检验示例数据（目前只有「单摆测 g」支持）';
    return false;
  }
  $('tbl').tBodies[0].innerHTML='';
  EXP.modelSample.forEach(function(v){addRow(v);});
  const s=$('tblStatus');
  if(s) s.innerHTML='● 已载入不同摆长的示例数据：点「提出假设并检验」，让 Agnes 检验简谐模型 T = 2π√(L/g)';
  return true;
}

// ===== 报告数据（供打印与 JSON 导出共用）=====
function buildReportData(){
  const rows=[...$('tbl').tBodies[0].rows];
  const raw=[];
  rows.forEach(function(r,i){
    const v=rowVals(r);
    if(v.some(function(x){return String(x).trim()!=='';})) raw.push({row:i+1,values:v});
  });
  const res=computeAll();
  const sc=selfCheck();
  const outliers=grabbsCheck();
  let result=null;
  if(res&&!res.invalidUB&&sc.ok){
    result = res.insufficient
      ? {insufficient:true, validCount:res.N, single:Number(res.mean.toPrecision(6))}
      : {validCount:res.N, mean:Number(res.mean.toPrecision(8)), sampleSD:Number(res.sd.toPrecision(6)),
         relativeErrorPercent:Number(res.rel.toPrecision(4)), uA:Number(res.uA.toPrecision(6)),
         uB:res.uBEntered?res.uB:null, combinedStandardUncertainty:Number(res.uC.toPrecision(6)),
         U:res.U2Shown, finalResult:EXP.resultName+' = ('+res.meanRounded+' ± '+res.U2Shown+') '+EXP.resultUnit};
  }
  const vv=$('val');
  return {
    generatedAt:new Date().toLocaleString('zh-CN'),
    experiment:EXP.name,
    reportMeta:getReportMeta(),
    uncertaintyInput:{uB:readUB().entered?($('uBInput')?$('uBInput').value.trim():''):null, unit:EXP.resultUnit},
    formula:EXP.formulaText,
    columns:EXP.cols.map(function(c){return c.label+(c.req?'':'（可选）');}),
    rawRows:raw,
    validationSummary: vv?String(vv.textContent||vv.innerText||'').trim():'',
    result:result,
    engineSelfCheck:{passed:sc.ok, expected:EXP.selfTest.expect, tolerance:EXP.selfTest.tol},
    suspectedOutliers:outliers,
    note:'数字全部由本工具确定性代码计算；异常值只提示不删除；本报告由页面在前端生成，导出操作未发送数据。使用 AI 功能时，当前任务所需内容会经本地代理发送给 Agnes。'
  };
}

// 导出 JSON（可提交、可复核的机器可读证据）
function downloadReportJson(){
  const data=buildReportData();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='实验台账-'+EXP.name+'-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},2000);
}

// CSV 保留原始输入与逐行计算结果；非法输入原样留档，不生成虚假的数值。
function buildReportCsv(){
  const data=buildReportData();
  const result=computeAll();
  const calculated=new Map(result&&selfCheck().ok?result.valid.map(function(v){return [v.row,v.g];}):[]);
  const cell=function(value){
    let s=String(value===undefined||value===null?'':value);
    // 表格软件会把以这些符号开头的文本当公式；合法数字仍按数字导出。
    if(/^[\s\x00-\x1f]*[=+\-@]/.test(s)&&!Number.isFinite(strictNumber(s))) s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  };
  const lines=[];
  lines.push(['序号'].concat(data.columns,[EXP.resultName+' ('+(EXP.resultUnit||'无单位')+')']).map(cell).join(','));
  data.rawRows.forEach(function(row){
    const value=calculated.get(row.row);
    lines.push([row.row].concat(row.values,[Number.isFinite(value)?Number(value.toPrecision(8)):'']).map(cell).join(','));
  });
  return '\uFEFF'+lines.join('\r\n')+'\r\n';
}

function downloadReportCsv(){
  const blob=new Blob([buildReportCsv()],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='实验台账-'+EXP.name+'-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},2000);
}

// ===== 打印报告：生成一份完整的可审计报告再打印/存 PDF =====
function printReport(){
  const d=buildReportData();
  let host=$('reportView');
  if(!host){ host=document.createElement('div'); host.id='reportView'; document.body.appendChild(host); }
  const esc2=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
  let h='<h1>实验台账 · 数据处理报告</h1>';
  h+='<div class="rp-meta">实验：<b>'+esc2(d.experiment)+'</b>　生成时间：'+esc2(d.generatedAt)+'</div>';
  const meta=d.reportMeta||{};
  h+='<div class="rp-meta">姓名：'+esc2(meta.student||'未填写')+'　班级：'+esc2(meta.className||'未填写')+'　实验日期：'+esc2(meta.date||'未填写')+'</div>';
  h+='<h2>1. 公式</h2><div class="rp-code">'+esc2(d.formula)+'</div>';
  h+='<h2>2. 原始记录</h2><table class="rp"><thead><tr><th>序号</th>';
  d.columns.forEach(function(c){h+='<th>'+esc2(c)+'</th>';});
  h+='</tr></thead><tbody>';
  if(d.rawRows.length===0){ h+='<tr><td colspan="'+(d.columns.length+1)+'">（无数据）</td></tr>'; }
  d.rawRows.forEach(function(r){
    h+='<tr><td>'+r.row+'</td>';
    r.values.forEach(function(v){h+='<td>'+esc2(v===''?'—':v)+'</td>';});
    h+='</tr>';
  });
  h+='</tbody></table>';
  h+='<h2>3. 数据校验</h2><div class="rp-pre">'+esc2(d.validationSummary||'（无）')+'</div>';
  h+='<h2>4. 计算结果</h2>';
  if(!d.result){ h+='<div class="rp-pre">没有可计算的有效数据。</div>'; }
  else if(d.result.insufficient){ h+='<div class="rp-pre">只有 '+d.result.validCount+' 组有效数据，不足以计算不确定度；该行试算值 = '+d.result.single+'。</div>'; }
  else{
    const r=d.result;
    h+='<table class="rp"><tbody>'
      +'<tr><th>有效组数</th><td>'+r.validCount+'</td><th>平均</th><td>'+r.mean+'</td></tr>'
      +'<tr><th>样本标准差 s</th><td>'+r.sampleSD+'</td><th>相对误差</th><td>'+r.relativeErrorPercent+'%</td></tr>'
      +'<tr><th>A 类不确定度 uA</th><td>'+r.uA+'</td><th>B 类标准不确定度 uB</th><td>'+(r.uB===null?'未提供':r.uB)+'</td></tr>'
      +'<tr><th>合成标准不确定度 uC</th><td>'+r.combinedStandardUncertainty+'</td><th>扩展不确定度 U (k=2)</th><td>'+r.U+'</td></tr>'
      +'</tbody></table>';
    h+='<div class="rp-final">最终结果：'+esc2(r.finalResult)+'</div>';
  }
  h+='<h2>5. 引擎自检与异常值</h2>';
  h+='<div class="rp-pre">引擎自检：'+(d.engineSelfCheck.passed?'通过（已知答案 '+d.engineSelfCheck.expected+'，容差 ±'+d.engineSelfCheck.tolerance+'）':'未通过，结果已锁定')+'\n'
    +'疑似异常值：'+(d.suspectedOutliers.length? ('第 '+d.suspectedOutliers.join('、')+' 组（格拉布斯检验 α=0.05，仅提示，未删除）') : '无')+'</div>';
  h+='<div class="rp-note">'+esc2(d.note)+'</div>';
  host.innerHTML=h;
  window.print();
}

// ===== 追溯弹窗 =====
function showTrace(text){
  $('modalBody').innerHTML=text;
  $('modal').style.display='block';
}
function hideModal(){$('modal').style.display='none'}

function traceMean(){
  const res=computeAll();
  if(!res){showTrace('无有效数据');return}
  const {valid,mean}=res;
  const unit=EXP.resultUnit, name=EXP.resultName;
  const gsList=valid.map(function(v){return name+'<sub>'+v.row+'</sub> = '+(v.g).toFixed(4)+'（第'+v.row+'行）'}).join('<br>');
  const meanStr='mean('+valid.map(function(v){return name+'<sub>'+v.row+'</sub>'}).join(',')+')='+mean.toFixed(4);
  showTrace(
    '<b>ḡ = '+mean.toFixed(4)+' '+unit+' 的来源</b><br>'
    +EXP.formulaText+'<br>'
    +gsList+'<br>'
    +meanStr+' '+unit
  );
}

function traceSD(){
  const res=computeAll();
  if(!res){showTrace('无有效数据');return}
  const {valid,sd,mean}=res;
  const unit=EXP.resultUnit;
  showTrace(
    '<b>s = '+sd.toFixed(4)+' '+unit+' 的来源</b><br>'
    +'样本标准差 = √(Σ(x<sub>i</sub>−x̄)² / (n−1))<br>'
    +'求和 = '+valid.reduce(function(a,v){return a+Math.pow(v.g-mean,2)},0).toFixed(4)+'<br>'
    +'÷(n−1)=÷'+(valid.length-1)+' → √(...)='+sd.toFixed(4)
  );
}

function traceRel(){
  const res=computeAll();
  if(!res){showTrace('无有效数据');return}
  const {mean,rel}=res;
  const std=EXP.stdValue;
  showTrace(
    '<b>相对误差 = '+rel.toFixed(2)+'% 的来源</b><br>'
    +'|x̄ − 标准值| / 标准值 × 100%<br>'
    +'|'+mean.toFixed(4)+' − '+std+'| / '+std+' × 100%<br>'
    + Math.abs(mean-std).toFixed(4)+' / '+std+' × 100% = '+rel.toFixed(2)+'%'
  );
}

function traceUA(){
  const res=computeAll();
  if(!res){showTrace('无有效数据');return}
  const {sd,uA,N}=res;
  const unit=EXP.resultUnit;
  showTrace(
    '<b>uA = '+uA.toFixed(4)+' '+unit+' 的来源</b><br>'
    +'uA = s / √N<br>'
    +'s = '+sd.toFixed(4)+' '+unit+'<br>'
    +'N = '+N+'<br>'
    +'uA = '+sd.toFixed(4)+' / √'+N+' = '+sd.toFixed(4)+' / '+Math.sqrt(N).toFixed(4)+' = '+uA.toFixed(4)
  );
}

function traceU(){
  const res=computeAll();
  if(!res||res.invalidUB||res.insufficient){showTrace('当前没有可追溯的扩展不确定度');return}
  const {uA,uB,uC,uBEntered,U,d,meanRounded,U2Shown}=res;
  const unit=EXP.resultUnit;
  showTrace(
    '<b>U = '+U2Shown+' '+unit+' 的来源</b><br>'
    +(uBEntered?'uB = '+uB+' '+unit+'（人工提供的结果量标准不确定度）<br>':'未提供 uB，本次仅用 uA。<br>')
    +'uC = √(uA² + uB²) = √('+uA.toFixed(6)+'² + '+uB.toFixed(6)+'²) = '+uC.toFixed(6)+' '+unit+'<br>'
    +'扩展不确定度 U = k · uC，取 k = 2<br>'
    +'U = 2 × '+uC.toFixed(6)+' = '+U.toFixed(6)+' '+unit+'<br>'
    +'修约到 1 位有效数字：'+U.toFixed(4)+' → '+U2Shown+' '+unit+'<br>'
    +'ḡ 同步修约到相同小数位（'+d+' 位）：'+meanRounded+' '+unit
  );
}

// ===== 初始化：先放 6 行空行，再尝试恢复上次的本机草稿 =====
(function(){
  const data=readDraftStore();
  const idx=(data&&Number.isInteger(Number(data.activeExperiment)))?Number(data.activeExperiment):NaN;
  draftRestoring=true;   // 初始化期间不自动保存，避免空表覆盖草稿
  if(Number.isInteger(idx)&&idx>=0&&idx<EXPS.length&&idx!==cur){
    cur=idx; EXP=EXPS[cur];
    rebuildHead();
    $('tbl').tBodies[0].innerHTML='';
    for(let k=0;k<6;k++) addRow(null);
    renderExpInfo();
    var eb=$('eiBody'); if(eb) eb.style.display='none';
  }
  draftRestoring=false;
  if(!restoreDraftForExperiment(cur)){
    setDraftStatus('');
    if($('uBUnit')) $('uBUnit').textContent='单位：'+EXP.resultUnit;
  }
})();
