// chart.js — 重复测量分布图（独立文件，配合 app.js）
// 依赖 app.js 提供的全局：$、showTrace、EXP

function chartReady(res){
  const cv=$('chart'); if(!cv)return;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,cv.width,cv.height);
  if(!res){
    const padL=50,padR=20,padT=20,padB=40;
    const w=cv.width-padL-padR, h=cv.height-padT-padB;
    // 4 条很淡的水平网格线
    ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=1;
    for(let i=1;i<5;i++){
      const y=padT+h*i/4;
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(padL+w,y); ctx.stroke();
    }
    // 淡色虚线斜线
    ctx.setLineDash([4,4]); ctx.strokeStyle='#d9d9d9';
    ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(padL+w,padT+h); ctx.stroke();
    ctx.setLineDash([]);
    // 坐标轴
    ctx.strokeStyle='#d9d9d9';
    ctx.beginPath();
    ctx.moveTo(padL,padT); ctx.lineTo(padL,padT+h); ctx.lineTo(padL+w,padT+h);
    ctx.stroke();
    // 正中灰字
    ctx.fillStyle='#bfbfbf'; ctx.font='13px sans-serif'; ctx.textAlign='center';
    ctx.fillText('有数据后，这里会画出每组结果的分布点与不确定度区间',padL+w/2,padT+h/2);
    // 左下角小字
    ctx.font='12px sans-serif'; ctx.textAlign='left';
    ctx.fillText('横轴＝组号　纵轴＝结果值',padL,padT+h-4);
    ctx.textAlign='start';
    return;
  }

  const {valid,mean,U2}=res;
  const padL=50,padR=20,padT=20,padB=40;
  const w=cv.width-padL-padR, h=cv.height-padT-padB;

  const gs=valid.map(function(v){return v.g});
  const gmin=Math.min.apply(null,gs), gmax=Math.max.apply(null,gs);
  const span=Math.max(gmax-gmin,1e-9);
  const lo=gmin-span*0.1, hi=gmax+span*0.1;
  const loAll=Math.min(lo,mean-U2), hiAll=Math.max(hi,mean+U2);

  const yOf=function(val){return padT+h-(val-loAll)/(hiAll-loAll)*h};
  // 单点居中；多点让首尾正好贴住左右轴端
  const xOf=function(i){return valid.length<2 ? padL+w/2 : padL+(i/(valid.length-1))*w};

  ctx.strokeStyle='#333'; ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(padL,padT); ctx.lineTo(padL,padT+h); ctx.lineTo(padL+w,padT+h);
  ctx.stroke();

  ctx.fillStyle='#333'; ctx.font='12px sans-serif';
  ctx.fillText('组号',padL+w/2-15,cv.height-8);
  ctx.save(); ctx.translate(14,padT+h/2); ctx.rotate(-Math.PI/2);
  const ylab=EXP.resultUnit?EXP.resultName+' ('+EXP.resultUnit+')':EXP.resultName;
  ctx.fillText(ylab,0,0); ctx.restore();

  ctx.fillText(loAll.toFixed(2),4,yOf(loAll)+4);
  ctx.fillText(hiAll.toFixed(2),4,yOf(hiAll)+4);
  ctx.fillText('1',xOf(0)-4,padT+h+14);
  ctx.fillText(String(valid.length),xOf(valid.length-1)-4,padT+h+14);

  ctx.setLineDash([5,4]);
  ctx.strokeStyle='#e67e22'; ctx.beginPath();
  ctx.moveTo(padL,yOf(mean)); ctx.lineTo(padL+w,yOf(mean)); ctx.stroke();
  ctx.strokeStyle='#e74c3c'; ctx.beginPath();
  ctx.moveTo(padL,yOf(mean-U2)); ctx.lineTo(padL+w,yOf(mean-U2)); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padL,yOf(mean+U2)); ctx.lineTo(padL+w,yOf(mean+U2)); ctx.stroke();
  ctx.setLineDash([]);

  cv.__pts=[];
  ctx.fillStyle='#2980b9';
  valid.forEach(function(v,i){
    const px=xOf(i), py=yOf(v.g);
    ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
    cv.__pts.push({x:px,y:py,row:v.row,g:v.g});
  });
}

(function(){
  const cv=document.getElementById('chart'); if(!cv)return;
  cv.addEventListener('click',function(ev){
    const pts=this.__pts; if(!pts)return;
    const rect=this.getBoundingClientRect();
    const mx=(ev.clientX-rect.left)*(this.width/rect.width);
    const my=(ev.clientY-rect.top)*(this.height/rect.height);
    for(const p of pts){
      if(Math.hypot(mx-p.x,my-p.y)<10){
        const tr=document.querySelectorAll('#tbl tbody tr')[p.row-1];
        const raw=tr?EXP.cols.map(function(c){return tr.querySelector('.'+c.cls).value;}).join(', '):'';
        // 用户输入先转义再拼进弹窗，避免被当成 HTML 执行
        const vals=(typeof esc==='function')?esc(raw):String(raw).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        showTrace(
          '<b>第'+p.row+'组 '+EXP.resultName+' = '+p.g.toFixed(4)+' '+EXP.resultUnit+' 的来源</b><br>'
          +'公式：'+EXP.formulaText+'<br>'
          +'原始数据：'+vals+'<br>'
          +EXP.resultName+'<sub>'+p.row+'</sub> = '+p.g.toFixed(4)+' '+EXP.resultUnit
        );
        return;
      }
    }
  });
})();
