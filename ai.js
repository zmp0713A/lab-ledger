// AI 助手面板：调用本地 ai-proxy，再让 Agnes 基于引擎结果写草稿。
const AI_URL='http://127.0.0.1:4318';
var aiCurTask='explain_error';
var aiLastCleanText='';
var aiPlacements={
  explain_error:'（会自动读取上方校验区的报错，不用你填）',
  draft_conclusion:'（会自动读取当前算好的结果，不用你填）',
  clean_data:'把杂乱记录粘到这里，例如：第一次19.9 第二次19.95 第三次19.88',
  new_template:'描述实验，例如：用游标卡尺测圆柱直径，多次测量求平均',
  ask:'例如：单摆实验的系统误差主要来自哪里？'
};

// 打开面板并探测代理（连不上会自动重试：代理晚几秒起来也能自己连上）
var aiPingTimer=null, aiPingTry=0;
function openAI(){
  var panel=document.getElementById('ai');
  if(panel) panel.style.display='flex';
  aiTask(aiCurTask);
  aiPingTry=0;
  if(aiPingTimer){ clearTimeout(aiPingTimer); aiPingTimer=null; }
  aiPing();
}
function aiPing(){
  var status=document.getElementById('aiStatus');
  var btn=document.getElementById('aiSendBtn');
  var ctrl=new AbortController();
  var timer=setTimeout(function(){ ctrl.abort(); },2500);
  fetch(AI_URL+'/api/ping',{signal:ctrl.signal})
    .then(function(r){ return r.json().then(function(j){ if(!j||j.ok!==true) throw new Error('ping failed'); }); })
    .then(function(){
      clearTimeout(timer);
      aiPingTry=0;
      if(status) status.innerHTML='<span style="color:#52c41a">AI 代理已连接</span>';
      if(btn) btn.disabled=false;
      checkKeyFlow();
    })
    .catch(function(){
      clearTimeout(timer);
      aiPingTry++;
      if(btn) btn.disabled=true;
      var env=document.getElementById('aiEnv');
      if(env&&aiPingTry===1) env.innerHTML='<span style="color:#e74c3c">环境自检不可用（代理无响应）</span>';
      if(aiPingTry<=40){
        if(status) status.innerHTML='<span style="color:#fa8c16">AI 代理未启动，正在自动重试…（第 '+aiPingTry+' 次）</span>';
        aiPingTimer=setTimeout(aiPing,3000);
      }else{
        if(status) status.innerHTML='<span style="color:#e74c3c">AI 代理仍未启动：请双击项目里的『启动AI代理.cmd』</span>';
      }
    });
}

// 关闭面板（同时停止重试）
function closeAI(){
  if(aiPingTimer){ clearTimeout(aiPingTimer); aiPingTimer=null; }
  var panel=document.getElementById('ai');
  if(panel) panel.style.display='none';
}

// 切换任务
var aiTaskMemory={};   // 每个任务记住自己上次的输出，切换标签不丢
var aiHints={
  explain_error:'自动读取上方校验区的报错，让 Agnes 翻译成「哪里错 + 怎么改」',
  draft_conclusion:'自动读取当前算好的结果，让 Agnes 写结论与误差分析草稿',
  clean_data:'把杂乱记录粘到下面，Agnes 只整理格式；写入表格前必须由你预览确认',
  new_template:'描述一个新实验，Agnes 生成一份 EXP 配置代码（公式仍需人工核对）',
  ask:'向 Agnes 自由提问（物理原理、误差分析、实验操作都行）'
};
function aiTask(key){
  aiCurTask=key;
  var tabs=document.querySelectorAll('.aitab');
  for(var i=0;i<tabs.length;i++) tabs[i].className='aitab';
  // 标签按钮按 onclick 里的任务名判断高亮（兼容单/双引号写法）
  var re=new RegExp("aiTask\\(\\s*['\"]"+key+"['\"]\\s*\\)");
  for(var j=0;j<tabs.length;j++){
    var onclick=tabs[j].getAttribute('onclick')||'';
    if(re.test(onclick)) tabs[j].className='aitab active';
  }
  var input=document.getElementById('aiInput');
  if(input) input.placeholder=aiPlacements[key]||'';
  var hint=document.getElementById('aiTaskHint');
  if(hint) hint.textContent=aiHints[key]||'';
  var out=document.getElementById('aiOut');
  if(out) out.innerHTML=aiTaskMemory[key]||'';   // 切换任务不丢上次的回答
}

// 组装当前任务的数据
function buildPayload(){
  var input=document.getElementById('aiInput');
  var txt=input?input.value:'';
  if(aiCurTask==='explain_error') return {val:(document.getElementById('val')||{innerText:''}).innerText};
  if(aiCurTask==='draft_conclusion') return {results:buildResultsPayload()};
  if(aiCurTask==='clean_data') return {text:txt};
  if(aiCurTask==='new_template') return {desc:txt};
  return {question:txt};
}

// 把引擎结果整理成给 AI 的 JSON
function buildResultsPayload(){
  if(typeof computeAll!=='function'||typeof selfCheck!=='function'||typeof EXP==='undefined') return null;
  var res=computeAll();
  if(!res||res.insufficient||res.invalidUB) return null;
  var sc=selfCheck();
  if(!sc.ok) return null;
  return {
    experiment:EXP.name,
    resultName:EXP.resultName,
    resultUnit:EXP.resultUnit,
    standardValue:EXP.stdValue,
    groups:res.N,
    mean:res.mean.toFixed(4),
    sampleSD:res.sd.toFixed(4),
    relativeErrorPercent:res.rel.toFixed(2),
    uA:res.uA.toFixed(4),
    uB:res.uBEntered?res.uB:null,
    combinedStandardUncertainty:res.uC.toFixed(4),
    U:res.U2Shown,
    finalResult:EXP.resultName+' = ('+res.meanRounded+' ± '+res.U2Shown+') '+EXP.resultUnit,
    selfCheckPassed:sc.ok
  };
}

// 发送
function aiSend(){
  var out=document.getElementById('aiOut');
  var btn=document.getElementById('aiSendBtn');
  var requestTask=aiCurTask;      // 快照：防止等待期间切换任务导致旧回答写错位置
  if(aiCurTask==='draft_conclusion'){
    if(!buildResultsPayload()){ if(out) out.innerHTML='<div class="err">还没有数据，先填数据或载入示例</div>'; return; }
  }
  var payload=buildPayload();
  if(aiCurTask==='clean_data'&&(!payload.text||!payload.text.trim())){ if(out) out.innerHTML='<div class="err">先把杂乱记录粘到输入框里</div>'; return; }
  if(aiCurTask==='new_template'&&(!payload.desc||!payload.desc.trim())){ if(out) out.innerHTML='<div class="err">先描述实验</div>'; return; }
  if(aiCurTask==='ask'&&(!payload.question||!payload.question.trim())){ if(out) out.innerHTML='<div class="err">先输入问题</div>'; return; }
  showWait('正在思考…');
  if(btn) btn.disabled=true;
  var ctrl=new AbortController();
  var timer=setTimeout(function(){ ctrl.abort(); },240000);
  fetch(AI_URL+'/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:requestTask,payload:payload}),signal:ctrl.signal})
    .then(function(r){ return r.json().then(function(j){ return {r:r,j:j}; }); })
    .then(function(res){
      clearTimeout(timer); clearWait();
      if(res.j&&res.j.ok===true){
        var text=res.j.text||'';
        if(requestTask==='clean_data') aiLastCleanText=text;
        var html='<div class="aidraftbox">'
          +'<div class="aidraft">系统草稿 · 需人工确认</div><button class=copybtn onclick="copyAiText(this)">📋 复制</button>'
          +'<div class="aitext">'+escHtml(text).replace(/\n/g,'<br>')+'</div>';
        if(requestTask==='clean_data') html+='<button class="btn" onclick="aiFillTable()">填入表格</button>';
        html+='</div>';
        aiTaskMemory[requestTask]=html;
        if(out&&aiCurTask===requestTask) out.innerHTML=html;
      }else{
        var errHtml='<div class="err">'+escHtml((res.j&&res.j.error)?res.j.error:'AI 代理返回异常')+'</div>';
        aiTaskMemory[requestTask]=errHtml;
        if(out&&aiCurTask===requestTask) out.innerHTML=errHtml;
      }
    })
    .catch(function(e){
      clearTimeout(timer); clearWait();
      var msg=(e&&e.name==='AbortError')?'请求超时（超过 240 秒）':'AI 代理连接失败：'+(e&&e.message?e.message:e);
      var errHtml='<div class="err">'+escHtml(msg)+'</div>';
      aiTaskMemory[requestTask]=errHtml;
      if(out&&aiCurTask===requestTask) out.innerHTML=errHtml;
    })
    .finally(function(){ if(btn) btn.disabled=false; });
}

// 等待提示 + 计时（让用户知道没卡死）
var aiWaitTimer=null;
function showWait(msg){
  clearWait();
  var out=document.getElementById('aiOut');
  if(out){
    out.innerHTML='<div class="aidraft">🤖 '+escHtml(msg)+'</div><div class="aiwait" id="aiWait">已等待 0 秒</div>';
  }
  var t0=Date.now();
  aiWaitTimer=setInterval(function(){
    var el=document.getElementById('aiWait');
    if(el) el.textContent='已等待 '+Math.round((Date.now()-t0)/1000)+' 秒（通常 10~30 秒内返回，请勿关闭）';
  },1000);
}
function clearWait(){ if(aiWaitTimer){ clearInterval(aiWaitTimer); aiWaitTimer=null; } }

// 复制 AI 草稿文本（带旧浏览器降级）
function copyAiText(btn){
  var box=btn?btn.closest('.aidraftbox'):null;
  var txtEl=box?box.querySelector('.aitext'):null;
  var txt=txtEl?(txtEl.innerText||txtEl.textContent):'';
  if(!txt) return;
  var done=function(ok){
    btn.textContent=ok?'✓ 已复制':'复制失败';
    setTimeout(function(){ if(btn) btn.textContent='📋 复制'; },1500);
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){done(true);},function(){done(false);});
  } else {
    try{
      var ta=document.createElement('textarea');
      ta.value=txt; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); done(true);
    }catch(e){ done(false); }
  }
}

// 把 clean_data 的回答填入表格：先预览，人工确认后才写入（AI 字节不得直接改数据）
var aiPendingFill=null;
function aiFillTable(){
  var out=document.getElementById('aiOut');
  if(!out) return;
  var lines=aiLastCleanText.replace(/\r/g,'').split('\n').filter(function(s){return s.trim()!=='';});
  if(lines.length===0){ out.innerHTML='<div class="err">没有可填入的规范数据</div>'; return; }
  var colCount=(typeof EXP!=='undefined'&&EXP.cols)?EXP.cols.length:0;
  var parsed=[];
  for(var i=0;i<lines.length;i++){
    var cols=lines[i].split(/\t|,/).map(function(s){return s.trim();});
    if(cols.length!==colCount){
      out.innerHTML='<div class="err">第'+(i+1)+'行有'+cols.length+'列，当前实验需要'+colCount+'列</div>';
      return;
    }
    // 逐格校验：AI 给的候选值必须也是合法数字，否则不接受
    for(var j=0;j<cols.length;j++){
      var c=(typeof EXP!=='undefined'&&EXP.cols)?EXP.cols[j]:null;
      if(cols[j]===''&&c&&c.req) continue;   // 必填列为空：交给主表校验兜住
      if(cols[j]!==''&&typeof strictNumber==='function'&&!Number.isFinite(strictNumber(cols[j]))){
        out.innerHTML='<div class="err">第'+(i+1)+'行第'+(j+1)+'列的候选值不是合法数字：'+escHtml(cols[j])+'</div>';
        return;
      }
    }
    parsed.push(cols);
  }
  aiPendingFill=parsed;
  var prev='<div class="aidraft">系统草稿 · 需人工确认</div><div class="aitext">以下是 AI 给出的候选数据，<b>尚未写入表格</b>。请核对原始记录无误后再确认：</div>';
  prev+='<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0">';
  for(var k=0;k<parsed.length;k++){
    prev+='<tr><td style="border:1px solid #eee;padding:2px 6px;color:#8c8c8c">'+(k+1)+'</td>';
    for(var m=0;m<parsed[k].length;m++) prev+='<td style="border:1px solid #eee;padding:2px 6px;font-family:Consolas,monospace">'+escHtml(parsed[k][m])+'</td>';
    prev+='</tr>';
  }
  prev+='</table>';
  prev+='<button class="btn btn-pri" onclick="aiApplyFill()">确认覆盖表格（'+parsed.length+' 行）</button> <button class="btn" onclick="aiCancelFill()">取消</button>';
  out.innerHTML=prev;
}
// 人工确认后才真正写入
function aiApplyFill(){
  var out=document.getElementById('aiOut');
  if(!aiPendingFill||aiPendingFill.length===0){ if(out) out.innerHTML='<div class="err">没有待确认的数据</div>'; return; }
  if(typeof addRow!=='function'){ if(out) out.innerHTML='<div class="err">找不到 addRow，无法填入表格</div>'; return; }
  var tbl=document.getElementById('tbl');
  if(tbl&&tbl.tBodies[0]) tbl.tBodies[0].innerHTML='';
  for(var k=0;k<aiPendingFill.length;k++) addRow(aiPendingFill[k]);
  if(typeof recompute==='function') recompute();
  var n=aiPendingFill.length;
  aiPendingFill=null;
  var doneHtml='<div class="ok">已按你的确认填入 '+n+' 行（数据来源：AI 草稿，已人工确认）</div>';
  aiTaskMemory['clean_data']=doneHtml;
  if(out) out.innerHTML=doneHtml;
}
function aiCancelFill(){
  aiPendingFill=null;
  var out=document.getElementById('aiOut');
  var doneHtml='<div class="idle">已取消，表格未改动。</div>';
  aiTaskMemory['clean_data']=doneHtml;
  if(out) out.innerHTML=doneHtml;
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ============================================================
// AI 假设检验闭环：AI 提假设 → 确定性引擎检验 → AI 依据数字下结论
// 分工：AI 只负责"提什么假设"和"怎么解释"，所有数字与判定都由引擎给出。
// ============================================================
var hyLast=null;

// 统一的 AI 调用（返回 {ok,text,error} 而不是抛异常）
function aiCall(task,payload){
  var sig=null;
  try{ sig=(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)?AbortSignal.timeout(240000):undefined; }catch(e){ sig=undefined; }
  return fetch(AI_URL+'/api/ai',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({task:task,payload:payload}),
    signal:sig
  })
    .then(function(r){ return r.json(); })
    .then(function(j){ return j&&typeof j==='object'?j:{ok:false,error:'AI 代理返回了空响应'}; })
    .catch(function(e){
      var msg=(e&&e.name==='TimeoutError')?'请求超时（超过 240 秒）':'连接失败：'+((e&&e.message)?e.message:e);
      return {ok:false,error:msg};
    });
}

// 从 AI 文本里提取第一个配平的 JSON 对象（含 hypotheses 数组）
function extractHypotheses(text){
  if(!text) return null;
  var s=String(text);
  var start=s.indexOf('{');
  while(start>=0){
    var depth=0,inStr=false,esc=false;
    for(var i=start;i<s.length;i++){
      var ch=s.charAt(i);
      if(inStr){
        if(esc){esc=false;}
        else if(ch==='\\'){esc=true;}
        else if(ch==='"'){inStr=false;}
        continue;
      }
      if(ch==='"'){inStr=true;continue;}
      if(ch==='{'){depth++;}
      else if(ch==='}'){
        depth--;
        if(depth===0){
          try{
            var o=JSON.parse(s.slice(start,i+1));
            if(o&&Array.isArray(o.hypotheses)&&o.hypotheses.length>0) return o;
          }catch(e){}
          break;
        }
      }
    }
    start=s.indexOf('{',start+1);
  }
  return null;
}

// 按假设指定的类型跑引擎检验（只允许这三种，AI 不能自定义计算方式）
function engineRunTest(h){
  if(!h||!h.test) return {ok:false,reason:'假设没有指定检验类型'};
  var t=String(h.test).trim();
  if(t==='drop_one') return testDropOne(Number(h.row));
  if(t==='split_half') return testSplitHalf();
  if(t==='column_corr') return testColumnCorr(Number(h.colA),Number(h.colB));
  if(t==='model_fit') return testModelFit();
  return {ok:false,reason:'不支持的检验类型：'+t+'（只支持 drop_one / split_half / column_corr / model_fit）'};
}

// 引擎给出的确定性判定（与 AI 的解释分开显示）
function engineVerdict(t){
  if(!t||t.ok!==true) return {label:'无法检验', detail:(t&&t.reason)||''};
  if(t.droppedRow!==undefined){
    return {
      label: t.closerToStandard ? '剔除后更接近标准值 → 该点更像过失误差' : '剔除后并未更接近标准值 → 该点更像真实波动',
      detail: '相对误差 '+t.relativeErrorPercentBefore+'% → '+t.relativeErrorPercentAfter+'%；样本标准差 '+(t.sdShrank?'变小':'未变小')+'（'+t.sampleSDBefore+' → '+t.sampleSDAfter+'）'
    };
  }
  if(t.differenceInSD!==undefined){
    return {
      label: t.notable ? '前后半段差异超过一个标准差 → 提示存在系统性趋势' : '前后半段无明显差异 → 未见系统性趋势',
      detail: '后半段均值 − 前半段均值 = '+t.difference+'，约 '+t.differenceInSD+' 倍标准差'
    };
  }
  if(t.r!==undefined){
    return {
      label: '相关系数 r = '+t.r+'（'+t.direction+'）'+(t.strong?'，相关较强':'，相关较弱'),
      detail: 'r² = '+t.r2+'，共 '+t.pairs+' 对有效数据（'+t.columnA+' 与 '+t.columnB+'）'
    };
  }
  if(t.derivedValue!==undefined){
    return {
      label: t.supported
        ? ('数据支持该物理模型：由拟合斜率反推 '+t.derivedName+' = '+t.derivedValue+' '+t.derivedUnit+'，与标准值偏差 '+t.relativeDeviationPercent+'%（容差 '+t.tolerancePercent+'%）')
        : ('与模型预期偏差 '+t.relativeDeviationPercent+'%，超过容差 '+t.tolerancePercent+'%，当前数据不完全支持该模型'),
      detail: t.lawText+'；拟合 '+t.points+' 点，斜率 k = '+t.slope+' s²/m，截距 = '+t.intercept+'，R² = '+t.r2
    };
  }
  return {label:'检验完成', detail:''};
}

// 主流程
async function hypothesisRun(){
  var out=document.getElementById('aiOut');
  var btn=document.getElementById('aiHypoBtn');
  if(!out) return;
  var ev;
  try{ ev=evidencePack(); }catch(e){ out.innerHTML='<div class="err">无法读取当前数据：'+escHtml(e.message)+'</div>'; return; }
  if(!ev.validCount||ev.validCount<3){
    out.innerHTML='<div class="err">至少需要 3 组有效数据才能做假设检验（当前 '+ev.validCount+' 组）。可先点「载入示例数据」。</div>';
    return;
  }
  if(typeof selfCheck==='function'&&!selfCheck().ok){
    out.innerHTML='<div class="err">引擎自检未通过，已锁定结果，请先检查计算配置。</div>';
    return;
  }
  if(typeof readUB==='function'&&!readUB().valid){
    out.innerHTML='<div class="err">uB 输入无效，请先修正或清空后再做假设检验。</div>';
    return;
  }
  if(btn) btn.disabled=true;
  hyLast={evidence:ev};
  var t0=Date.now();
  var evidenceSnapshot=JSON.stringify(ev);   // 快照：AI 思考期间数据若被改动，旧结论作废
  showWait('① AI 正在阅读数据并提出可检验的假设…');

  var p1=await aiCall('hypothesis_propose',{evidence:ev});
  if(JSON.stringify(evidencePack())!==evidenceSnapshot || !selfCheck().ok){
    clearWait(); hyLast=null;
    out.innerHTML='<div class="err">等待期间实验数据已变化；本次假设检验已取消。请用当前数据重新运行。</div>';
    if(btn) btn.disabled=false;
    return;
  }
  if(!p1.ok){
    clearWait();
    out.innerHTML='<div class="err">'+escHtml(p1.error||'AI 调用失败')+'</div>';
    if(btn) btn.disabled=false;
    return;
  }
  var parsed=extractHypotheses(p1.text);
  if(!parsed){
    clearWait();
    out.innerHTML='<div class="aidraft">系统草稿 · 需人工确认</div>'
      +'<div class="aitext">AI 没有按要求返回结构化假设，以下是它的原文，请人工阅读（未做任何自动检验）：</div>'
      +'<div class="aitext">'+escHtml(p1.text).replace(/\n/g,'<br>')+'</div>';
    if(btn) btn.disabled=false;
    return;
  }
  var list=parsed.hypotheses.slice(0,4);
  hyLast.hypotheses=list;
  showWait('② AI 提出了 '+list.length+' 条假设，正在用确定性引擎逐条检验…');

  var tests=list.map(function(h){ return engineRunTest(h); });
  hyLast.tests=tests;

  showWait('③ 检验完成，AI 正在依据引擎给出的数字下结论…');
  var p2=await aiCall('hypothesis_conclude',{
    evidence:ev,
    hypotheses:list,
    testResults:tests.map(function(t,i){ return {hypothesisId:(list[i]&&list[i].id)||(i+1), result:t, engineVerdict:engineVerdict(t)}; })
  });
  if(JSON.stringify(evidencePack())!==evidenceSnapshot || !selfCheck().ok){
    clearWait(); hyLast=null;
    out.innerHTML='<div class="err">等待期间实验数据已变化；旧数据的结论未展示。请用当前数据重新运行。</div>';
    if(btn) btn.disabled=false;
    return;
  }
  hyLast.conclusion=p2.ok?p2.text:null;
  hyLast.conclusionError=p2.ok?null:(p2.error||'AI 结论生成失败');
  hyLast.elapsedMs=Date.now()-t0;
  clearWait();
  renderHypothesis();
  if(btn) btn.disabled=false;
}

// 渲染：假设 + 引擎检验数字 + 引擎判定 + AI 结论（分开展示，谁说的清清楚楚）
function renderHypothesis(){
  var out=document.getElementById('aiOut');
  if(!out||!hyLast) return;
  var h='<div class="aidraft">🔬 AI 假设检验闭环 · 系统草稿，需人工确认</div>';
  h+='<div class="aitext" style="color:#8c8c8c">分工：假设由 Agnes 提出；检验过程与全部数字由本工具的确定性引擎计算，可复算。</div>';
  var list=hyLast.hypotheses||[], tests=hyLast.tests||[];
  for(var i=0;i<list.length;i++){
    var hp=list[i]||{}, t=tests[i]||{ok:false,reason:'未执行'}, v=engineVerdict(t);
    h+='<div class="hycard">';
    h+='<div class="hyclaim">假设 '+escHtml(String(hp.id||(i+1)))+'：'+escHtml(hp.claim||'（无描述）')+'</div>';
    if(hp.predicts) h+='<div class="hypred">预期：'+escHtml(hp.predicts)+'</div>';
    h+='<div class="hytest">检验方式：'+escHtml(String(hp.test||'—'))+'　';
    if(hp.row!==undefined) h+='（第 '+escHtml(String(hp.row))+' 组）';
    if(hp.colA!==undefined) h+='（列 '+(Number(hp.colA)+1)+' 与列 '+(Number(hp.colB)+1)+'）';
    h+='</div>';
    h+='<div class="hyres">引擎判定：<b>'+escHtml(v.label)+'</b>'+(v.detail?'<br><span style="color:#8c8c8c">'+escHtml(v.detail)+'</span>':'')+'</div>';
    h+='</div>';
  }
  if(hyLast.conclusion){
    h+='<div class="aitext" style="margin-top:10px"><b>Agnes 的解释与建议（系统草稿，需人工确认）</b></div>';
    h+='<div class="aidraftbox"><button class=copybtn onclick="copyAiText(this)">📋 复制</button><div class="aitext">'+escHtml(hyLast.conclusion).replace(/\n/g,'<br>')+'</div></div>';
  }else if(hyLast.conclusionError){
    h+='<div class="err">AI 结论生成失败：'+escHtml(hyLast.conclusionError)+'（上面的引擎检验结果仍然有效）</div>';
  }
  h+='<div class="aitext" style="color:#8c8c8c;border-top:1px dashed #e8e8e8;padding-top:6px;margin-top:8px">'
    +'注意：引擎给出的是统计证据，是否剔除数据、如何解释物理原因，必须由你判断并写进报告。</div>';
  if(hyLast.elapsedMs!=null){
    h+='<div class="aitext" style="color:#8c8c8c;font-size:12px;margin-top:4px">本次闭环共 2 次 AI 调用（提假设 + 下结论），耗时约 '+Math.round(hyLast.elapsedMs/1000)+' 秒；调用记录已写入 ai-log.jsonl。</div>';
  }
  out.innerHTML=h;
}

// 载入模型检验演示数据（不同摆长；单摆专用），随后可让 Agnes 检验简谐模型
function prepareModelData(){
  var out=document.getElementById('aiOut');
  if(typeof loadModelSample!=='function'){ if(out) out.innerHTML='<div class="err">引擎未就绪</div>'; return; }
  var ok=loadModelSample();
  if(out&&ok) out.innerHTML='<div class="ok">已载入不同摆长的示例数据（6 组）。现在点「🔬 提出假设并检验」——Agnes 可以提出并检验简谐模型 T = 2π√(L/g)，引擎会从拟合斜率反推 g 并与标准值比对。</div>';
}

// 检查 API Key 是否已配置，未配置则显示输入框；同时渲染"本机环境自检"行
async function checkKeyFlow() {
  let j = null;
  try {
    const r = await fetch(AI_URL + '/api/doctor', { signal: AbortSignal.timeout(6000) });
    j = await r.json();
  } catch { j = null; }
  const box = document.getElementById('keySetup');
  const tasks = document.getElementById('aiTasks');
  // 环境自检行：Node / AGH CLI / AGH 数据目录 / 账户
  const env = document.getElementById('aiEnv');
  if (env) {
    if (!j) {
      env.innerHTML = '<span style="color:#e74c3c">环境自检不可用（代理无响应）</span>';
    } else {
      const mk = (ok, name) => '<b class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '✗') + ' ' + name + '</b>';
      env.innerHTML = '本机环境：' + mk(!!j.node, 'Node') + ' · ' + mk(!!j.aghCli, 'AGH CLI') + ' · ' + mk(!!j.aghHome, 'AGH 数据') + ' · ' + mk(!!j.hasAccount, '账户');
    }
  }
  if (!j) return;                    // doctor 失败保持现状
  if (j.ok === true && j.hasAccount === false) {
      if (box) box.style.display = 'block';
      if (tasks) tasks.style.display = 'none';
      const s = document.getElementById('aiStatus');
      if (s) s.innerHTML = '首次使用：请粘贴你的 Agnes API Key（Key 只保存在本机，由 AGH 保管）';
    } else if (j.ok !== true) {
      // 代理活着但 AGH 运行环境不完整：明确报出来，并禁用发送，避免"看着已连接、发送才失败"
      if (box) box.style.display = 'none';
      if (tasks) tasks.style.display = 'block';
      const s = document.getElementById('aiStatus');
      if (s) { s.innerHTML = '⚠ AI 环境不完整：' + (j.hint || '缺少 AGH 运行环境，AI 功能暂不可用'); s.style.color = '#e74c3c'; }
      const send = document.getElementById('aiSendBtn');
      if (send) send.disabled = true;
    } else {
      if (box) box.style.display = 'none';
      if (tasks) tasks.style.display = 'block';
    }
}

// 保存并验证 API Key
async function saveKey() {
  const inp = document.getElementById('keyInput');
  const btn = document.getElementById('keySaveBtn');
  const s = document.getElementById('aiStatus');
  const v = inp ? String(inp.value || '').trim() : '';
  if (!v) { if (s) { s.innerHTML = '请输入 API Key'; s.style.color = '#e74c3c'; } return; }
  if (s) { s.innerHTML = '正在验证并保存（约 10~30 秒，请勿关闭）...'; s.style.color = '#595959'; }
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(AI_URL + '/api/config-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: v }), signal: AbortSignal.timeout(200000) });
    const j = await r.json();
    if (j.ok) {
      if (s) { s.innerHTML = '✓ 配置成功'; s.style.color = '#52c41a'; }
      if (inp) inp.value = '';
      await checkKeyFlow();
    } else {
      if (s) { s.innerHTML = '配置失败：' + (j.error || '未知错误'); s.style.color = '#e74c3c'; }
    }
  } catch (e) {
    if (s) { s.innerHTML = '配置失败：' + e.message; s.style.color = '#e74c3c'; }
  }
  if (btn) btn.disabled = false;
}
