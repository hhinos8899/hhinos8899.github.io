/* =========================
   工具：解析 “BBPPBB→P，...” 成 Map
   - 支持：中文逗号/英文逗号/句号/换行
   - 支持：→ / -> / =>
   - p 统一当 P
   - 重复 key：按最后一次为准（Map 默认）
========================= */
function buildRuleMapFromText(raw) {
  const m = new Map();
  if (!raw) return m;

  const normalized = raw
    .replace(/\r/g, "\n")
    .replace(/，/g, ",")
    .replace(/。/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized.split(",").map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    const p = part.replace(/\s/g, "");
    const seg = p.split(/→|->|=>/);
    if (seg.length !== 2) continue;
    const key = seg[0].trim();
    let val = seg[1].trim();
    if (val === "p") val = "P";
    if (!key || (val !== "B" && val !== "P")) continue;
    m.set(key, val);
  }
  return m;
}

function suffix(arr, n){
  if(arr.length < n) return null;
  return arr.slice(arr.length - n).join('');
}

/* =========================
   百分比循环（你用的那套）
========================= */
const PCT_LOOP = [92, 95, 97, 97, 95, 92];
let pctIdx = 0;
function nextFixedPercent(){
  const v = PCT_LOOP[pctIdx];
  pctIdx = (pctIdx + 1) % PCT_LOOP.length;
  return v;
}
function fmtPct(v){ return `+${Number(v).toFixed(2)}%`; }

/* =========================
   A：你最早发的 LOCAL_RULES（递增窗口 4→5→6，最短3位）
========================= */
const RULES_A = new Map([
  ["BBPP","P"],
  ["BBPB","P"],
  ["BPPPBB","P"],
  ["BPPPBP","B"],
  ["BPPPP","B"],
  ["BBBB","B"],
  ["BBBPB","P"],
  ["BBBPPP","P"],
  ["BPPBB","B"],
  ["BPPBP","B"],
  ["BBBPPB","P"],
  ["BPBP","B"],
  ["BPBB","B"],
  ["BPB","P"],
  ["PPBB","B"],
  ["PPBPB","B"],
  ["PPBPP","P"],
  ["PBBBP","P"],
  ["PBBBB","P"],
  ["PPPBB","P"],
  ["PPPP","P"],
  ["PBPB","P"],
  ["PPPBP","B"],
  ["PBBP","P"],
  ["PBPP","P"],
]);

let aWindowN = 4; // 4→5→6
function predictA(gameHistory){
  if(gameHistory.length < 4){
    aWindowN = 4;
    return null;
  }
  const maxLen = Math.min(aWindowN, gameHistory.length);
  for(let len = maxLen; len >= 3; len--){
    const s = suffix(gameHistory, len);
    if(s && RULES_A.has(s)) {
      aWindowN = 4; // 命中回到4
      return RULES_A.get(s);
    }
  }
  if(aWindowN < 6) aWindowN += 1;
  return null;
}

/* =========================
   B：固定窗口=4
   你说“B固定4”，但没再给一套新的“B专用Map”，
   所以这里严格按你已给的规则：只取 RULES_A 里 key长度=4 的那部分作为 B 的规则库。
   （不会碰A的递增逻辑；B只看4位）
========================= */
const RULES_B = new Map([...RULES_A.entries()].filter(([k]) => k.length === 4));
function predictB(gameHistory){
  if(gameHistory.length < 4) return null;
  const s = suffix(gameHistory, 4);
  return RULES_B.get(s) || null;
}

/* =========================
   C：你之前“重新发三段”里的 第一段（规则C，按6）
========================= */
const RULES_C_TEXT = `
BBPPBB→P，BBPPBP→P，BBPPPB→P，BBBPPP→P，BBBBPP→P，BBBBBP→B，BBPPPP→P，
BPBPBP→B，BPBPBB→B，BPBPPB→P，BPBPPP→P，BBBPPB→P，BBBPBB→B，BBBPBP→B，
BBPPBP→P，BPPBBP→B，BPPBBB→B，BPPPBB→P，BPPPPP→P，BBBBPB→B，BBPBPB→P，
BBPPPB→P，BBBPPB→P，BPPBPP→P，BPBBPB→B，BBPBBP→B，BPPPBB→P，BBPPPB→P，
BPPPBP→P，BPPPPB→P，BPPBPB→P，BPBBBP→B，BBPBPP→B

PPBBPP→P，PPBBPB→B，PPBBBP→B，PPPBBB→B，PPPPBB→P，PPPPPB→P，PPBBBB→B，
PBBBBB→B，PBPBPB→B，PBPBBP→B，PBPBBB→B，PPPBBP→P，PPPBPP→P，PPPBPB→P，
PPBBPB→B，PBBPPB→B，PBBPPP→P，PBBBPP→B，PBBBPB→B，PBBBBP→B，PPPPBP→P，
PPBPBP→P，PPBBBP→B，PPPBBP→P，PBBPBB→B，PBPPBP→P，PPBPPB→P，PBBPBP→B，
PBBBPP→B，PPBBBP→B，PBPBPP→P，PPBPPP→P，PBPPPB→P，PPBPBB→B，
BPBBBP→B，BBPBPP→B，BBPBPP→P
`;
const RULES_C = buildRuleMapFromText(RULES_C_TEXT);
function predictC(gameHistory){
  if(gameHistory.length < 6) return null;
  const s = suffix(gameHistory, 6);
  return RULES_C.get(s) || null;
}

/* =========================
   D：你“重新发三段”里的 第二段+第三段（规则D，按6）
========================= */
const RULES_D_TEXT = `
BBPPBB→B，BBPPBP→B，BBPPPB→B，BBBPPP→P，BBBBPP→B，BBBBBP→B，BBPPPP→B，
BPBPBP→P，BPBPPB→B，BBBPPB→P，BBBPBB→P，BBBPBP→P，BPPBBP→B，BPPBBB→B，
BPPPBB→P，BPPPBP→B，BPPPPB→P，BBBBPB→P，BBPBPB→B，BBPPPB→B，BBBPPB→P，
BPPBPP→P，BPBBPB→P，BBPBBP→P，BPPBPB→B。BPPPBB→P，BBPPPB→B，
BPBPBB→B，BBPBBB→P，BPBBBP→P，BBPBPP→P，BPBBPP→P

PPBBPP→P，PPBBPB→P，PPBBBP→P，PPPBBB→B，PPPPBB→P，PPPPPB→P，PPBBBB→P，
PBPBPB→B，PBPBBP→B，PPPBBP→B，PPPBPP→B，PPPBPB→B，PBBPPB→P，PBBPPP→P，
PBBBPP→B，PBBBPB→P，PPPPBP→P，PPBPBP→P，PPBBBP→B，PPPBBP→B，PBBPBB→B，
PBPPBP→B，PPBPPB→B，PBBPBP→P，PBBBPP→B，PPBBBP→P，PBPBPP→P，PPBPPP→P，
PBPPPB→B，PPBPBB→B，PBPPBB→B，PBBBBP→P
`;
const RULES_D = buildRuleMapFromText(RULES_D_TEXT);
function predictD(gameHistory){
  if(gameHistory.length < 6) return null;
  const s = suffix(gameHistory, 6);
  return RULES_D.get(s) || null;
}

/* =========================
   E：你最后确认的“正宗第5套规则”（按6）
========================= */
const RULES_E_B = buildRuleMapFromText(`
BBPPBB→B，BBPPBP→P。BBPPPB→B，BBBPPP→B。BBBBPP→P，BBBBBP→P。BBPPPP→B，BPBPBP→p。
BPBPPB→B，BBBPPB→P。BBBPBB→P，BBBPBP→B。BPPBBP→B，BPPBBB→P。BPPPBB→B，BPPPBP→P。
BPPPPB→B，BBBBPB→B。BBPBPB→P，BBPPPB→P。BBBPPB→P，BPPBPP→P。BPBBPB→B，BBPBBP→P，
BPPBPB→B，BBPPPB→B。BPBPBB→B。BBPBBB→P。BPBBBP→P，BBPBPP→B，BPBBPP→P，BPBPPP→B。BPPPPP→P。
`);
const RULES_E_P = buildRuleMapFromText(`
PPBBPP→P，PPBBPB→B，PPBBBP→P，PPPBBB→P，PPPPBB→B，PPPPPB→B，PPBBBB→P，
PBPBPB→B，PBPBBP→P，PPPBBP→B，PPPBPP→B，PPPBPB→P，PBBPPB→P，PBBPPP→B，PBBBPP→P，
PBBBPB→B，PPPPBP→P，PPBPBP→B，PPBBBP→P，PPPBBP→B，PBBPBB→B，PBPPBP→P，PPBPPB→P，
PBBPBP→P，PBBBPP→P，PPBBBP→P，PBPBPP→P，PPBPPP→B，PBPPPB→B，PPBPBB→P，PBPPBB→B，PBBBBP→P
`);
function predictE(gameHistory){
  if(gameHistory.length < 6) return null;
  const s = suffix(gameHistory, 6);
  if(s[0] === 'B') return RULES_E_B.get(s) || null;
  if(s[0] === 'P') return RULES_E_P.get(s) || null;
  return null;
}

/* =========================
   引擎：实时胜率 + 当前算法连错3切换
========================= */
function makeAlgo(name, predictor){
  return { name, predictor, total:0, hit:0, loseStreak:0 };
}

const ALGOS = [
  makeAlgo("A", predictA),
  makeAlgo("B", predictB),
  makeAlgo("C", predictC),
  makeAlgo("D", predictD),
  makeAlgo("E", predictE),
];

function algoByName(name){ return ALGOS.find(a => a.name === name); }
function rateOf(a){ return a.total === 0 ? 0 : a.hit / a.total; }

/* =========================
   UI 状态
========================= */
let gameHistory = [];
let waiting = false;
let timer = null;
let trendChart = null;

// 上一手“预测快照”（用于本手结算）
let pending = {
  byAlgo: new Map(),      // algoName -> pred
  activeAlgoName: null,  // 对外显示用哪个算法
  activePred: null,      // 对外显示预测
};

function byId(id){ return document.getElementById(id); }
function $(sel){ return document.querySelector(sel); }

function setButtonsDisabled(disabled){
  const p = $('.player-btn');
  const b = $('.banker-btn');
  const back = $('.back-btn');
  const reset = $('.reset-btn');
  const inst = $('.instruction-btn');
  if(p) p.disabled = disabled;
  if(b) b.disabled = disabled;
  if(back) back.disabled = disabled;
  if(reset) reset.disabled = disabled;
  if(inst) inst.disabled = disabled;
}

function renderHistory(){
  const el = byId('recordDisplay');
  if(!el) return;
  el.innerHTML = '';
  gameHistory.forEach(t => {
    const d = document.createElement('div');
    d.className = `record-item ${t.toLowerCase()}`;
    d.textContent = t;
    el.appendChild(d);
  });
}

/* 趋势图（累计B/P） */
function updateTrendChart(){
  const canvas = byId('trendChart');
  if(!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  if(trendChart) trendChart.destroy();

  let b = 0, p = 0;
  const banker = [];
  const player = [];
  gameHistory.forEach(x => {
    if(x === 'B') b++;
    if(x === 'P') p++;
    banker.push(b);
    player.push(p);
  });

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: banker.map((_, i) => `Hand ${i+1}`),
      datasets: [
        { label:'Banker Wins', data: banker, borderColor:'#ff6b6b', fill:false, tension:0.25 },
        { label:'Player Wins', data: player, borderColor:'#4ecdc4', fill:false, tension:0.25 },
      ]
    },
    options: {
      responsive:true,
      plugins:{ legend:{ labels:{ color:'#e6edf3' } } },
      scales:{
        y:{ beginAtZero:true, grid:{ color:'rgba(255,255,255,.1)' }, ticks:{ color:'#9aa4ad' } },
        x:{ grid:{ color:'rgba(255,255,255,.1)' }, ticks:{ color:'#9aa4ad' } },
      }
    }
  });
}

function showPending(){
  const label = byId('resultLabel');
  const pctEl = byId('resultPct');
  const text = byId('predictionText');
  if(label){
    label.textContent = 'AI建议';
    label.classList.remove('player','banker');
  }
  if(pctEl) pctEl.textContent = '...%';
  if(text) text.textContent = '人工智能正在预测，请稍后...';
}

function showResult(side, pct){
  const label = byId('resultLabel');
  const pctEl = byId('resultPct');
  const text = byId('predictionText');
  if(label){
    label.textContent = side;
    label.classList.remove('player','banker');
    label.classList.add(side === 'B' ? 'banker' : 'player');
  }
  if(pctEl) pctEl.textContent = fmtPct(pct);
  if(text) text.textContent = side;
}

function showIdle(msg){
  const label = byId('resultLabel');
  const pctEl = byId('resultPct');
  const text = byId('predictionText');
  if(label){
    label.textContent = 'AI';
    label.classList.remove('player','banker');
  }
  if(pctEl) pctEl.textContent = '';
  if(text) text.textContent = msg || '请稍候...';
}

function updateAlgoBar(){
  const bar = byId('algoBar');
  if(!bar) return;
  const name = pending.activeAlgoName || "-";
  const a = name !== "-" ? algoByName(name) : null;
  const r = a ? (rateOf(a) * 100).toFixed(2) + "%" : "-";
  const ls = a ? a.loseStreak : 0;
  bar.textContent = `当前算法：${name}｜胜率：${r}｜连错：${ls}`;
}

/* 下一手：计算每个算法是否能出预测 */
function computeAllPredictions(){
  const map = new Map();
  for(const a of ALGOS){
    const pred = a.predictor(gameHistory);
    if(pred === 'B' || pred === 'P') map.set(a.name, pred);
  }
  return map;
}

/* 本手录入结果时：用上一手 pending 进行结算 */
function scoreWithActual(actual){
  if(!pending || pending.byAlgo.size === 0) return;

  // 所有算法：只要它上一手出过预测，就记入胜率
  for(const [name, pred] of pending.byAlgo.entries()){
    const algo = algoByName(name);
    if(!algo) continue;
    algo.total += 1;
    if(pred === actual) algo.hit += 1;
  }

  // 当前对外算法：单独维护连错
  if(pending.activeAlgoName && pending.activePred){
    const active = algoByName(pending.activeAlgoName);
    if(active){
      if(pending.activePred === actual) active.loseStreak = 0;
      else active.loseStreak += 1;
    }
  }
}

/* 选择对外算法：胜率最高；若当前算法连错>=3，则强制换到“其它算法里胜率最高” */
function pickActive(predMap){
  if(predMap.size === 0) return null;

  const currentName = pending.activeAlgoName;
  const currentAlgo = currentName ? algoByName(currentName) : null;
  const mustSwitch = currentAlgo ? (currentAlgo.loseStreak >= 3) : false;

  const candidates = ALGOS
    .filter(a => predMap.has(a.name))
    .filter(a => !mustSwitch || a.name !== currentName)
    .sort((x,y) => rateOf(y) - rateOf(x));

  if(candidates.length > 0) return candidates[0].name;

  // 如果强制切换导致没候选（极少），退回所有可预测的最高胜率
  const fallback = ALGOS
    .filter(a => predMap.has(a.name))
    .sort((x,y) => rateOf(y) - rateOf(x));
  return fallback.length ? fallback[0].name : null;
}

function updatePrediction(){
  if(timer){ clearTimeout(timer); timer = null; }

  const predMap = computeAllPredictions();
  const activeName = pickActive(predMap);
  const activePred = activeName ? predMap.get(activeName) : null;

  pending = {
    byAlgo: predMap,
    activeAlgoName: activeName,
    activePred: activePred,
  };

  updateAlgoBar();

  if(!activePred){
    showIdle('请稍候...');
    return;
  }

  waiting = true;
  setButtonsDisabled(true);
  showPending();

  const pct = nextFixedPercent();
  timer = setTimeout(() => {
    showResult(activePred, pct);
    waiting = false;
    setButtonsDisabled(false);
    timer = null;
    updateAlgoBar();
  }, 2000);
}

/* 说明弹窗：显示每个算法实时胜率 */
window.toggleInstructions = function(){
  const modal = byId('instModal');
  const text = byId('instText');
  if(!modal || !text) return;

  const lines = [];
  lines.push("算法规则：");
  lines.push("A：4→5→6递增窗口，最长后缀优先，命中回到4（最短3位）");
  lines.push("B：固定只看最后4位");
  lines.push("C：固定只看最后6位（你的规则C）");
  lines.push("D：固定只看最后6位（你的规则D）");
  lines.push("E：固定只看最后6位（你确认的第5套正宗规则）");
  lines.push("");
  lines.push("调度：实时胜率最高出预测；当前算法连错3把 → 自动切换到其它算法里胜率最高者");
  lines.push("");
  lines.push("实时胜率（命中/出手）：");

  const sorted = [...ALGOS].sort((x,y) => rateOf(y) - rateOf(x));
  for(const a of sorted){
    const r = (rateOf(a) * 100).toFixed(2) + "%";
    lines.push(`- ${a.name}: ${a.hit}/${a.total} = ${r}（连错：${a.loseStreak}）`);
  }

  text.textContent = lines.join("\n");
  modal.classList.remove('hidden');
};

window.closeInstructions = function(){
  const modal = byId('instModal');
  if(modal) modal.classList.add('hidden');
};

/* ============ 按钮 ============ */
window.recordResult = function(type){
  if(waiting) return;
  if(type !== 'B' && type !== 'P') return;

  scoreWithActual(type);
  gameHistory.push(type);

  renderHistory();
  updateTrendChart();
  updatePrediction();
};

window.undoLastMove = function(){
  if(waiting) return;
  gameHistory.pop();
  rebuildAllFromScratch();
};

window.resetGame = function(){
  if(waiting) return;

  gameHistory = [];
  pctIdx = 0;
  aWindowN = 4;
  if(timer){ clearTimeout(timer); timer = null; }

  for(const a of ALGOS){
    a.total = 0;
    a.hit = 0;
    a.loseStreak = 0;
  }

  pending = { byAlgo:new Map(), activeAlgoName:null, activePred:null };

  setButtonsDisabled(false);
  renderHistory();
  updateTrendChart();
  showIdle('请稍候...');
  updateAlgoBar();
  updatePrediction();
};

/* 撤销：从头重算（简单稳定，不会算错） */
function rebuildAllFromScratch(){
  if(timer){ clearTimeout(timer); timer = null; }
  waiting = false;
  setButtonsDisabled(false);

  const saved = [...gameHistory];

  // 清空所有
  gameHistory = [];
  pctIdx = 0;
  aWindowN = 4;
  for(const a of ALGOS){
    a.total = 0;
    a.hit = 0;
    a.loseStreak = 0;
  }
  pending = { byAlgo:new Map(), activeAlgoName:null, activePred:null };

  // 先生成第一手预测（通常无）
  updatePrediction();

  // 重放
  for(const outcome of saved){
    scoreWithActual(outcome);
    gameHistory.push(outcome);

    // 直接更新 pending（不走2秒动画）
    const predMap = computeAllPredictions();
    const activeName = pickActive(predMap);
    const activePred = activeName ? predMap.get(activeName) : null;
    pending = { byAlgo: predMap, activeAlgoName: activeName, activePred };
  }

  renderHistory();
  updateTrendChart();
  updatePrediction();
}

/* 初始化 */
document.addEventListener('DOMContentLoaded', function(){
  renderHistory();
  updateTrendChart();
  showIdle('请稍候...');
  updateAlgoBar();
  updatePrediction();
});
