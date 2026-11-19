'use strict';const $=id=>document.getElementById(id);let mode='real',port=null,reader=null,readAbort=false,connected=false,collect=false,paused=false,calibration=[],calibrating=false,raw=[],bad=0,origin=null,previousStamp=null,wrapOffset=0,lastStamp=null,sampleDt=[],analysisResult=null,rawPackets=[],trials=[],datasetIsDemo=false;const MAX_POINTS=7000;
function status(s,on=false){$('connText').textContent=s;$('connDot').className='dot'+(on?' on':'');$('headerStatus').textContent=on?'● ESP32 ĐANG KẾT NỐI':mode==='sim'?'✦ MÔ PHỎNG':'● SẴN SÀNG';}
function setMode(m){mode=m;let sim=m==='sim';document.querySelectorAll('[data-lab-nav]').forEach(card => { const chosen = card.getAttribute('data-lab-nav') === (sim ? 'sim' : 'real'); card.classList.toggle('selected', chosen); card.setAttribute('aria-pressed', String(chosen)); });$('modeReal').classList.toggle('active',!sim);$('modeSim').classList.toggle('active',sim);$('realControls').classList.toggle('hidden',sim);$('simControls').classList.toggle('hidden',!sim);$('realView').classList.toggle('hidden',sim);$('simView').classList.toggle('hidden',!sim);$('helpText').innerHTML=sim?'① Thay đổi khối lượng, độ cứng và biên độ.<br>② Quan sát chuyển động cùng đồ thị.<br>③ Bật/tắt tắt dần và thay đổi tốc độ.<br>④ Xuất CSV mô phỏng để thực hành.':'① Kết nối ESP32 qua USB.<br>② Giữ vật đứng yên và hiệu chuẩn.<br>③ Bấm Bắt đầu, thả nhẹ vật.<br>④ Xem biên độ, chu kỳ và xuất kết quả.<br>Hoặc nhập CSV khi không có thiết bị.';status(connected?'ESP32 đã kết nối':'Chưa kết nối • hỗ trợ Web Serial',connected);}
$('modeReal').onclick=()=>setMode('real');$('modeSim').onclick=()=>setMode('sim');
async function connectSerial(){if(!('serial' in navigator)){status('Trình duyệt không hỗ trợ Web Serial. Hãy dùng Chrome/Edge trên localhost hoặc HTTPS.');return;}try{port=await navigator.serial.requestPort();await port.open({baudRate:115200});connected=true;readAbort=false;status('Đã kết nối 115200 baud',true);readLoop();}catch(e){status('Không kết nối được: '+e.message);}}
async function closeSerial(){readAbort=true;collect=false;if(reader){try{await reader.cancel();}catch(e){}}if(port){try{await port.close();}catch(e){}}reader=null;port=null;connected=false;status('Đã ngắt kết nối');}
async function readLoop(){const decoder=new TextDecoder();let pending='';try{while(port&&port.readable&&!readAbort){reader=port.readable.getReader();try{while(!readAbort){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});if(pending.length>30000)pending=pending.slice(-2000);let pos;while((pos=pending.indexOf('\n'))>=0){let line=pending.slice(0,pos);pending=pending.slice(pos+1);parseSerial(line);}}}finally{reader.releaseLock();reader=null;}}}catch(e){status('Lỗi đọc USB: '+e.message);}finally{if(!readAbort)await closeSerial();}}
function parseSerial(line){line=line.trim();if(!line)return;if(line.startsWith('#')){if(line.includes('MEASUREMENT_RESET')){startNewFirmwareSession();}return;}const p=line.split(',');if(p.length!==3)return;const stamp=Number(p[0]),dist=Number(p[1]),st=Number(p[2]);if(!Number.isFinite(stamp)||!Number.isFinite(dist)||!Number.isInteger(st))return;if(collect&&!paused){datasetIsDemo=false;rawPackets.push({stamp,dist,status:st});// Luu tat ca goi du lieu Serial cua phien thuc nghiem de kiem chung.
  }if(st!==0){bad++;return;}if(dist<=0||dist>5000)return;if(calibrating){calibration.push(dist);if(calibration.length>=100){let avg=calibration.reduce((a,b)=>a+b,0)/calibration.length;let variance=calibration.reduce((a,b)=>a+(b-avg)**2,0)/calibration.length;if(Math.sqrt(variance)>2.5){status('Hiệu chuẩn bị từ chối: vật còn chuyển động hoặc tín hiệu nhiễu.',connected);}else{$('d0').value=avg.toFixed(2);status('Đã hiệu chuẩn d₀ = '+avg.toFixed(2)+' mm',connected);}calibrating=false;}return;}if(collect&&!paused)append(stamp,dist);}
function append(stamp,dist){if(lastStamp!==null&&stamp<lastStamp&&lastStamp-stamp>1e8)wrapOffset+=4294967296;lastStamp=stamp;const absolute=(stamp+wrapOffset)/1e6;if(origin===null)origin=absolute;const t=absolute-origin;if(raw.length&&t<=raw[raw.length-1].t)return;if(raw.length){const dt=t-raw[raw.length-1].t;if(dt>0&&dt<3){sampleDt.push(dt);if(sampleDt.length>300)sampleDt.shift();}}raw.push({t,d:dist});if(raw.length>MAX_POINTS)raw.shift();}
function clearData(){raw=[];rawPackets=[];datasetIsDemo=false;origin=null;wrapOffset=0;lastStamp=null;bad=0;sampleDt=[];analysisResult=null;} function startNewFirmwareSession(){if(rawPackets.length)rawPackets.push({marker:'# MEASUREMENT_RESET'});raw=[];origin=null;previousStamp=null;wrapOffset=0;lastStamp=null;sampleDt=[];analysisResult=null;calibration=[];calibrating=false;status('ESP32 bắt đầu phiên mới; dữ liệu Serial cũ vẫn có thể xuất CSV',connected);}
$('connect').onclick=connectSerial;$('disconnect').onclick=closeSerial;$('startReal').onclick=()=>{if(!raw.length)datasetIsDemo=false;collect=true;paused=false;status(connected?'Đang đo':'Đang chờ dữ liệu (hoặc nhập CSV)',connected)};$('pauseReal').onclick=()=>{paused=true};$('resumeReal').onclick=()=>{collect=true;paused=false};$('clearReal').onclick=clearData;$('calibrate').onclick=()=>{calibration=[];calibrating=true;status('Đang thu 100 mẫu: giữ vật đứng yên!',connected)};$('filterPower').oninput=()=>$('filterLabel').textContent='Mức '+$('filterPower').value;
function importCSV(text){
 const lines=text.split(/\r?\n/);let pts=[];
 for(const ln of lines){const p=ln.trim().split(',');if(p.length<3||p[0].startsWith('#')||/^timestamp|^time_s/i.test(p[0]))continue;
  const a=Number(p[0]),b=Number(p[1]),c=Number(p[2]);
  if(Number.isFinite(a)&&Number.isFinite(b)&&Number.isInteger(c)&&c>=0&&c<=3)pts.push({a,b,c});
 }
 if(!pts.length){alert('CSV cần có 3 cột: timestamp_us,distance_mm,status');return;}
 clearData();datasetIsDemo=false;let first=null,valid=0,previous=null,offset=0;
 for(const p of pts){
   if(previous!==null&&p.a<previous&&previous-p.a>1e8)offset+=4294967296;
   previous=p.a;const stamp=p.a+offset;
   rawPackets.push({stamp:p.a,dist:p.b,status:p.c});
   if(p.c!==0){bad++;continue;}
   if(!(p.b>0&&p.b<5000))continue;
   if(first===null)first=stamp;
   const t=(stamp-first)/1e6;
   if(raw.length&&t<=raw[raw.length-1].t)continue;
   if(raw.length){const dt=t-raw[raw.length-1].t;if(dt>0&&dt<3)sampleDt.push(dt);}
   raw.push({t,d:p.b});valid++;
 }
 if(raw.length>MAX_POINTS)raw=raw.slice(-MAX_POINTS);

 collect=false;status(`Đã nhập ${valid} mẫu hợp lệ, ${bad} mẫu lỗi`,false);
}
$('csvFile').onchange=async e=>{let f=e.target.files[0];let name=$('csvFileName');if(name){name.textContent=f?f.name:'Chưa chọn tệp';name.title=f?f.name:'Chưa chọn tệp';}if(f)importCSV(await f.text());};
function filteredValues(){let d0=Number($('d0').value)||0, xs=raw.map(r=>d0-r.d), mode=$('filter').value,n=Number($('filterPower').value);if(mode==='off')return xs;if(mode==='ema'){let a=2/(n+1),v=xs[0]||0;return xs.map(x=>(v=a*x+(1-a)*v));}let sum=0;return xs.map((x,i)=>{sum+=x;if(i>=n)sum-=xs[i-n];return sum/Math.min(i+1,n)});}
function median(vals){if(!vals.length)return NaN;let a=[...vals].sort((x,y)=>x-y);let k=Math.floor(a.length/2);return a.length%2?a[k]:(a[k-1]+a[k])/2;}
function regression(t,y){let n=t.length;if(n<3)return null;let mt=t.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;
 let xx=0,xy=0,yy=0;for(let i=0;i<n;i++){let dx=t[i]-mt,dy=y[i]-my;xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;}
 if(xx<=1e-12||yy<=1e-12)return null;let slope=xy/xx,intercept=my-slope*mt;
 let residual=0;for(let i=0;i<n;i++)residual+=(y[i]-(intercept+slope*t[i]))**2;
 return {slope,intercept,r2:Math.max(0,1-residual/yy)};}
function findExtrema(v,t,periodGuess){
  const result={peaks:[],valleys:[]};if(v.length<7)return result;
  const mn=Math.min(...v),mx=Math.max(...v),height=mx-mn;
  // Noise gate: prominence must exceed at least 1.5 mm and 15% of whole-signal range.
  const prominence=Math.max(1.5,height*.15),separation=Math.max(.17,(periodGuess||.7)*.45);
  for(const type of ['peaks','valleys']){
    const sign=type==='peaks'?1:-1;let candidates=[];
    for(let i=2;i<v.length-2;i++){
      let q=sign*v[i];if(!(q>sign*v[i-1]&&q>=sign*v[i+1]))continue;
      let left=Infinity,right=Infinity;
      for(let j=i-1;j>=0&&t[i]-t[j]<Math.max(.4,periodGuess||.7);j--)left=Math.min(left,sign*v[j]);
      for(let j=i+1;j<v.length&&t[j]-t[i]<Math.max(.4,periodGuess||.7);j++)right=Math.min(right,sign*v[j]);
      if(!Number.isFinite(left)||!Number.isFinite(right))continue;
      if(q-Math.max(left,right)>=prominence)candidates.push(i);
    }
    let selected=[];for(const i of candidates){if(!selected.length||t[i]-t[selected[selected.length-1]]>=separation)selected.push(i);
      else if(sign*v[i]>sign*v[selected[selected.length-1]])selected[selected.length-1]=i;}
    result[type]=selected;
  }
  return result;
}
function estimate(){
 if(raw.length<50)return {error:'Cần ít nhất 50 mẫu hợp lệ'};
 const end=raw.length, cutoff=raw[end-1].t-25;let begin=0;
 while(begin<end&&raw[begin].t<cutoff)begin++;
 const x=filteredValues().slice(begin),times=raw.slice(begin).map(r=>r.t);
 if(x.length<50)return {error:'Chưa đủ mẫu trong cửa sổ phân tích'};
 const offset=median(x),center=x.map(v=>v-offset);
 const fullRange=Math.max(...center)-Math.min(...center);
 if(fullRange<4)return {error:'Biên độ quá nhỏ để tách khỏi nhiễu'};
 let dt=[];for(let i=1;i<times.length;i++)dt.push(times[i]-times[i-1]);
 let mdt=median(dt),maxGap=Math.max(...dt);
 if(!Number.isFinite(mdt)||mdt<=0||maxGap>Math.max(.18,mdt*3.5))return {error:'Có mất mẫu/gián đoạn thời gian: không phân tích chu kỳ'};
 // Preliminary peaks to estimate nominal cycle spacing.
 let initial=findExtrema(center,times,.5);
 let prelim=initial.peaks.slice(1).map((i,j)=>times[i]-times[initial.peaks[j]]).filter(v=>v>.2&&v<6);
 let guess=prelim.length?median(prelim):.7;
 const ext=findExtrema(center,times,guess);
 const peaks=ext.peaks,valleys=ext.valleys;
 if(peaks.length<4||valleys.length<3)return {error:'Cần ≥4 đỉnh và ≥3 đáy rõ ràng',peaks:peaks.length,valleys:valleys.length};
 const intervals=peaks.slice(1).map((i,j)=>times[i]-times[peaks[j]]);
 let nominal=median(intervals),good=intervals.filter(v=>v>.25&&v<8&&Math.abs(v-nominal)/nominal<.2);
 if(good.length<3)return {error:'Các đỉnh chưa đủ đều để suy ra chu kỳ',peaks:peaks.length,valleys:valleys.length};
 const T=median(good),dispersion=Math.sqrt(good.reduce((s,v)=>s+(v-T)**2,0)/good.length)/T;
 if(dispersion>.12)return {error:'Chu kỳ dao động biến thiên quá mạnh',peaks:peaks.length,valleys:valleys.length};
 const lastPeak=times[peaks[peaks.length-1]];
 if(times[times.length-1]-lastPeak>Math.max(.5,T*1.4))return {error:'Dao động đã dừng hoặc thiếu đỉnh mới',peaks:peaks.length,valleys:valleys.length};
 // Amplitude from latest complete peak-to-peak cycle, including its valley.
 const a=peaks[peaks.length-2],b=peaks[peaks.length-1],part=center.slice(a,b+1);
 const A=(Math.max(...part)-Math.min(...part))/2;
 if(A<1.5)return {error:'Biên độ chu kỳ gần nhất thấp so với nhiễu',peaks:peaks.length,valleys:valleys.length};
 // Damped envelope: use local full-cycle half ranges, not raw peak positions
 let envelopes=[];for(let j=1;j<peaks.length;j++){
   const i0=peaks[j-1],i1=peaks[j];let seg=center.slice(i0,i1+1);
   let av=(Math.max(...seg)-Math.min(...seg))/2;
   if(av>1.5&&Number.isFinite(av))envelopes.push({t:(times[i0]+times[i1])/2,a:av});
 }
 let damping=null;
 if(envelopes.length>=5){
  let fit=regression(envelopes.map(z=>z.t-envelopes[0].t),envelopes.map(z=>Math.log(z.a)));
  if(fit&&fit.slope<0&&fit.r2>=.7){damping={beta:-fit.slope,r2:fit.r2,t0:envelopes[0].t,A0:Math.exp(fit.intercept)};}
 }
 const cycles=good.length,confidence=cycles>=10&&dispersion<.06?'Tốt (đủ ≥10 chu kỳ)':cycles>=5&&dispersion<.10?'Khá (chưa đối chứng)':'Sơ bộ (cần thêm chu kỳ)';
 return {A,T,f:1/T,w:2*Math.PI/T,offset,phaseTime:lastPeak,peaks:peaks.length,valleys:valleys.length,peakTimes:peaks.map(i=>times[i]),valleyTimes:valleys.map(i=>times[i]),peakXY:peaks.map(i=>[times[i],x[i]]),valleyXY:valleys.map(i=>[times[i],x[i]]),cycles,quality:dispersion,confidence,damping,envelopes};
}
function num(n,d=2){return Number.isFinite(n)?n.toFixed(d):'—'}
function drawGraph(canvas,series,span=15,center=0){let r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));let c=canvas.getContext('2d');c.scale(dpr,dpr);const W=r.width,H=r.height,L=57,R=17,T=15,B=41,PW=W-L-R,PH=H-T-B;c.fillStyle='#1b1421';c.fillRect(0,0,W,H);let latest=series.reduce((m,s)=>s.points.length?Math.max(m,s.points[s.points.length-1][0]):m,0),left=Math.max(0,latest-span);let visible=series.flatMap(s=>s.points.filter(p=>p[0]>=left&&p[0]<=left+span).map(p=>p[1]));let range=Math.max(12,...visible.map(v=>Math.abs(v-center)*1.18));range=Math.ceil(range/5)*5;function X(t){return L+(t-left)/span*PW}function Y(y){return T+PH/2-(y-center)/(2*range)*PH}c.lineWidth=1;c.font='11px Segoe UI';for(let i=0;i<=5;i++){let x=L+PW*i/5;c.strokeStyle='#5a3a52';c.beginPath();c.moveTo(x,T);c.lineTo(x,T+PH);c.stroke();c.fillStyle='#dcc5d2';c.textAlign='center';c.fillText((left+i*span/5).toFixed(1),x,H-21)}for(let j=0;j<=4;j++){let y=T+PH*j/4,val=center+range*(1-2*j/4);c.strokeStyle='#5a3a52';c.beginPath();c.moveTo(L,y);c.lineTo(W-R,y);c.stroke();c.textAlign='right';c.fillStyle='#dcc5d2';c.fillText(val.toFixed(0),L-7,y+4)}for(const s of series){c.strokeStyle=s.color;c.lineWidth=s.width||2;c.beginPath();let first=true;for(const [t,y] of s.points){if(t<left||t>left+span)continue;let x=X(t),v=Y(y);if(first){c.moveTo(x,v);first=false}else c.lineTo(x,v)}c.stroke()}c.fillStyle='#e0c1d3';c.textAlign='center';c.fillText('Thời gian t (s)',L+PW/2,H-3);c.save();c.translate(13,T+PH/2);c.rotate(-Math.PI/2);c.fillText('Li độ x (mm)',0,0);c.restore();}
function displayReal(){let xs=filteredValues();analysisResult=estimate();let a=analysisResult,e=raw.length?raw[raw.length-1]:null;$('rDist').textContent=e?num(e.d,1):'—';$('rDisp').textContent=e?num(xs[xs.length-1],1):'—';$('rAmp').textContent=a?.A?num(a.A,1):'—';$('rPeriod').textContent=a?.T?num(a.T,3):'—';$('rFreq').textContent=a?.f?num(a.f,3):'—';$('rOmega').textContent=a?.w?num(a.w,2):'—';let dt=sampleDt.length?sampleDt.reduce((s,x)=>s+x,0)/sampleDt.length:NaN;$('sampleStatus').textContent=`${raw.length} mẫu hợp lệ · ${bad} mẫu lỗi · Δt TB ${num(dt*1000,1)} ms`; $('quality').textContent=a?.A?`Đã nhận ${a.peaks} đỉnh · CV chu kỳ ${num(a.quality*100,1)}%`:(a?.error||'Chưa đủ mẫu');$('analysis').innerHTML=a?.A?`Biên độ xấp xỉ: <b>${num(a.A,1)} mm</b><br>Chu kỳ: <b>${num(a.T,3)} s</b><br>Tần số: <b>${num(a.f,3)} Hz</b><br>Tần số góc: <b>${num(a.w,2)} rad/s</b><br>Độ lệch nền: ${num(a.offset,1)} mm<br><span class="hint">Chỉ là ước lượng từ các đỉnh, không phải giá trị chuẩn kiểm định.</span>`:(a?.error||'Cần ít nhất vài chu kỳ để phân tích.');$('equation').textContent=a?.A?`x(t) ≈ ${num(a.A,1)} cos(${num(a.w,2)} × (t − ${num(a.phaseTime,2)})) + ${num(a.offset,1)} mm`:'Chưa đủ dữ liệu để lập mô hình.';$('warnings').textContent=sampleDt.length&&dt>.06?'Tần suất thấp hơn 17 Hz; cần kiểm tra timing budget và tốc độ chuyển động.':'Chu kỳ lấy mẫu thực tế được tính từ timestamp ESP32. Chưa xác nhận độ chính xác thực nghiệm.';let series=[];if(raw.length){if($('showRaw').checked)series.push({color:'#b18aa7',width:1,points:raw.map((r,i)=>[r.t,Number($('d0').value)-r.d])});if($('showFiltered').checked)series.push({color:'#ff69bd',width:2.3,points:raw.map((r,i)=>[r.t,xs[i]])});if($('showTheory').checked&&a?.A)series.push({color:'#ffd088',width:1.8,points:raw.map(r=>[r.t,a.offset+a.A*Math.cos(a.w*(r.t-a.phaseTime))])});}drawGraph($('realChart'),series,Number($('window').value));}
function dl(filename,contents,type){let blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}$('exportCsv').onclick=()=>{if(!raw.length)return alert('Chưa có dữ liệu');let xs=filteredValues(),out='time_s,distance_mm,displacement_raw_mm,displacement_filtered_mm,status\n';raw.forEach((p,i)=>out+=[p.t.toFixed(6),p.d.toFixed(3),(Number($('d0').value)-p.d).toFixed(3),xs[i].toFixed(3),0].join(',')+'\n');dl('shm_thuc_nghiem.csv',out,'text/csv;charset=utf-8')};function saveCanvas(id,name){let a=document.createElement('a');a.href=$(id).toDataURL('image/png');a.download=name;a.click()}$('exportPng').onclick=()=>saveCanvas('realChart','shm_do_thuc.png');
const sim={run:true,t:0,last:performance.now()}, val=id=>Number($(id).value);function params(){let m=val('mass')/1000,k=val('k'),A=val('amp'),b=val('beta'),ph=val('phase'),w=Math.sqrt(k/m),t=sim.t;let theta=w*t+ph,e=Math.exp(-b*t),x=A*e*Math.cos(theta),v=A*e*(-b*Math.cos(theta)-w*Math.sin(theta)),acc=A*e*((b*b-w*w)*Math.cos(theta)+2*b*w*Math.sin(theta));return {m,k,A,b,ph,w,t,x,v,acc,T:2*Math.PI/w}}function springShape(end){let start=90,coilEnd=end-12,loops=23,path=`M279 ${start}`;for(let i=0;i<=loops*12;i++){let z=i/(loops*12),y=start+z*(coilEnd-start),x=279+12*Math.sin(z*loops*2*Math.PI);path+=` L${x.toFixed(2)} ${y.toFixed(2)}`}return path;}

// Typeset simulation equations only when the physical parameters change.
// The animation itself continues without waiting for MathJax.
let lastMathSignature = '';
let mathUpdateChain = Promise.resolve();
function updateSimMath(p) {
 const signature = [p.A, p.b, p.w, p.ph, p.m, p.k, p.T].join('|');
 if (signature === lastMathSignature) return;
 lastMathSignature = signature;
 const sign = p.ph < 0 ? '-' : '+';
 const phase = Math.abs(p.ph) < 0.00001 ? '' : ` ${sign} ${num(Math.abs(p.ph), 1)}`;
 const damping = p.b === 0 ? '' : String.raw`e^{-${num(p.b, 2)}t}`;
 const latex = String.raw`\[x(t) = ${num(p.A, 0)}${damping}\cos\left(${num(p.w, 2)}t${phase}\right)\,\mathrm{mm}\]`;
 const rows = [
  String.raw`\(T = 2\pi\sqrt{\frac{m}{k}} = ${num(p.T, 3)}\,\mathrm{s}\)`,
  String.raw`\(\omega = \sqrt{\frac{k}{m}} = ${num(p.w, 3)}\,\mathrm{rad/s}\)`,
  String.raw`\(m = ${num(p.m * 1000, 0)}\,\mathrm{g}\)`,
  String.raw`\(k = ${num(p.k, 1)}\,\mathrm{N/m}\)`
 ];
 const equation = $('simEquation'), context = $('simContext');
 // Serialize updates so old jobs cannot overwrite newly changed parameters.
 mathUpdateChain = mathUpdateChain.then(async () => {
  if (window.MathJax?.startup?.promise) {
   await window.MathJax.startup.promise;
   if (window.MathJax.typesetClear) MathJax.typesetClear([equation, context]);
  }
  equation.textContent = latex;
  context.innerHTML = rows.map(row => `<div class="math-row">${row}</div>`).join('');
  if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([equation, context]);
 }).catch(err => console.warn('Không thể hiển thị LaTeX:', err));
}

function renderSim(){let p=params(),end=286-p.x*2.1;$('spring').setAttribute('d',springShape(end));$('massLink').setAttribute('d',`M279 ${end-12} L279 ${end+1}`);$('weight').setAttribute('y',end);$('beam').setAttribute('d',`M280 399 L280 ${end+44}`);$('arrowLine').setAttribute('y1',end+43);$('arrowTop').setAttribute('d',`M322 ${end+50} L328 ${end+42} L334 ${end+50}`);$('massLabel').setAttribute('y',end+25);$('xTag').textContent=`x = ${p.x.toFixed(1)} mm`;$('sDisp').textContent=num(p.x,1);$('sAmp').textContent=num(p.A,0);$('sPeriod').textContent=num(p.T,3);$('sFreq').textContent=num(1/p.T,3);$('sVel').textContent=num(p.v,1);$('sAccel').textContent=num(p.acc,1);updateSimMath(p);let series=[];let points=[];for(let tt=Math.max(0,p.t-15),n=0;tt<=Math.max(15,p.t)+.001&&n<1200;tt+=.025,n++)points.push([tt,p.A*Math.exp(-p.b*tt)*Math.cos(p.w*tt+p.ph)]);series.push({points,color:'#d9579b',width:2.2});drawGraph($('simChart'),series,15);}
for(let id of ['mass','k','amp','beta','speed','phase'])$(id).oninput=()=>{$(id+'V').textContent=val(id)+(id==='mass'?' g':id==='k'?' N/m':id==='amp'?' mm':id==='beta'?' s⁻¹':id==='speed'?'×':' rad');renderSim()};$('simPlay').onclick=()=>{sim.run=!sim.run;$('simPlay').textContent=sim.run?'Ⅱ Tạm dừng':'▶ Tiếp tục'};$('simReset').onclick=()=>{sim.t=0;sim.run=true;$('simPlay').textContent='Ⅱ Tạm dừng'};$('simPng').onclick=()=>saveCanvas('simChart','shm_mo_phong.png');$('simCsv').onclick=()=>{const p=params();let out='time_s,displacement_mm,source\n';for(let t=0;t<=15;t+=.02)out+=`${t.toFixed(3)},${(p.A*Math.exp(-p.b*t)*Math.cos(p.w*t+p.ph)).toFixed(4)},simulation\n`;dl('shm_mo_phong.csv',out,'text/csv;charset=utf-8')};
let lastUpdate=0;function frame(now){if(sim.run)sim.t+=Math.min((now-sim.last)/1000,.1)*val('speed');sim.last=now;if(now-lastUpdate>90){if(mode==='sim')renderSim();else displayReal();lastUpdate=now}requestAnimationFrame(frame)}setMode('real');requestAnimationFrame(frame);for(let i=0;i<=30;i++){let tick=document.createElementNS('http://www.w3.org/2000/svg','line');tick.setAttribute('x1',i%5===0?'379':'383');tick.setAttribute('x2','393');tick.setAttribute('y1',String(98+i*9.8));tick.setAttribute('y2',String(98+i*9.8));$('ticks').appendChild(tick)}

// --- V4 visualization and scientific validation ---
const oldDisplayReal=displayReal;
displayReal=function(){oldDisplayReal();let a=analysisResult,ok=a&&Number.isFinite(a.T);
 if(ok){
  $('quality').textContent=`${a.peaks} đỉnh, ${a.valleys} đáy · ${a.cycles} chu kỳ · CV ${(a.quality*100).toFixed(1)}%`;
  $('analysis').innerHTML=`Biên độ chu kỳ gần nhất: <b>${a.A.toFixed(2)} mm</b><br>Chu kỳ trung vị: <b>${a.T.toFixed(4)} s</b><br>f = <b>${a.f.toFixed(4)} Hz</b> · ω = <b>${a.w.toFixed(3)} rad/s</b><br>Tắt dần β: <b>${a.damping?a.damping.beta.toFixed(4)+' s⁻¹':'Chưa đủ bằng chứng'}</b><br><span class="hint">${a.confidence}. Biên độ có thể bị giảm bởi bộ lọc.</span>`;
  const ctx=$('realChart').getContext('2d');const rect=$('realChart').getBoundingClientRect(), W=rect.width,H=rect.height,L=57,R=17,TOP=15,B=41;
  const span=Number($('window').value),latest=raw[raw.length-1].t,left=Math.max(0,latest-span);
  let xs=filteredValues(),range=Math.max(12,...xs.slice(-Math.round(span/Math.max(.02,median(sampleDt)||.04))).map(v=>Math.abs(v)*1.18));range=Math.ceil(range/5)*5;
  function X(t){return L+(t-left)/span*(W-L-R)}function Y(y){return TOP+(H-TOP-B)/2-y/(2*range)*(H-TOP-B)}
  if($('markPeaks').checked){for(const [items,color] of [[a.peakXY,'#ffdb85'],[a.valleyXY,'#86e5ed']]){ctx.fillStyle=color;for(const [t,y] of items){if(t<left||t>left+span)continue;ctx.beginPath();ctx.arc(X(t),Y(y),4,0,2*Math.PI);ctx.fill();}}}
  if($('showEnvelope').checked&&a.damping){let d=a.damping;for(const sign of [1,-1]){ctx.beginPath();ctx.strokeStyle='#91e2ba';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);let started=false;for(let t=left;t<=latest;t+=.08){let env=d.A0*Math.exp(-d.beta*(t-d.t0));let px=X(t),py=Y(a.offset+sign*env);if(!started){ctx.moveTo(px,py);started=true;}else ctx.lineTo(px,py);}ctx.stroke();ctx.setLineDash([]);}}
 }
};
async function sendCommand(command){
 if(!connected||!port?.writable){alert('Chưa kết nối ESP32 qua Web Serial');return;}
 let writer;
 try {writer=port.writable.getWriter();await writer.write(new TextEncoder().encode(command+'\n'));status('Đã gửi lệnh '+command,connected);}
 catch(e){status('Không gửi được lệnh: '+e.message,connected);}
 finally {if(writer)writer.releaseLock();}
}
$('resetEsp').onclick=async()=>{if(rawPackets.length&&!confirm('Bắt đầu lượt đo mới? Hãy xuất CSV gốc trước nếu cần. Các gói cũ vẫn ở bộ nhớ phiên hiện tại.'))return;await sendCommand('RESET');};
$('getEspStatus').onclick=()=>sendCommand('STATUS');
$('exportOriginal').onclick=()=>{if(!rawPackets.length)return alert('Chưa có dữ liệu Serial gốc. Nếu CSV nhập có mẫu lỗi, chúng cũng được giữ lại.');const lines=['timestamp_us,distance_mm,status'];for(let p of rawPackets){if(p.marker)lines.push(p.marker);else lines.push([p.stamp,p.dist,p.status].join(','));}dl('shm_serial_nguyen_ban.csv',lines.join('\n'),'text/csv;charset=utf-8');};
$('exportCsv').onclick=()=>{if(!raw.length)return alert('Chưa có dữ liệu');let xs=filteredValues(),out='time_s,distance_mm,displacement_raw_mm,displacement_filtered_mm,status\n';raw.forEach((p,i)=>out+=[p.t.toFixed(6),p.d.toFixed(3),(Number($('d0').value)-p.d).toFixed(3),xs[i].toFixed(3),0].join(',')+'\n');dl('shm_thuc_nghiem_da_xu_ly.csv',out,'text/csv;charset=utf-8')};
$('demoData').onclick=()=>{if(raw.length&&!confirm('Thay dữ liệu hiện tại bằng dữ liệu mô phỏng để kiểm thử giao diện?'))return;
 clearData();datasetIsDemo=true;let d0=125,T=1.15,A=18,beta=.045,dt=.04,n=600;for(let i=0;i<n;i++){let t=i*dt,noise=.38*Math.sin(i*1.63)+.23*Math.sin(i*.71),x=A*Math.exp(-beta*t)*Math.cos(2*Math.PI*t/T+.3),d=d0-x+noise;
  raw.push({t,d});rawPackets.push({stamp:Math.round(t*1e6),dist:Number(d.toFixed(3)),status:0});if(i>0)sampleDt.push(dt);
 }$('d0').value=d0;status('Đang xem dữ liệu mô phỏng kiểm thử — KHÔNG phải số đo thật',false);};


// Burgundy Pixel: navigation cards only. Core experiment and simulation code unchanged.
(function () {
  function installCardNav() {
    document.querySelectorAll('[data-lab-nav]').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-lab-nav');
        if (mode === 'real') document.getElementById('modeReal')?.click();
        if (mode === 'sim') document.getElementById('modeSim')?.click();
        if (mode === 'learn') document.getElementById('modeSim')?.click();
        document.querySelector('.layout')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',installCardNav);
  else installCardNav();
})();
