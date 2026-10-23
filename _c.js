
/* ================= 云服务配置（GitHub 版：使用 Supabase） ================= */
// 在 Supabase 控制台（Project Settings → API）获取下面两项：
//   endpoint        = 你的 Project URL，形如 https://xxxx.supabase.co
//   publishableKey  = anon / public key（可安全暴露在前端）
// 填好后即可使用「邮箱登录 / 云端保存 / 读取 / 删除」。
// 设为 null 则完全离线：计算与 CSV 导出照常可用，仅云端功能不可用。
const CLOUD_CONFIG = {
  endpoint: "https://blhuevtkcmgeutvzaytl.supabase.co",
  publishableKey: "sb_publishable_HFde29f9Xgn5VKY-1QBFdQ_b_GIBT5V"
};
let cloud = null;
try{
  if(CLOUD_CONFIG && CLOUD_CONFIG.endpoint && window.supabase && typeof window.supabase.createClient === 'function'){
    cloud = window.supabase.createClient(CLOUD_CONFIG.endpoint, CLOUD_CONFIG.publishableKey);
    // 兼容现有代码里的 cloud.database.from(...) 写法（Supabase 原生是 cloud.from）
    cloud.database = { from: (t) => cloud.from(t) };
  }
}catch(e){ cloud = null; }

const DIMS = [
  {key:'habitat',  name:'生境稳定性'},
  {key:'microbe',  name:'微生物稳定性'},
  {key:'nutrient', name:'养分循环功能'},
  {key:'defense',  name:'生态防御与抗逆'}
];

const IND = [
  {dim:'habitat', key:'mwd',   name:'土壤团聚体平均重量直径 MWD (mm)', type:'benefit', p:[0.33,0.55]},
  {dim:'habitat', key:'ph',    name:'土壤 pH',                       type:'range',   p:[6.0,7.0,5.3,8.0]},
  {dim:'habitat', key:'ec',    name:'土壤电导率 EC (mS·cm⁻¹)',        type:'cost',    p:[0.30,0.70]},
  {dim:'microbe', key:'mbc',   name:'微生物量碳 MBC (mg·kg⁻¹)',       type:'benefit', p:[150,290]},
  {dim:'microbe', key:'bf',    name:'细菌/真菌数量比 B/F',            type:'benefit', p:[1.0e3,5.0e3]},
  {dim:'microbe', key:'benef', name:'可培养有益菌数量 (CFU·g⁻¹)',      type:'benefit', p:[1.0e5,1.0e7]},
  {dim:'nutrient',key:'minn',  name:'土壤矿质氮（硝态氮+铵态氮）(mg·kg⁻¹)', type:'cost', p:[97.1,300]},
  {dim:'nutrient',key:'enzyme',name:'关键酶活性（N-乙酰-β-D-氨基葡萄糖苷酶 NAG, nmol·g⁻¹·h⁻¹）', type:'benefit', p:[60.7,135.8]},
  {dim:'nutrient',key:'co2',   name:'CO₂排放降低幅度 (%)',            type:'benefit', p:[0,12]},
  {dim:'defense', key:'foc',   name:'尖孢镰刀菌数量 (CFU·g⁻¹)',        type:'cost',    p:[1.0e3,1.0e5]},
  {dim:'defense', key:'antag', name:'拮抗活性有益菌数量 (CFU·g⁻¹)',     type:'benefit', p:[1.0e4,1.0e6]},
  {dim:'defense', key:'supp',  name:'根际抑病率 (%)',                 type:'benefit', p:[0,96]}
];

const TYPE_LABEL = {benefit:'效益型', cost:'成本型', range:'区间型'};
const PARAM_LABEL = {
  benefit:['劣','优','—','—'],
  cost:['优','劣','—','—'],
  range:['最优下限','最优上限','最小值','最大值']
};

const DEMO = [
  {name:'示例1',   mwd:0.733, ph:6.87, ec:0.345, mbc:277, bf:4020, benef:5.14e6, minn:99.2, enzyme:124.0, co2:9.0, foc:1.47e4, antag:6.62e5, supp:89.9},
  {name:'示例2', mwd:0.452, ph:5.61, ec:0.539, mbc:223, bf:2100, benef:1.77e6, minn:109,  enzyme:90.8, co2:6.6, foc:3.72e4, antag:2.45e5, supp:59.0},
  {name:'示例3',   mwd:0.334, ph:5.02, ec:0.714, mbc:155, bf:1230, benef:5.07e5, minn:114,  enzyme:69.9, co2:2.4, foc:8.13e4, antag:6.00e4, supp:22.8}
];

/* CSV 模板 20 条模拟样本（与「下载 CSV 模板」按钮同源；分档为示例分布，仅数据） */
const TEMPLATE = [
  {name:"样本01",mwd:0.334,ph:5.02,ec:0.714,mbc:155,bf:1230,benef:5.07e+05,minn:114,enzyme:63.6,co2:2.4,foc:81300,antag:60000,supp:22.8},
  {name:"样本02",mwd:0.733,ph:6.866,ec:0.345,mbc:277,bf:4020,benef:5.14e+06,minn:99.2,enzyme:113.9,co2:9,foc:14700,antag:6.62e+05,supp:89.9},
  {name:"样本03",mwd:0.28,ph:4.73,ec:0.653,mbc:188,bf:1830,benef:5.36e+05,minn:116.4,enzyme:66.0,co2:2.9,foc:94900,antag:51800,supp:24.6},
  {name:"样本04",mwd:0.836,ph:6.416,ec:0.388,mbc:281,bf:5180,benef:6.32e+06,minn:99.2,enzyme:117.0,co2:10.4,foc:12000,antag:5.98e+05,supp:81.2},
  {name:"样本05",mwd:0.78,ph:6.797,ec:0.437,mbc:258,bf:3890,benef:5.67e+06,minn:101.9,enzyme:120.1,co2:9.3,foc:6010,antag:7.38e+05,supp:81},
  {name:"样本06",mwd:0.301,ph:5.166,ec:0.666,mbc:192,bf:1430,benef:5.46e+05,minn:2091,enzyme:68.5,co2:0.8,foc:82500,antag:57200,supp:26.8},
  {name:"样本07",mwd:0.462,ph:5.72,ec:0.46,mbc:234,bf:3400,benef:6.04e+06,minn:178,enzyme:106,co2:7.2,foc:40600,antag:6.04e+05,supp:57.6},
  {name:"样本08",mwd:0.733,ph:6.511,ec:0.401,mbc:278,bf:4670,benef:8.39e+06,minn:101,enzyme:123.3,co2:10.8,foc:11100,antag:4.46e+05,supp:91.8},
  {name:"样本09",mwd:0.337,ph:5.383,ec:0.601,mbc:161,bf:1450,benef:6.85e+05,minn:240,enzyme:71.0,co2:1,foc:80300,antag:74400,supp:19.9},
  {name:"样本10",mwd:0.404,ph:5.583,ec:0.569,mbc:217,bf:2740,benef:2.12e+06,minn:111.7,enzyme:84.1,co2:7.6,foc:51000,antag:2.25e+05,supp:41.7},
  {name:"样本11",mwd:0.51,ph:5.87,ec:0.589,mbc:211,bf:2850,benef:1.76e+06,minn:108.3,enzyme:87.0,co2:6.6,foc:61000,antag:2.7e+05,supp:41.6},
  {name:"样本12",mwd:0.517,ph:5.624,ec:0.531,mbc:200,bf:2750,benef:1.98e+06,minn:108.8,enzyme:90.0,co2:5.1,foc:38800,antag:2.28e+05,supp:63},
  {name:"样本13",mwd:0.804,ph:6.804,ec:0.38,mbc:273,bf:4520,benef:8.72e+06,minn:100.3,enzyme:126.4,co2:10.5,foc:5410,antag:4.93e+05,supp:86.1},
  {name:"样本14",mwd:0.42,ph:5.703,ec:0.594,mbc:218,bf:3270,benef:1.99e+06,minn:108.4,enzyme:93.1,co2:5.9,foc:61000,antag:2.66e+05,supp:57.7},
  {name:"样本15",mwd:0.41,ph:5.87,ec:0.588,mbc:222,bf:2060,benef:2.25e+06,minn:109.6,enzyme:96.1,co2:4.6,foc:49600,antag:2.37e+05,supp:43.5},
  {name:"样本16",mwd:0.8,ph:6.206,ec:0.354,mbc:295,bf:3960,benef:3.36e+06,minn:101.1,enzyme:129.5,co2:9.3,foc:10500,antag:5.17e+05,supp:87.2},
  {name:"样本17",mwd:0.409,ph:4.975,ec:0.725,mbc:163,bf:1800,benef:7.47e+05,minn:114.2,enzyme:73.4,co2:1.2,foc:96200,antag:40500,supp:14.2},
  {name:"样本18",mwd:0.426,ph:5.751,ec:0.483,mbc:227,bf:3260,benef:6.21e+05,minn:110.7,enzyme:99.2,co2:5.7,foc:43900,antag:1.15e+05,supp:57.6},
  {name:"样本19",mwd:0.744,ph:6.294,ec:0.334,mbc:279,bf:4720,benef:6.76e+06,minn:103,enzyme:132.7,co2:11.6,foc:15100,antag:7.61e+05,supp:87.5},
  {name:"样本20",mwd:0.393,ph:5.266,ec:0.688,mbc:175,bf:1190,benef:6.89e+05,minn:113.5,enzyme:75.9,co2:3.1,foc:97300,antag:75700,supp:23.8}
];

let rowSeq = 0;
const clamp = v => Math.max(0, Math.min(1, v));
const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function norm(val, type, p){
  if(val === null) return null;
  if(type === 'benefit'){
    const bad = p[0], good = p[1];
    if(good === bad) return val >= good ? 1 : 0;
    return clamp((val - bad) / (good - bad));
  }
  if(type === 'cost'){
    const good = p[0], bad = p[1];
    if(bad === good) return val <= good ? 1 : 0;
    return clamp((bad - val) / (bad - good));
  }
  const lo = p[0], hi = p[1], lof = p[2], hif = p[3];
  if(val >= lo && val <= hi) return 1;
  if(val < lo) return (lo === lof) ? 0 : clamp((val - lof) / (lo - lof));
  return (hif === hi) ? 0 : clamp((hif - val) / (hif - hi));
}

function normalizeWeights(arr){
  const s = arr.reduce((a,b) => a + (isFinite(b) && b > 0 ? b : 0), 0);
  if(s <= 0) return arr.map(() => 1 / arr.length);
  return arr.map(x => (isFinite(x) && x > 0 ? x : 0) / s);
}

/* ---------- 参数表与两层权重 ---------- */
function renderParams(){
  document.getElementById('dimWeights').innerHTML = DIMS.map(d =>
    `<div><label style="font-size:12px;color:var(--sub);display:block;margin-bottom:2px">${d.name} 权重</label>
     <input type="text" id="dw_${d.key}" value="1" oninput="updateWeightPct()">
     <span class="wpct" id="dwp_${d.key}">25.0%</span></div>`).join('');

  document.getElementById('indWeights').innerHTML = DIMS.map(d => {
    const idxs = IND.map((it, i) => it.dim === d.key ? i : -1).filter(i => i >= 0);
    return `<div class="wgroup"><b class="wgt-title">${d.name}</b>` +
      idxs.map(i =>
        `<div class="wrow"><label>${esc(IND[i].name)}</label>
         <input type="text" id="iw_${i}" value="1" oninput="updateWeightPct()">
         <span class="wpct" id="iwp_${i}">—</span></div>`).join('') + '</div>';
  }).join('');

  document.getElementById('paramBody').innerHTML = IND.map((it, i) => {
    const labels = PARAM_LABEL[it.type];
    const dimName = DIMS.find(d => d.key === it.dim).name;
    const cells = [0,1,2,3].map(k => {
      const dis = (it.type !== 'range' && k >= 2);
      const val = it.p[k] !== undefined ? it.p[k] : '';
      return `<td data-label="${esc(labels[k])}"><input type="text" id="pp_${i}_${k}" value="${val}"
              ${dis ? 'disabled style="background:#F3F4F6"' : ''}></td>`;
    }).join('');
    return `<tr>
      <td class="dim" data-label="维度">${dimName}</td>
      <td class="name" data-label="指标">${esc(it.name)}</td>
      <td data-label="类型"><span class="tag t-${it.type}">${TYPE_LABEL[it.type]}</span></td>
      ${cells}
    </tr>`;
  }).join('');
  updateWeightPct();
}

function updateWeightPct(){
  DIMS.forEach((d, k) => {
    const v = num(document.getElementById('dw_' + d.key).value);
    const w = (v === null || v <= 0) ? 1 : v;
    d.__w = w;
  });
  const dn = normalizeWeights(DIMS.map(d => d.__w));
  DIMS.forEach((d, k) => {
    const el = document.getElementById('dwp_' + d.key);
    if(el) el.textContent = (dn[k] * 100).toFixed(1) + '%';
    d.__nw = dn[k];
  });
  DIMS.forEach(d => {
    const idxs = IND.map((it, i) => it.dim === d.key ? i : -1).filter(i => i >= 0);
    const w = idxs.map(i => {
      const el = document.getElementById('iw_' + i);
      const v = el ? num(el.value) : null;
      return (v === null || v <= 0) ? 1 : v;
    });
    const nw = normalizeWeights(w);
    idxs.forEach((i, k) => {
      const el = document.getElementById('iwp_' + i);
      if(el) el.textContent = (nw[k] * 100).toFixed(1) + '%';
    });
  });
}

function readParams(){
  return IND.map((it, i) => {
    const nParam = it.type === 'range' ? 4 : 2;
    const p = [];
    for(let k = 0; k < nParam; k++){
      const v = num(document.getElementById('pp_' + i + '_' + k).value);
      p.push(v === null ? it.p[k] : v);
    }
    while(p.length < 4) p.push(null);
    const el = document.getElementById('iw_' + i);
    const w = el ? num(el.value) : null;
    return {p, w: (w === null || w <= 0) ? 1 : w};
  });
}
function resetParams(){ renderParams(); }

/* ---------- 数据区 ---------- */
function renderData(){
  document.getElementById('dataHead').innerHTML =
    '<th>样本名</th>' + IND.map(it => `<th>${esc(it.name)}</th>`).join('') + '<th>操作</th>';
}

function addRow(data){
  const tr = document.createElement('tr');
  tr.innerHTML =
    `<td data-label="样本名"><input type="text" value="${esc(data && data.name ? data.name : ('样本' + (++rowSeq)))}"></td>` +
    IND.map(it => `<td data-label="${esc(it.name)}"><input type="text" value="${data && data[it.key] !== undefined ? data[it.key] : ''}"></td>`).join('') +
    `<td data-label="操作"><button class="danger small" onclick="this.closest('tr').remove()">删除</button></td>`;
  document.getElementById('dataBody').appendChild(tr);
}

function clearRows(){
  document.getElementById('dataBody').innerHTML = '';
  rowSeq = 0;
  document.getElementById('importMsg').textContent = '';
}

function fillDemo(){
  clearRows();
  DEMO.forEach(d => addRow(d));
  rowSeq = DEMO.length;
  document.getElementById('importMsg').innerHTML = '<span class="ok">已填入 3 条示例数据，点「运行计算」查看效果。</span>';
}

function splitLine(line){
  if(line.includes('\t')) return line.split('\t');
  if(line.includes(','))   return line.split(',');
  if(line.includes(';'))   return line.split(';');
  if(line.includes('，'))  return line.split('，');
  return line.trim().split(/\s+/);
}
function looksHeader(cells){
  return /样本|编号|样点|MWD|pH|EC|MBC|B\/F|DON|有益|无机氮|CO2|CO₂|镰刀|拮抗|抑病/i.test(cells.join(' '));
}
function applyRows(rows, msgEl){
  if(!rows.length) return;
  clearRows();
  rows.forEach(cells => {
    let name = '', vals = cells;
    const first = cells[0];
    const firstIsNum = first !== '' && first !== undefined && !isNaN(parseFloat(first)) && isFinite(first);
    if(!firstIsNum){ name = first; vals = cells.slice(1); }
    const obj = {name: name || ('样本' + (++rowSeq))};
    IND.forEach((it, i) => { obj[it.key] = vals[i] !== undefined ? vals[i] : ''; });
    addRow(obj);
  });
  msgEl.innerHTML = `<span class="ok">已导入 ${rows.length} 行数据，核对无误后点「运行计算」。</span>`;
}
function parsePaste(){
  const txt = document.getElementById('pasteBox').value.trim();
  const msgEl = document.getElementById('importMsg');
  if(!txt){ msgEl.innerHTML = '<span class="err">粘贴框为空。</span>'; return; }
  let rows = txt.split(/\r?\n/).filter(l => l.trim() !== '').map(splitLine).map(a => a.map(s => s.trim()));
  if(rows.length && looksHeader(rows[0])) rows = rows.slice(1);
  applyRows(rows, msgEl);
}
function loadCsv(ev){
  const f = ev.target.files[0];
  if(!f) return;
  const rd = new FileReader();
  rd.onload = e => {
    let rows = e.target.result.split(/\r?\n/).filter(l => l.trim() !== '').map(splitLine).map(a => a.map(s => s.trim()));
    if(rows.length && looksHeader(rows[0])) rows = rows.slice(1);
    applyRows(rows, document.getElementById('importMsg'));
  };
  rd.readAsText(f, 'UTF-8');
  ev.target.value = '';
}

/* ---------- 计算 ---------- */
let lastResult = null;

function readSamples(){
  const out = [];
  document.querySelectorAll('#dataBody tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    const obj = {name: inputs[0].value || ('样本' + (out.length + 1))};
    IND.forEach((it, i) => { obj[it.key] = inputs[i + 1].value; });
    out.push(obj);
  });
  return out;
}

function calculate(){
  const msgEl = document.getElementById('calcMsg');
  const samples = readSamples();
  if(!samples.length){ msgEl.innerHTML = '<span class="err">请先导入或填写至少一行数据。</span>'; return; }

  const params = readParams();
  const dimW = {};
  DIMS.forEach(d => {
    const v = num(document.getElementById('dw_' + d.key).value);
    dimW[d.key] = (v === null || v <= 0) ? 1 : v;
  });
  const dwNorm = normalizeWeights(DIMS.map(d => dimW[d.key]));

  const indWNorm = {};
  DIMS.forEach(d => {
    const idxs = IND.map((it, i) => it.dim === d.key ? i : -1).filter(i => i >= 0);
    const nw = normalizeWeights(idxs.map(i => params[i].w));
    idxs.forEach((i, k) => { indWNorm[i] = nw[k]; });
  });

  const results = [];
  let missingCount = 0;

  samples.forEach(s => {
    const S = {}, miss = [];
    IND.forEach((it, i) => {
      const sv = norm(num(s[it.key]), it.type, params[i].p);
      if(sv === null){ S[it.key] = 0; miss.push(it.name); missingCount++; }
      else S[it.key] = sv;
    });
    const D = {};
    DIMS.forEach(d => {
      let sum = 0;
      IND.forEach((it, i) => { if(it.dim === d.key) sum += indWNorm[i] * S[it.key]; });
      D[d.key] = sum;
    });
    let mehi = 0;
    DIMS.forEach((d, k) => { mehi += dwNorm[k] * D[d.key]; });
    const mdi = 1 - mehi;   // 失衡指数（越小越健康）
    const grade = mdi <= 0.25 ? {t:'健康', c:'g-g'} : (mdi <= 0.50 ? {t:'轻度失衡', c:'g-y'} : (mdi <= 0.75 ? {t:'中度失衡', c:'g-o'} : {t:'重度失衡', c:'g-r'}));
    results.push({name:s.name, S, D, mehi, mdi, grade, miss});
  });

  lastResult = {results, dimWNorm:dwNorm};

  document.getElementById('resHead').innerHTML = '<th>样本名</th>' + DIMS.map((d, k) =>
    `<th>${d.name}<br><span style="font-weight:400;font-size:11px">权重 ${(dwNorm[k] * 100).toFixed(1)}%</span></th>`
  ).join('') + '<th>MDI</th><th>等级</th>';

  document.getElementById('resBody').innerHTML = results.map(r =>
    `<tr>
      <td class="name" data-label="样本名">${esc(r.name)}${r.miss.length ? ' <span style="color:#C62828;font-size:11px">⚠缺' + r.miss.length + '项</span>' : ''}</td>
      ${DIMS.map(d => `<td data-label="${d.name}">${r.D[d.key].toFixed(3)}</td>`).join('')}
      <td class="mehi" data-label="MDI">${r.mdi.toFixed(3)}</td>
      <td data-label="等级"><span class="grade ${r.grade.c}">${r.grade.t}</span></td>
    </tr>`).join('');

  document.getElementById('detailHead').innerHTML = '<th>样本名</th>' + IND.map(it =>
    `<th>${esc(it.name)}<br><span style="font-weight:400;font-size:10.5px">${TYPE_LABEL[it.type]}</span></th>`).join('');
  document.getElementById('detailBody').innerHTML = results.map(r =>
    `<tr><td class="name" data-label="样本名">${esc(r.name)}</td>` +
    IND.map(it => {
      const bad = r.miss.includes(it.name);
      return `<td data-label="${esc(it.name)}" style="${bad ? 'background:#FFEBEE;color:#C62828' : ''}">${bad ? '缺' : r.S[it.key].toFixed(3)}</td>`;
    }).join('') + '</tr>').join('');

  document.getElementById('resTable').style.display = '';
  document.getElementById('detailBox').style.display = '';
  const n0 = results.filter(r => r.mdi <= 0.25).length;
  const n1 = results.filter(r => r.mdi > 0.25 && r.mdi <= 0.50).length;
  const n2 = results.filter(r => r.mdi > 0.50 && r.mdi <= 0.75).length;
  const n3 = results.filter(r => r.mdi > 0.75).length;
  msgEl.innerHTML = `<span class="ok">计算完成：共 ${results.length} 个样本 —— 健康 ${n0}、轻度失衡 ${n1}、中度失衡 ${n2}、重度失衡 ${n3}。</span>` +
    (missingCount ? ` <span class="err">（${missingCount} 处缺值按 0 分计，已标注）</span>` : '');
}

function exportCsv(){
  if(!lastResult){ alert('请先运行计算。'); return; }
  const {results, dimWNorm} = lastResult;
  const q = v => { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; };
  // 表头与界面「评价结果」「指标得分明细」两张表一致：维度名含权重，指标名含隶属类型
  const head = ['样本名']
    .concat(DIMS.map((d,k) => `${d.name}(权重${(dimWNorm[k]*100).toFixed(1)}%)`))
    .concat(['MDI','等级','缺失项数','缺失指标'])
    .concat(IND.map(it => `${it.name}(${TYPE_LABEL[it.type]})`));
  let csv = head.map(q).join(',') + '\n';
  results.forEach(r => {
    const row = [r.name]
      .concat(DIMS.map(d => r.D[d.key].toFixed(4)))
      .concat([r.mdi.toFixed(4), r.grade.t, String(r.miss.length),
               r.miss.length ? r.miss.join('；') : '—'])
      .concat(IND.map(it => r.S[it.key].toFixed(4)));
    csv += row.map(q).join(',') + '\n';
  });
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'MDI评价结果.csv';
  a.click();
}

function downloadTemplate(){
  const head = ['样本名'].concat(IND.map(it => it.name)).join(',');
  const lines = TEMPLATE.map(r => [r.name].concat(IND.map(it => {
    const v = r[it.key];
    return (v >= 1e5 || (Math.abs(v) < 1e-4 && v !== 0)) ? v.toExponential(2) : v;
  })).join(','));
  const csv = '\ufeff' + head + '\n' + lines.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'MDI数据模板-20样本.csv';
  a.click();
}

/* ================= 云服务：登录 / 保存 / 读取 ================= */
const $ = id => document.getElementById(id);
let currentUser = null;
let pendingEmailOtp = null;   // {email}（Supabase OTP，无需 verificationId / isExistingUser）
let resetChallenge = null;    // 已弃用（Supabase 重置走邮件链接），保留仅为兼容 SIGNED_OUT 复位
let cloudBusy = false;

function cloudErr(e){
  const k = (e && e.kind) ? e.kind : '';
  if(k === 'unauthenticated' || k === 'invalid_grant') return '登录状态已失效，请重新登录。';
  if(k === 'network' || k === 'backend-unavailable') return '网络或云服务暂时不可用，请稍后重试。';
  if(k === 'permission' || k === 'not-allowed') return '没有权限执行该操作（记录按账户隔离）。';
  if(k === 'quota') return '云端存储空间已满，请先删除部分记录。';
  return (e && e.message) ? e.message : '操作失败，请稍后重试。';
}
function setCloudMsg(html){ $('cloudStatus').innerHTML = html; }

function renderAuth(user){
  currentUser = user || null;
  $('authBox').style.display = currentUser ? 'none' : '';
  $('userBox').style.display = currentUser ? '' : 'none';
  if(currentUser) $('userEmail').textContent = '已登录：' + (currentUser.email || currentUser.id || '');
  else $('recordList').innerHTML = '';
}

async function bootCloud(){
  if(!cloud){
    setCloudMsg('<span class="err">本 MDI 平台未配置云端（_c.js 里 CLOUD_CONFIG 为默认值）：计算、导出照常可用；如需云端保存，请在 _c.js 填入 Supabase 的 endpoint 与 anon key，并在 Supabase 建好 mdi_records 表。</span>');
    renderAuth(null);
    return;
  }
  if(location.protocol !== 'https:'){
    setCloudMsg('<span class="err">当前非 HTTPS 环境：邮箱登录/云端存取需在 https 下（如 GitHub Pages 提供的域名）才可用。本地直接打开文件时计算功能照常可用。</span>');
  }else{
    setCloudMsg('<span class="ok">云服务已就绪（Supabase）。</span>');
  }
  try{
    const session = await currentSession();
    renderAuth(session && session.user ? session.user : null);
  }catch(e){ renderAuth(null); }
  try{
    cloud.auth.onAuthStateChange((ev, session) => {
      if(authSwitching && ev === 'SIGNED_OUT') return;   // 设密码会撤销会话，重登期间先不踢界面
      const u = session && session.user ? session.user : null;
      renderAuth(u);
      if(ev === 'SIGNED_OUT'){ $('recordList').innerHTML = ''; pendingEmailOtp = null; resetChallenge = null; }
      if(ev === 'PASSWORD_RECOVERY'){ setCloudMsg('<span class="ok">密码已重置并已登录。</span>'); }
    });
  }catch(e){ /* 状态监听不可用时忽略，不影响手动登录 */ }
}

let authSwitching = false;   // 设密码 / 重登窗口期：期间忽略 SIGNED_OUT，避免界面闪退

/* 兼容 Supabase JS v2 的 getSession：v2 返回 { data:{ session } }，v1 返回 data 即会话 */
async function currentSession(){
  if(!cloud) return null;
  const { data, error } = await cloud.auth.getSession();
  if(error || !data) return null;
  return data.session || (data.user ? data : null);
}

async function requireSession(){
  if(!cloud){ setCloudMsg('<span class="err">云服务未初始化，无法进行云端操作。</span>'); return null; }
  const session = await currentSession();
  if(!session){
    setCloudMsg('<span class="err">请先登录，再保存或读取云端记录。</span>');
    renderAuth(null);
    return null;
  }
  return session;
}

/* ① 密码登录 */
async function loginWithPassword(){
  if(!cloud){ setCloudMsg('<span class="err">云服务未初始化。</span>'); return; }
  const email = $('pwdEmail').value.trim();
  const password = $('pwdPwd').value;
  if(!email || !password){ setCloudMsg('<span class="err">请填写邮箱和密码。</span>'); return; }
  setCloudMsg('正在登录…');
  const { data: session, error } = await cloud.auth.signInWithPassword({ email, password });
  if(error){ setCloudMsg('<span class="err">' + esc(cloudErr(error)) + '</span>'); return; }
  $('pwdPwd').value = '';
  renderAuth(session && session.user ? session.user : null);
  setCloudMsg('<span class="ok">登录成功。</span>');
}

/* ② 忘记密码（Supabase：邮件链接重置，不使用验证码） */
async function startReset(){
  if(!cloud){ setCloudMsg('<span class="err">云服务未初始化。</span>'); return; }
  const email = $('pwdEmail').value.trim();
  if(!email){ setCloudMsg('<span class="err">请先在上方填写邮箱。</span>'); return; }
  setCloudMsg('正在发送重置邮件…');
  const started = await cloud.auth.resetPasswordForEmail(email, { redirectTo: location.href });
  if(started.error){ setCloudMsg('<span class="err">' + esc(cloudErr(started.error)) + '</span>'); return; }
  $('resetBox').style.display = '';
  setCloudMsg('<span class="ok">重置邮件已发送。请点击邮件中的链接回到本页面（会自动进入恢复会话），然后在下方「新密码」处填写并提交即可。Supabase 不使用验证码，验证码框可留空。</span>');
}
async function submitReset(){
  if(!cloud){ setCloudMsg('<span class="err">云服务未初始化。</span>'); return; }
  const password = $('resetPwd').value;
  if(!password){ setCloudMsg('<span class="err">请填写新密码。</span>'); return; }
  setCloudMsg('正在提交新密码…');
  // 必须在点击邮件链接后的恢复会话下调用才有效
  const done = await cloud.auth.updateUser({ password });
  if(done.error){ setCloudMsg('<span class="err">' + esc(cloudErr(done.error)) + '</span>'); return; }
  $('resetBox').style.display = 'none';
  $('resetCode').value = ''; $('resetPwd').value = '';
  const session = await currentSession();
  renderAuth(session && session.user ? session.user : null);
  setCloudMsg(session && session.user ? '<span class="ok">密码已重置。</span>' : '<span class="ok">密码已重置，请用新密码在左端登录。</span>');
}

/* ③ 邮箱验证码登录 / 注册（Supabase：signInWithOtp + verifyOtp） */
async function sendEmailCode(){
  if(!cloud){ setCloudMsg('<span class="err">云服务未初始化。</span>'); return; }
  const email = $('otpEmail').value.trim();
  if(!email){ setCloudMsg('<span class="err">请填写邮箱。</span>'); return; }
  setCloudMsg('正在发送验证码…');
  // shouldCreateUser:true → 新邮箱自动注册；emailRedirectTo 仅在启用魔法链接时有用
  const sent = await cloud.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: location.href }
  });
  if(sent.error){ setCloudMsg('<span class="err">' + esc(cloudErr(sent.error)) + '</span>'); return; }
  pendingEmailOtp = { email };
  setCloudMsg('<span class="ok">验证码已发送到邮箱，请填写 6 位验证码（新用户可同时设置密码，留空则仅用验证码登录）。</span>');
}
async function submitEmailOtp(){
  if(!cloud){ setCloudMsg('<span class="err">云服务未初始化。</span>'); return; }
  const email = $('otpEmail').value.trim();
  const token = $('otpCode').value.trim();
  const password = $('otpNewPwd').value;
  const pending = pendingEmailOtp;
  if(!pending || pending.email !== email){
    setCloudMsg('<span class="err">请先为当前邮箱点「获取验证码」。</span>'); return;
  }
  if(!token){ setCloudMsg('<span class="err">请填写收到的验证码。</span>'); return; }
  setCloudMsg('正在验证…');
  const done = await cloud.auth.verifyOtp({ email: pending.email, token, type: 'email' });
  if(done.error){ setCloudMsg('<span class="err">' + esc(cloudErr(done.error)) + '</span>'); return; }
  let note = '';
  if(password){
    authSwitching = true;
    try{
      const upd = await cloud.auth.updateUser({ password });
      if(upd.error){
        note = '（密码设置失败：' + esc(cloudErr(upd.error)) + '，本次不影响使用）';
      }else{
        // 更新密码会使当前会话失效：用刚设置的密码重新登录，重建会话后再进界面
        const re = await cloud.auth.signInWithPassword({ email: pending.email, password });
        if(re.error){ setCloudMsg('<span class="err">密码已设置，但自动重登失败，请改用左端「密码登录」：' + esc(cloudErr(re.error)) + '</span>'); renderAuth(null); return; }
      }
    }finally{ authSwitching = false; }
  }
  pendingEmailOtp = null;
  $('otpCode').value = ''; $('otpNewPwd').value = '';
  const session = await currentSession();
  renderAuth(session && session.user ? session.user : null);
  if(session && session.user) setCloudMsg('<span class="ok">登录成功' + note + '。</span>');
  else setCloudMsg('<span class="err">会话已失效，请重新登录（若已设密码，可用左端密码登录）。</span>');
}

async function doSignOut(){
  if(!cloud) return;
  await cloud.auth.signOut();
  renderAuth(null);
  setCloudMsg('<span class="ok">已退出登录，云端记录已清空显示（数据仍在云端）。</span>');
}

/* ④ 保存 / 读取评价记录 */
function collectPayload(){
  const params = readParams();
  const dimW = {};
  DIMS.forEach(d => {
    const v = num($('dw_' + d.key).value);
    dimW[d.key] = (v === null || v <= 0) ? 1 : v;
  });
  return {
    savedAt: new Date().toISOString(),
    version: 1,
    samples: readSamples(),
    params: IND.map((it, i) => ({key: it.key, type: it.type, p: params[i].p, w: params[i].w})),
    dimWeights: dimW,
    results: lastResult ? lastResult.results : null,
    dimWNorm: lastResult ? lastResult.dimWNorm : null
  };
}

async function saveRecord(){
  if(cloudBusy) return;
  const session = await requireSession();
  if(!session) return;
  const uid = session.user && session.user.id;
  if(!lastResult){ setCloudMsg('<span class="err">请先点「▶ 运行计算」，再保存（保存的是本次计算的数据与结果）。</span>'); return; }
  const samples = readSamples();
  if(!samples.length){ setCloudMsg('<span class="err">没有可保存的样本数据。</span>'); return; }
  const def = 'MDI-' + new Date().toISOString().slice(0,16).replace(/[-:]/g,'').replace('T','-');
  const name = prompt('给这条记录起个名字：', def);
  if(name === null) return;   // 用户取消 → 不上传
  cloudBusy = true;
  setCloudMsg('正在保存到云端…');
  const { data, error } = await cloud.database
    .from('mdi_records')
    .insert({ record_name: (name || def).slice(0,80), data: collectPayload(), user_id: uid })
    .select('id, record_name, created_at');
  cloudBusy = false;
  if(error){ setCloudMsg('<span class="err">保存失败：' + esc(cloudErr(error)) + '</span>'); return; }
  setCloudMsg('<span class="ok">已保存到云端：' + esc(data && data[0] ? data[0].record_name : '') + '</span>');
  loadRecords();
}

async function loadRecords(){
  if(cloudBusy) return;
  const session = await requireSession();
  if(!session) return;
  const uid = session.user && session.user.id;
  cloudBusy = true;
  setCloudMsg('正在读取云端记录…');
  let q = cloud.database
    .from('mdi_records')
    .select('id, record_name, data, created_at')
    .order('created_at', {ascending:false})
    .limit(50);
  if(uid) q = q.eq('user_id', uid);
  const { data, error } = await q;
  cloudBusy = false;
  if(error){
    $('recordList').innerHTML = '<p class="msg"><span class="err">读取失败：' + esc(cloudErr(error)) + '</span></p>';
    setCloudMsg('');
    return;
  }
  if(!data || !data.length){
    $('recordList').innerHTML = '<p class="msg">云端暂无记录。</p>';
    setCloudMsg('');
    return;
  }
  $('recordList').innerHTML = data.map(r => {
    const d = r.data || {};
    const n = (d.samples || []).length;
    const mehi = (d.results && d.results.length)
      ? '　平均 MDI ' + (d.results.reduce((a,b) => a + b.mdi, 0) / d.results.length).toFixed(3)
      : '';
    return `<div class="rec">
      <div class="rec-main">
        <b>${esc(r.record_name || '未命名')}</b>
        <span class="note">${esc(String(r.created_at).slice(0,19).replace('T',' '))}　${n} 个样本${mehi}</span>
      </div>
      <div class="rec-btns">
        <button class="small" onclick="applyRecord(${r.id})">载入</button>
        <button class="danger small" onclick="deleteRecord(${r.id})">删除</button>
      </div>
    </div>`;
  }).join('');
  window.__records = data;
  setCloudMsg('<span class="ok">已读取 ' + data.length + ' 条记录。</span>');
}

function applyRecord(id){
  const rec = (window.__records || []).find(x => x.id === id);
  if(!rec || !rec.data) return;
  const d = rec.data;
  if(d.params && d.params.length === IND.length){
    d.params.forEach((pp, i) => {
      const nParam = pp.type === 'range' ? 4 : 2;
      for(let k = 0; k < nParam; k++){
        const el = $('pp_' + i + '_' + k);
        if(el && pp.p && pp.p[k] !== undefined && pp.p[k] !== null) el.value = pp.p[k];
      }
      const w = $('iw_' + i); if(w && pp.w !== undefined) w.value = pp.w;
    });
  }
  if(d.dimWeights) DIMS.forEach(dd => {
    const el = $('dw_' + dd.key);
    if(el && d.dimWeights[dd.key] !== undefined) el.value = d.dimWeights[dd.key];
  });
  updateWeightPct();
  clearRows();
  (d.samples || []).forEach(s => addRow(s));
  rowSeq = (d.samples || []).length;
  setCloudMsg('<span class="ok">已载入「' + esc(rec.record_name || '') + '」的阈值与数据，点「▶ 运行计算」可复算。</span>');
}

async function deleteRecord(id){
  if(cloudBusy) return;
  const session = await requireSession();
  if(!session) return;
  if(!confirm('确认删除这条云端记录？删除后不可恢复。')) return;
  cloudBusy = true;
  const { error } = await cloud.database.from('mdi_records').delete().eq('id', id);
  cloudBusy = false;
  if(error){ setCloudMsg('<span class="err">删除失败：' + esc(cloudErr(error)) + '</span>'); return; }
  setCloudMsg('<span class="ok">已删除。</span>');
  loadRecords();
}

renderParams();
renderData();
addRow();
bootCloud();
