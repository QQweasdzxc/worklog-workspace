import { WORKLOG_VERSION } from './version.js';

const root = document.getElementById('app');
const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();
const selected = `${y}-${String(m+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

function days(){
  const first = new Date(y,m,1);
  const last = new Date(y,m+1,0);
  const arr = [];
  for(let i=0;i<first.getDay();i++) arr.push(null);
  for(let d=1;d<=last.getDate();d++) arr.push(d);
  return arr;
}

root.innerHTML = `
<div class="wrap">
  <div class="card">
    <div class="top">
      <div>
        <div class="muted">🟢 SB 已接入・Web / Extension 版本一致</div>
        <h1>📅 工作中心</h1>
        <div class="muted">先看今天狀態，再決定要不要整理。</div>
      </div>
      <div class="tag">🪶 ${WORKLOG_VERSION}</div>
    </div>

    <div class="tabs">
      <button class="tab on">📅<br>中心</button>
      <button class="tab">➕<br>紀錄</button>
      <button class="tab">📦<br>同步</button>
      <button class="tab">⚙️<br>設定</button>
    </div>

    <div class="grid">
      <section class="panel">
        <h2>${y}/${String(m+1).padStart(2,'0')}</h2>
        <div class="cal">
          ${['日','一','二','三','四','五','六'].map(w=>`<div class="muted">${w}</div>`).join('')}
          ${days().map(d=> d ? `<div class="day ${d===today.getDate()?'sel':''}"><b>${d}</b><div class="bar"><div class="fill" style="width:${d===today.getDate()?0:100}%"></div></div><small>${d===today.getDate()?'0h':''}</small></div>` : '<div></div>').join('')}
        </div>
      </section>

      <section class="panel">
        <h2>今日工作中心</h2>
        <div class="tag">0 / 8h・尚缺 8h</div>
        <p class="muted">尚無工時紀錄。可由快速紀錄新增，或由同步資料建立 AI 建議。</p>

        <h3>🪶 諸葛先生</h3>
        <div class="status"><span>Evidence 狀態</span><b>尚無足夠依據，不猜測</b></div>

        <h3>同步中心</h3>
        <div class="status"><span>Supabase</span><b>🟢 已連線</b></div>
        <div class="status"><span>Google Drive</span><b>🟡 待正式串接</b></div>
        <div class="status"><span>GPT / AI</span><b>🟡 Evidence 模式</b></div>

        <button class="btn">＋新增工作</button>
      </section>
    </div>
  </div>
</div>
`;
