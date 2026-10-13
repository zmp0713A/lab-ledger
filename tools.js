// ============================================================
// tools.js — 实验台账 · 工具箱外壳 + 7 个工具
// 依赖：app.js 提供 switchExp/loadSample/recompute/addRow
//       index.html 提供 #start #tools #toolBody
// ============================================================
var curTab = 0;

// ---------- 显隐控制 ----------
function startEnter(){
  var s=document.getElementById('start');
  if(s) s.style.display='none';
}
function startPick(i){
  if(typeof switchExp==='function') switchExp(i);
  if(typeof loadSample==='function') loadSample();
  startEnter();
}
function startHome(){ $('start').style.display='flex'; }
function openTools(){
  var t=document.getElementById('tools');
  if(t) t.style.display='flex';
  renderTool();
}
function closeTools(){
  var t=document.getElementById('tools');
  if(t) t.style.display='none';
}
function clearRows(){
  var tbl=document.getElementById('tbl');
  if(!tbl) return;
  var tbody=tbl.tBodies[0];
  if(tbody) tbody.innerHTML='';
  if(typeof addRow==='function'){
    for(var i=0;i<6;i++) addRow(null);
  }
  if(typeof recompute==='function') recompute();
}

// ---------- 标签页 ----------
function toolTab(i){
  curTab=i;
  var tabs=document.querySelectorAll('.tooltab');
  for(var k=0;k<tabs.length;k++){
    if(k===i){tabs[k].style.borderColor='#1890ff';tabs[k].style.background='#f0f5ff';}
    else{tabs[k].style.borderColor='#e8e8e8';tabs[k].style.background='#fff';}
  }
  renderTool();
}
function renderTool(){
  var body=document.getElementById('toolBody');
  if(!body) return;
  var pages=[toolPage0,toolPage1,toolPage2,toolPage3,toolPage4,toolPage5,toolPage6,toolPage7,toolPage8,toolPage9,toolPage10,toolPage11];
  body.innerHTML=pages[curTab]();
  var inits=[ucInit,stInit,fitInit,sigInit,relInit,siInit,dilInit,diff7Init,unc8Init,grabbs9Init,soln10Init,geo11Init];
  if(inits[curTab]) inits[curTab]();
}
function $(id){return document.getElementById(id)}

// ============================================================
// [0] 单位换算
// ============================================================
var UNITS={
  '长度(m)':{'m':1,'km':1000,'dm':0.1,'cm':0.01,'mm':0.001,'μm':1e-6,'nm':1e-9,'英寸':0.0254,'英尺':0.3048,'英里':1609.344,'埃':1e-10},
  '质量(kg)':{'kg':1,'g':1e-3,'mg':1e-6,'μg':1e-9,'t':1000,'斤':0.5,'磅':0.45359237,'盎司':0.028349523125},
  '面积(m²)':{'m²':1,'cm²':1e-4,'mm²':1e-6,'km²':1e6,'公顷':1e4,'亩':666.6666666666667},
  '体积(m³)':{'m³':1,'L':1e-3,'mL':1e-6,'cm³':1e-6,'mm³':1e-9,'加仑US':0.003785411784},
  '时间(s)':{'s':1,'ms':1e-3,'μs':1e-6,'min':60,'h':3600,'d':86400},
  '压力(Pa)':{'Pa':1,'kPa':1e3,'MPa':1e6,'bar':1e5,'atm':101325,'mmHg':133.322387415,'psi':6894.757293168},
  '能量(J)':{'J':1,'kJ':1e3,'cal':4.184,'kcal':4184,'eV':1.602176634e-19,'kWh':3.6e6},
  '功率(W)':{'W':1,'kW':1e3,'MW':1e6,'马力':745.6998715822702},
  '角度(rad)':{'rad':1,'°':0.017453292519943295,'′':2.908882086657216e-4,'″':4.84813681109536e-6},
  '温度':{'℃':null,'℉':null,'K':null}
};

function toolPage0(){
  var cats=Object.keys(UNITS);
  var h='<div style="font-weight:600;margin-bottom:8px">单位换算</div>';
  h+='<div>类别 <select id="ucCat">';
  for(var i=0;i<cats.length;i++) h+='<option value="'+cats[i]+'">'+cats[i]+'</option>';
  h+='</select></div>';
  h+='<div>数值 <input type="text" id="ucVal" placeholder="如 100" style="width:100px"> ';
  h+='从 <select id="ucFrom"></select> → 到 <select id="ucTo"></select> ';
  h+='<button class="btn" onclick="ucCalc()">换算</button></div>';
  h+='<div id="ucRes" style="margin-top:8px"></div>';
  return h;
}
function ucInit(){
  var sel=$('ucCat');
  sel.onchange=ucOnCat;
  ucOnCat();
}
function ucOnCat(){
  var cat=$('ucCat').value;
  var units=Object.keys(UNITS[cat]);
  var mk=function(){var o='';for(var i=0;i<units.length;i++)o+='<option value="'+units[i]+'">'+units[i]+'</option>';return o;};
  $('ucFrom').innerHTML=mk();
  $('ucTo').innerHTML=mk();
}
function ucCalc(){
  var cat=$('ucCat').value;
  var res=$('ucRes');
  var val=toolNum('ucVal',res,'数值');
  if(val===null) return;
  var from=$('ucFrom').value, to=$('ucTo').value;
  var table=UNITS[cat];
  if(cat==='温度'){
    var inC;
    if(from==='℃') inC=val;
    else if(from==='K') inC=val-273.15;
    else inC=(val-32)*5/9;
    var out;
    if(to==='℃') out=inC;
    else if(to==='K') out=inC+273.15;
    else out=inC*9/5+32;
    res.innerHTML='结果：<b>'+out.toPrecision(6)+'</b> '+to+'<br><small>温度用偏移公式换算</small>';
    return;
  }
  var cf=table[from], ct=table[to];
  if(cf===undefined||ct===undefined){res.innerHTML='<span class="err">未知单位</span>';return;}
  var result=val*cf/ct;
  res.innerHTML='结果：<b>'+result.toPrecision(6)+'</b> '+to+'<br><small>公式：'+val+' × '+cf+' ÷ '+ct+'</small>';
}

// ============================================================
// [1] 统计·方差
// ============================================================
function toolPage1(){
  var h='<div style="font-weight:600;margin-bottom:8px">统计·方差</div>';
  h+='<textarea id="stData" rows="3" style="width:100%" placeholder="用逗号/空格/换行分隔，如 1, 2, 3, 4, 5"></textarea> ';
  h+='<button class="btn" onclick="stCalc()">计算</button>';
  h+='<div id="stRes" style="margin-top:8px"></div>';
  return h;
}
function stInit(){}
// 严格解析一串数字：任何非法片段都报错并指出是第几个，绝不静默丢弃后再算
function toolParseNums(raw, resEl){
  var parts=String(raw==null?'':raw).split(/[,，\s\n]+/).filter(function(s){return s!=='';});
  var nums=[];
  for(var i=0;i<parts.length;i++){
    var n=(typeof strictNumber==='function')?strictNumber(parts[i]):parseFloat(parts[i]);
    if(!Number.isFinite(n)){
      if(resEl) resEl.innerHTML='<span class="err">第 '+(i+1)+' 个输入不是合法数字：'+String(parts[i]).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>';
      return null;
    }
    nums.push(n);
  }
  return nums;
}
// 严格解析单个输入框：非法（含 1.2abc 这类）时报错并返回 null
function toolNum(id, resEl, label){
  var el=$(id);
  var raw=String(el&&el.value!=null?el.value:'').trim();
  if(raw===''){
    if(resEl) resEl.innerHTML='<span class="err">请填写 '+label+'</span>';
    return null;
  }
  var n=(typeof strictNumber==='function')?strictNumber(raw):parseFloat(raw);
  if(!Number.isFinite(n)){
    if(resEl) resEl.innerHTML='<span class="err">'+label+' 不是合法数字：'+String(raw).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>';
    return null;
  }
  return n;
}
// 严格解析单个输入框并检查物理范围（min>、max<=；含端点说明）
function toolNumRange(id, resEl, label, minExclusive, maxInclusive){
  var n=toolNum(id, resEl, label);
  if(n===null) return null;
  if(!(n>minExclusive) || !(n<=maxInclusive)){
    if(resEl) resEl.innerHTML='<span class="err">'+label+' 必须在 '+(minExclusive===0?'正数':'大于 '+minExclusive)+' 到 '+maxInclusive+' 之间</span>';
    return null;
  }
  return n;
}
function stCalc(){
  var raw=$('stData').value;
  var res=$('stRes');
  var nums=toolParseNums(raw,res);
  if(!nums) return;
  if(nums.length===0){res.innerHTML='<span class="err">请输入至少一个数字</span>';return;}
  if(nums.length<2){res.innerHTML='<span class="err">样本方差/标准差需要至少 2 个数（当前 '+nums.length+' 个）。仅一个数时：均值 = '+nums[0]+'</span>';return;}
  var n=nums.length;
  var sum=nums.reduce(function(a,b){return a+b;},0);
  var mean=sum/n;
  var varSum=0;
  for(var i=0;i<n;i++) varSum+=Math.pow(nums[i]-mean,2);
  var s2=varSum/(n-1);
  var s=Math.sqrt(s2);
  var sigma2=varSum/n;
  var sigma=Math.sqrt(sigma2);
  var min=Math.min.apply(null,nums);
  var max=Math.max.apply(null,nums);
  var range=max-min;
  var sorted=nums.slice().sort(function(a,b){return a-b;});
  var median = n%2===1 ? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2;
  res.innerHTML=
    '<b>n = '+n+'</b><br>'+
    '总和 = '+sum+'<br>'+
    '平均 = '+mean+'<br>'+
    '样本方差 s² = '+s2+'<br>'+
    '样本标准差 s = '+s+'<br>'+
    '总体方差 σ² = '+sigma2+'<br>'+
    '总体标准差 σ = '+sigma+'<br>'+
    '最小 = '+min+'<br>'+
    '最大 = '+max+'<br>'+
    '极差 = '+range+'<br>'+
    '中位数 = '+median;
}

// ============================================================
// [2] 线性拟合
// ============================================================
function toolPage2(){
  var h='<div style="font-weight:600;margin-bottom:8px">线性拟合（最小二乘法）</div>';
  h+='<div style="font-size:13px;color:#8c8c8c;margin-bottom:6px">x 列表与 y 列表数量必须相同</div>';
  h+='<label>x 值</label><textarea id="fitX" rows="3" style="width:48%" placeholder="逗号/空格分隔"></textarea> ';
  h+='<label>y 值</label><textarea id="fitY" rows="3" style="width:48%" placeholder="逗号/空格分隔"></textarea> ';
  h+='<button class="btn" onclick="fitCalc()">拟合</button>';
  h+='<div id="fitRes" style="margin-top:8px"></div>';
  return h;
}
function fitInit(){}
function fitCalc(){
  var res=$('fitRes');
  var xs=toolParseNums($('fitX').value,res); if(!xs) return;
  var ys=toolParseNums($('fitY').value,res); if(!ys) return;
  if(xs.length<2||ys.length<2){res.innerHTML='<span class="err">至少需要 2 个点</span>';return;}
  if(xs.length!==ys.length){res.innerHTML='<span class="err">x 和 y 数量不一致（'+xs.length+' vs '+ys.length+'）</span>';return;}
  var n=xs.length;
  var sx=0,sy=0,sxy=0,sxx=0,syy=0;
  for(var i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxy+=xs[i]*ys[i];sxx+=xs[i]*xs[i];syy+=ys[i]*ys[i];}
  var denom=n*sxx-sx*sx;
  if(denom===0){res.innerHTML='<span class="err">x 值全相同，无法拟合</span>';return;}
  var k=(n*sxy-sx*sy)/denom;
  var b=(sy-k*sx)/n;
  // R²
  var meanY=sy/n;
  var ssTot=0,ssRes=0;
  for(var j=0;j<n;j++){var yp=k*xs[j]+b;ssRes+=Math.pow(ys[j]-yp,2);ssTot+=Math.pow(ys[j]-meanY,2);}
  var R2 = ssTot===0 ? 1 : 1-ssRes/ssTot;
  res.innerHTML='<b>斜率 k = '+k.toFixed(6)+'</b><br><b>截距 b = '+b.toFixed(6)+'</b><br><b>R² = '+R2.toFixed(6)+'</b><br>拟合方程：y = '+k.toFixed(4)+'·x '+(b>=0?'+':'−')+Math.abs(b).toFixed(4);
}

// ============================================================
// [3] 有效数字修约（四舍六入五成双）
// ============================================================
function toolPage3(){
  var h='<div style="font-weight:600;margin-bottom:8px">有效数字修约（四舍六入五成双）</div>';
  h+='<div>数值 <input type="text" id="sigVal" placeholder="如 1.2345" style="width:120px"> ';
  h+='保留 <input type="number" id="sigP" min="1" value="4" style="width:60px"> 位有效数字 ';
  h+='<button class="btn" onclick="sigCalc()">修约</button></div>';
  h+='<div id="sigRes" style="margin-top:8px"></div>';
  return h;
}
function sigInit(){}
function sigCalc(){
  var res=$('sigRes');
  var v=toolNum('sigVal',res,'数值');
  if(v===null) return;
  var p=parseInt($('sigP').value,10);
  if(isNaN(p)||p<1){res.innerHTML='<span class="err">位数需为正整数</span>';return;}
  var out=sigRound(v,p);
  res.innerHTML='修约结果：<b>'+out.val+'</b><br><small>规则：'+out.rule+'</small>';
}
function sigRound(value,p){
  if(value===0) return {val:0,rule:'0 无需修约'};
  var abs=Math.abs(value);
  var exp=Math.floor(Math.log10(abs));
  var factor=Math.pow(10,p-1-exp);
  var a=Math.abs(value*factor);
  var base=Math.floor(a);
  var fr=a-base;
  var sign=value<0?-1:1;
  var rounded,rule;
  if(fr<0.5-1e-9){rounded=base;rule='四舍（舍去部分<5）';}
  else if(fr>0.5+1e-9){rounded=base+1;rule='六入（舍去部分>5）';}
  else{rounded=(base%2===0)?base:base+1;rule='五成双（=5，末位取偶）';}
  return {val:sign*rounded/factor,rule:rule};
}

// ============================================================
// [4] 相对误差
// ============================================================
function toolPage4(){
  var h='<div style="font-weight:600;margin-bottom:8px">相对误差</div>';
  h+='<div>测量值 <input type="text" id="relM" placeholder="如 9.81" style="width:100px"> ';
  h+='参考值 <input type="text" id="relR" placeholder="如 9.79" style="width:100px"> ';
  h+='<button class="btn" onclick="relCalc()">计算</button></div>';
  h+='<div id="relRes" style="margin-top:8px"></div>';
  return h;
}
function relInit(){}
function relCalc(){
  var res=$('relRes');
  var m=toolNum('relM',res,'测量值');
  if(m===null) return;
  var r=toolNum('relR',res,'参考值');
  if(r===null) return;
  if(r===0){res.innerHTML='<span class="err">参考值不能为 0</span>';return;}
  var absErr=m-r;
  var relErr=Math.abs(absErr)/Math.abs(r)*100;
  res.innerHTML='绝对误差 = '+absErr+'<br>相对误差 = <b>'+relErr.toFixed(4)+'%</b><br><small>|测量值−参考值| / |参考值| × 100%</small>';
}

// ============================================================
// [5] SI 词头
// ============================================================
var SIP={Y:1e24,Z:1e21,E:1e18,P:1e15,T:1e12,G:1e9,M:1e6,k:1e3,h:1e2,da:1e1,'无':1,d:1e-1,c:1e-2,m:1e-3,'μ':1e-6,n:1e-9,p:1e-12,f:1e-15,a:1e-18,z:1e-21,y:1e-24};
function toolPage5(){
  var keys=Object.keys(SIP);
  var h='<div style="font-weight:600;margin-bottom:8px">SI 词头换算</div>';
  h+='<div>数值 <input type="text" id="siVal" placeholder="如 1.5" style="width:100px"> ';
  h+='源词头 <select id="siFrom"></select> 目标词头 <select id="siTo"></select></div>';
  h+='<button class="btn" onclick="siCalc()">换算</button>';
  h+='<div id="siRes" style="margin-top:8px"></div>';
  h+='<details style="margin-top:10px"><summary>完整词头表</summary><div id="siTable" style="font-size:12px;line-height:1.8"></div></details>';
  return h;
}
function siInit(){
  var keys=Object.keys(SIP);
  var mk=function(){var o='';for(var i=0;i<keys.length;i++)o+='<option value="'+keys[i]+'">'+keys[i]+' ('+SIP[keys[i]]+')</option>';return o;};
  $('siFrom').innerHTML=mk();
  $('siTo').innerHTML=mk();
  var tt='';for(var j=0;j<keys.length;j++)tt+='<span style="display:inline-block;width:120px">'+keys[j]+' = '+SIP[keys[j]]+'</span> ';
  $('siTable').innerHTML=tt;
}
function siCalc(){
  var res=$('siRes');
  var v=toolNum('siVal',res,'数值');
  if(v===null) return;
  var f=SIP[$('siFrom').value], t=SIP[$('siTo').value];
  var out=v*f/t;
  res.innerHTML='结果：<b>'+out.toPrecision(6)+'</b>（目标词头单位）<br><small>'+v+' × '+f+' ÷ '+t+'</small>';
}

// ============================================================
// [6] 浓度·稀释
// ============================================================
function toolPage6(){
  var h='<div style="font-weight:600;margin-bottom:8px">浓度·稀释（单位自己保持一致）</div>';
  h+='<div><b>(a) 稀释 c1·V1 = c2·V2</b>（填三个求第四个，留空的是待求项）</div>';
  h+='<div>c1 <input type="text" id="dC1" style="width:70px"> V1 <input type="text" id="dV1" style="width:70px"> c2 <input type="text" id="dC2" style="width:70px"> V2 <input type="text" id="dV2" style="width:70px"> ';
  h+='<button class="btn" onclick="dilCalc()">求空缺项</button></div>';
  h+='<div id="dilRes" style="margin-top:6px"></div>';
  h+='<div style="margin-top:14px"><b>(b) 摩尔换算 m = n·M</b></div>';
  h+='<div>n(mol) <input type="text" id="mN" style="width:70px"> M(g/mol) <input type="text" id="mM" style="width:70px"> ';
  h+='<button class="btn" onclick="molCalc()">求质量</button></div>';
  h+='<div id="molRes" style="margin-top:6px"></div>';
  return h;
}
function dilInit(){}
function dilCalc(){
  var c1=$('dC1').value.trim(),v1=$('dV1').value.trim(),c2=$('dC2').value.trim(),v2=$('dV2').value.trim();
  var filled=[c1,v1,c2,v2].filter(function(s){return s!=='';});
  var res=$('dilRes');
  if(filled.length!==3){res.innerHTML='<span class="err">请恰好填 3 个值（留 1 个空）</span>';return;}
  // 严格校验每个已填值，并检查物理合理性（浓度/体积不能为负）
  var fields=[['dC1','c1',c1],['dV1','V1',v1],['dC2','c2',c2],['dV2','V2',v2]];
  var vals={};
  for(var i=0;i<fields.length;i++){
    if(fields[i][2]==='') continue;
    var n=(typeof strictNumber==='function')?strictNumber(fields[i][2]):parseFloat(fields[i][2]);
    if(!Number.isFinite(n)){res.innerHTML='<span class="err">'+fields[i][1]+' 不是合法数字：'+String(fields[i][2]).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>';return;}
    if(n<0){res.innerHTML='<span class="err">'+fields[i][1]+' 不能为负（浓度和体积是物理量）</span>';return;}
    vals[fields[i][1]]=n;
  }
  var A=vals.c1,B=vals.V1,C=vals.c2,D=vals.V2;
  // c1*V1 = c2*V2 → 已知三求一
  var out='';
  if(c1==='') out='c1 = (c2·V2)/V1 = '+(C*D/B).toPrecision(6);
  else if(v1==='') out='V1 = (c1·V2)/c2 = '+(A*D/C).toPrecision(6);
  else if(c2==='') out='c2 = (c1·V1)/V2 = '+(A*B/D).toPrecision(6);
  else out='V2 = (c1·V1)/c2 = '+(A*B/C).toPrecision(6);
  if((B===0&&c1==='')||(C===0&&v1==='')||(D===0&&c2==='')||(C===0&&v2==='')) res.innerHTML='<span class="err">分母为 0，无解</span>';
  else res.innerHTML=out;
}
function molCalc(){
  var res=$('molRes');
  var n=toolNumRange('mN',res,'物质的量 n',0,1e9);
  if(n===null) return;
  var M=toolNumRange('mM',res,'摩尔质量 M',0,1e9);
  if(M===null) return;
  var m=n*M;
  res.innerHTML='质量 m = n·M = '+n+' × '+M+' = <b>'+m.toPrecision(6)+'</b> g';
}

// ============================================================
// [7] 逐差法
// ============================================================
function toolPage7(){
  var h='<div style="font-weight:600;margin-bottom:8px">逐差法</div>';
  h+='<div style="font-size:13px;color:#8c8c8c;margin-bottom:6px">输入一串等间隔测量值（逗号/空格/换行分隔），需偶数个；把数据前后分组逐项相减，再求差值平均</div>';
  h+='<textarea id="diffData" rows="3" style="width:100%" placeholder="如 2.10, 2.40, 2.60, 2.90, 3.20, 3.40"></textarea> ';
  h+='<button class="btn" onclick="diffCalc()">计算</button>';
  h+='<div id="diffRes" style="margin-top:8px"></div>';
  return h;
}
function diff7Init(){}
function diffCalc(){
  var raw=$('diffData').value;
  var res=$('diffRes');
  var nums=toolParseNums(raw,res);
  if(!nums) return;
  if(nums.length===0){res.innerHTML='<span class="err">请输入至少一个数值</span>';return;}
  if(nums.length%2!==0){res.innerHTML='<span class="err">逐差法需要偶数个数据（当前 '+nums.length+' 个）</span>';return;}
  var n=nums.length, half=n/2;
  // 第 half+1 项减第 1 项，依此类推：d_i = nums[i+half] - nums[i]，i=0..half-1
  var diffs=[];
  for(var i=0;i<half;i++) diffs.push(nums[i+half]-nums[i]);
  var dAvg=diffs.reduce(function(a,b){return a+b;},0)/diffs.length;
  var list=diffs.map(function(d,i){return 'd'+(i+1)+' = x'+(i+half+1)+' − x'+(i+1)+' = '+d.toPrecision(6);}).join('<br>');
  res.innerHTML='<b>差值列表（共 '+diffs.length+' 个）</b><br>'+list+'<br><br><b>差值平均 = '+dAvg.toPrecision(6)+'</b><br><small>逐差法：把 n 个数据分前后两组，后组每项减前组对应项，再求平均</small>';
}

// ============================================================
// [8] 不确定度
// ============================================================
function toolPage8(){
  var h='<div style="font-weight:600;margin-bottom:8px">不确定度（A 类 + B 类合成）</div>';
  h+='<div style="font-size:13px;color:#8c8c8c;margin-bottom:6px">(a) 重复测量值（逗号/空格/换行分隔）(b) 仪器误差限 Δ仪</div>';
  h+='<div>重复测量值 <textarea id="uncData" rows="3" style="width:48%" placeholder="如 9.79, 9.81, 9.80"></textarea></div>';
  h+='<div>仪器误差限 Δ仪 <input type="text" id="uncDelta" placeholder="如 0.01" style="width:100px"></div>';
  h+='<div><button class="btn" onclick="uncCalc()">计算</button></div>';
  h+='<div id="uncRes" style="margin-top:8px"></div>';
  return h;
}
function unc8Init(){}
function uncCalc(){
  var raw=$('uncData').value;
  var res=$('uncRes');
  var nums=toolParseNums(raw,res);
  if(!nums) return;
  var delta=(typeof strictNumber==='function')?strictNumber($('uncDelta').value):parseFloat($('uncDelta').value);
  if(nums.length<2){res.innerHTML='<span class="err">重复测量值需至少 2 个</span>';return;}
  if(!Number.isFinite(delta)){res.innerHTML='<span class="err">请输入仪器误差限 Δ仪（必须是数字）</span>';return;}
  if(delta<=0){res.innerHTML='<span class="err">仪器误差限 Δ仪 必须是正数</span>';return;}
  var n=nums.length;
  var mean=nums.reduce(function(a,b){return a+b;},0)/n;
  if(mean===0){res.innerHTML='<span class="err">测量值平均为 0，无法计算相对不确定度（请检查数据）</span>';return;}
  var varSum=0;
  for(var i=0;i<n;i++) varSum+=Math.pow(nums[i]-mean,2);
  var s=Math.sqrt(varSum/(n-1));      // 样本标准差
  var uA=s/Math.sqrt(n);              // A 类
  var uB=delta/Math.sqrt(3);          // B 类
  var uc=Math.sqrt(uA*uA+uB*uB);      // 合成
  var U=2*uc;                          // 扩展（k=2）
  var relU=U/mean*100;                 // 相对不确定度
  // 规范写法：U 修约到 1 位有效数字，平均修约到同样小数位
  var eExp=Math.floor(Math.log10(U));
  var U2=Math.round(U/Math.pow(10,eExp))*Math.pow(10,eExp);
  var d=0;
  for(var k=0;k<=10;k++){if(Math.abs(U2*Math.pow(10,k)-Math.round(U2*Math.pow(10,k)))<1e-9){d=k;break;}}
  var meanStr=mean.toFixed(d), U2Str=U2.toFixed(d);
  res.innerHTML=
    '<b>n = '+n+'</b><br>'+ '平均 = '+mean+'<br>'+
    '样本标准差 s = '+s+'<br>'+
    'A 类 uA = s/√n = '+uA+'<br>'+
    'B 类 uB = Δ仪/√3 = '+uB+'<br>'+
    '合成 uc = √(uA²+uB²) = '+uc+'<br>'+
    '扩展 U = 2·uc = <b>'+U+'</b><br>'+
    '相对不确定度 = U/平均×100% = '+relU+'%<br>'+
    '<div style="font-size:20px;margin-top:6px">规范写法：'+meanStr+' ± '+U2Str+'</div>';
}

// ============================================================
// [9] 格拉布斯检验
// ============================================================
var GRABBS_CRIT={3:1.153,4:1.463,5:1.672,6:1.822,7:1.938,8:2.032,9:2.110,10:2.176};
function toolPage9(){
  var h='<div style="font-weight:600;margin-bottom:8px">格拉布斯检验（异常值检测）</div>';
  h+='<div style="font-size:13px;color:#8c8c8c;margin-bottom:6px">输入一串数字（逗号/空格/换行分隔），n 在 3~10 时按临界值表判断；n&gt;10 仅供参考</div>';
  h+='<textarea id="grabData" rows="3" style="width:100%" placeholder="如 9.79, 9.81, 9.80, 9.78, 9.82, 9.81"></textarea> ';
  h+='<button class="btn" onclick="grabCalc()">检验</button>';
  h+='<div id="grabRes" style="margin-top:8px"></div>';
  return h;
}
function grabbs9Init(){}
function grabCalc(){
  var raw=$('grabData').value;
  var res=$('grabRes');
  var nums=toolParseNums(raw,res);
  if(!nums) return;
  var n=nums.length;
  if(n<3){res.innerHTML='<span class="err">至少需要 3 个数据（当前 '+n+' 个）</span>';return;}
  var mean=nums.reduce(function(a,b){return a+b;},0)/n;
  var sd=Math.sqrt(nums.reduce(function(a,b){return a+Math.pow(b-mean,2);},0)/(n-1));
  if(sd===0){res.innerHTML='数据完全一致（sd=0），无需检验，未发现异常。';return;}
  var cv=GRABBS_CRIT[n];
  var cvNote=(n>10)?'（n&gt;10，本表不适用，仅供参考）':(cv?'':'');
  var rows=nums.map(function(x,i){
    var z=Math.abs(x-mean)/sd;
    var suspect=(!!cv && z>cv);
    return '<tr><td>'+(i+1)+'</td><td>'+x+'</td><td>'+(x-mean>=0?'+':'')+ (x-mean).toPrecision(5)+'</td><td>'+z.toPrecision(5)+'</td><td>'+(suspect?'⚠ 可疑':'—')+'</td></tr>';
  }).join('');
  var suspects=[];
  nums.forEach(function(x,i){
    var z=Math.abs(x-mean)/sd;
    if(cv && z>cv) suspects.push('第 '+(i+1)+' 个数据（值 '+x+'）');
  });
  var conclusion=(suspects.length>0)
    ? suspects.join('、')+' 可疑（格拉布斯检验，α=0.05）'
    : '未发现可疑数据（格拉布斯检验，α=0.05）';
  res.innerHTML=
    '<b>n = '+n+'</b>，平均 = '+mean.toPrecision(6)+'，样本标准差 sd = '+sd.toPrecision(6)+
    (cv?'，临界值 G('+n+') = '+cv+'<br>':'')+cvNote+'\n'+
    '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px">'+
    '<thead><tr><th style="padding:4px;border:1px solid #e8e8e8">#</th><th style="padding:4px;border:1px solid #e8e8e8">x</th><th style="padding:4px;border:1px solid #e8e8e8">x−均值</th><th style="padding:4px;border:1px solid #e8e8e8">z</th><th style="padding:4px;border:1px solid #e8e8e8">判断</th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table>'+
    '<div style="margin-top:8px;font-size:14px;font-weight:600">'+conclusion+'</div>';
}

// ============================================================
// [10] 溶液配制
// ============================================================
function toolPage10(){
  var h='<div style="font-weight:600;margin-bottom:8px">溶液配制（由固体配制）</div>';
  h+='<div style="font-size:13px;color:#8c8c8c;margin-bottom:6px">m = c × (V/1000) × M，输出需称取固体质量（4 位有效数字）</div>';
  h+='<div>目标浓度 c(mol/L) <input type="text" id="solnC" placeholder="如 0.1" style="width:80px"> '+
      '体积 V(mL) <input type="text" id="solnV" placeholder="如 500" style="width:80px"> '+
      '摩尔质量 M(g/mol) <input type="text" id="solnM" placeholder="如 58.44" style="width:80px"> '+
      '<button class="btn" onclick="solnCalc()">计算</button></div>';
  h+='<div id="solnRes" style="margin-top:8px"></div>';
  h+='<div style="margin-top:10px;font-size:12px;color:#8c8c8c">若要由浓溶液稀释，请用【浓度·稀释】工具</div>';
  return h;
}
function soln10Init(){}
function solnCalc(){
  var res=$('solnRes');
  var c=toolNumRange('solnC',res,'目标浓度 c',0,1e9);
  if(c===null) return;
  var v=toolNumRange('solnV',res,'体积 V',0,1e9);
  if(v===null) return;
  var mM=toolNumRange('solnM',res,'摩尔质量 M',0,1e9);
  if(mM===null) return;
  var mass=c*(v/1000)*mM;
  var sig4=mass.toPrecision(4);
  res.innerHTML=
    '代入：m = c × (V/1000) × M = '+c+' × ('+v+'/1000) × '+mM+'<br>\n'+
    ' = '+c+' × '+(v/1000).toPrecision(6)+' × '+mM+' = <b>'+mass+'</b><br>'+
    '<div style="font-size:20px;margin-top:6px">需称取 <b>'+sig4+' g</b></div>';
}

// ============================================================
// [11] 几何体积
// ============================================================
var GEO_SHAPES={
  '球(直径 d)':{
    fields:[{id:'geoD',label:'直径 d',ph:'如 5'}],
    calc:function(v){
      var d=v[0];
      var V=Math.PI*Math.pow(d,3)/6;
      var S=Math.PI*d*d;
      return {V:V,S:S,unitNote:'输入单位是什么，体积就是该单位的³，面积就是该单位的²（例如输入 cm → 体积 cm³，面积 cm²）'};
    }
  },
  '圆柱(直径 d、高 h)':{
    fields:[{id:'geoD',label:'直径 d',ph:'如 4'},{id:'geoH',label:'高 h',ph:'如 10'}],
    calc:function(v){
      var d=v[0],h=v[1];
      var V=Math.PI*d*d*h/4;
      var S=Math.PI*d*d/2+Math.PI*d*h;
      return {V:V,S:S,unitNote:'输入单位是什么，体积就是该单位的³，面积就是该单位的²（例如输入 cm → 体积 cm³，面积 cm²）'};
    }
  },
  '正方体(边长 a)':{
    fields:[{id:'geoA',label:'边长 a',ph:'如 3'}],
    calc:function(v){
      var a=v[0];
      var V=Math.pow(a,3);
      var S=6*a*a;
      return {V:V,S:S,unitNote:'输入单位是什么，体积就是该单位的³，面积就是该单位的²（例如输入 cm → 体积 cm³，面积 cm²）'};
    }
  },
  '长方体(长a 宽b 高c)':{
    fields:[{id:'geoA',label:'长 a',ph:'如 4'},{id:'geoB',label:'宽 b',ph:'如 3'},{id:'geoC',label:'高 c',ph:'如 2'}],
    calc:function(v){
      var a=v[0],b=v[1],c=v[2];
      var V=a*b*c;
      var S=2*(a*b+b*c+c*a);
      return {V:V,S:S,unitNote:'输入单位是什么，体积就是该单位的³，面积就是该单位的²（例如输入 cm → 体积 cm³，面积 cm²）'};
    }
  },
  '圆锥(直径 d、高 h)':{
    fields:[{id:'geoD',label:'直径 d',ph:'如 4'},{id:'geoH',label:'高 h',ph:'如 6'}],
    calc:function(v){
      var d=v[0],h=v[1];
      var V=Math.PI*d*d*h/12;
      var lateral=Math.PI*(d/2)*Math.sqrt(h*h+d*d/4);
      var S=Math.PI*d*d/4+lateral;
      return {V:V,S:S,lateral:lateral,unitNote:'输入单位是什么，体积就是该单位的³，面积就是该单位的²（例如输入 cm → 体积 cm³，面积 cm²）'};
    }
  }
};
function geo11BuildInputs(){
  var sel=$('geoShape');
  var name=sel?sel.value:Object.keys(GEO_SHAPES)[0];
  var def=GEO_SHAPES[name];
  var wrap=$('geoInputs');
  if(wrap&&def){
    wrap.innerHTML=def.fields.map(function(f){
      return f.label+' <input type="text" id="'+f.id+'" placeholder="'+f.ph+'" style="width:80px">';
    }).join(' ');
  }
}
function toolPage11(){
  var names=Object.keys(GEO_SHAPES);
  var h='<div style="font-weight:600;margin-bottom:8px">几何体积</div>';
  h+='<div>选择形状 <select id="geoShape">';
  names.forEach(function(n){h+='<option>'+n+'</option>';});
  h+='</select></div>';
  h+='<div id="geoInputs" style="margin:8px 0"></div>';
  h+='<button class="btn" onclick="geoCalc()">计算</button>';
  h+='<div id="geoRes" style="margin-top:8px"></div>';
  return h;
}
function geo11Init(){
  var sel=$('geoShape');
  if(sel) sel.onchange=geo11BuildInputs;
  geo11BuildInputs();
}
function geoCalc(){
  var sel=$('geoShape');
  if(!sel)return;
  var name=sel.value;
  var def=GEO_SHAPES[name];
  if(!def)return;
  var res=$('geoRes');
  var vals=[];
  for(var k=0;k<def.fields.length;k++){
    var f=def.fields[k];
    var n=toolNumRange(f.id,res,f.label,0,1e9);   // 尺寸必须为正数
    if(n===null) return;
    vals.push(n);
  }
  var r=def.calc(vals);
  var html='<b>体积 V = '+r.V.toPrecision(6)+'</b><br>';
  if(r.lateral!==undefined) html+='<b>侧面积 = '+r.lateral.toPrecision(6)+'</b><br>';
  html+='<b>表面积 S = '+r.S.toPrecision(6)+'</b><br>';
  html+='<div style="font-size:12px;color:#8c8c8c;margin-top:6px">'+r.unitNote+'</div>';
  res.innerHTML=html;
}

// ===== ESC 关闭 =====
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  var vis=function(id){ var el=document.getElementById(id); return el && getComputedStyle(el).display!=='none'; };
  if(vis('tools')){ closeTools(); return; }
  if(vis('ai'))   { closeAI();   return; }
});
