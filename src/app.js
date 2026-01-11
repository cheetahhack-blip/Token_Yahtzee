// src/app.js
import {
  CAT_LABEL, CAT_ORDER, CAT_DESC,
  scoreCategory, upperSum, upperBonus, totalScore
} from "./scoring.js";

import {
  newScorecard, newTurnState,
  rollDice, toggleHold,
  availableCats, commitCategory, isComplete
} from "./game.js";

import { cpuPlayTurn } from "./cpu.js";

import {
  recordResult, setWinFlag, isSecretUnlocked,
  storageClearMode
} from "./storage.js";

import {
  evaluateAndUnlock, getAchievementList, ACH
} from "./achievements.js";

import { line } from "./dialogues.js";

const $ = (id) => document.getElementById(id);

// ----------------------
// Screen control
// ----------------------
const topbar = $("topbar");
const SCREENS = ["screenTitle", "screenMode", "screenBattle", "screenRules", "screenAch", "screenResult"];

const MODE_LABEL = {
  easy:   "易（水心子正秀）",
  normal: "普（監査官）",
  hard:   "難（後家兼光）",
  expert: "超難（山姥切長義）",
  secret: "乱（山姥切長義 極）",
};
const modeLabel = (m) => MODE_LABEL[m] ?? m;

const CPU_NAME = {
  easy:   "水心子正秀",
  normal: "監査官",
  hard:   "後家兼光",
  expert: "山姥切長義",
  secret: "山姥切長義 極",
};
const cpuName = (m) => CPU_NAME[m] ?? "相手";

// 役の強さ優先度（同点時の並び用：大きいほど上）
const CAT_PRIORITY = {
  YAHTZEE: 120,
  FOUR_KIND: 110,
  LARGE_STRAIGHT: 100,
  SMALL_STRAIGHT: 90,
  FULL_HOUSE: 80,
  CHOICE: 70,
  A: 6,
  TWO: 5,
  THREE: 4,
  FOUR: 3,
  FIVE: 2,
  SIX: 1,
};

const SECRET_TOAST_KEY = "ty_secret_unlocked_toast_shown";

function hasShownSecretToast(){
  return localStorage.getItem(SECRET_TOAST_KEY) === "1";
}
function markShownSecretToast(){
  localStorage.setItem(SECRET_TOAST_KEY, "1");
}

function show(screenId){
  const screens = document.querySelectorAll(".screen");
  screens.forEach(s => {
    const isOn = (s.id === screenId);
    s.classList.toggle("active", isOn);

    // CSS依存をやめて、inlineで強制的に1枚だけ表示
    s.style.display = isOn ? "" : "none";
  });

  // 画面ごとのヘッダー表示制御（あなたの仕様どおり）
  const tb = document.querySelector(".topbar");
  if (tb){
    const hideTop = (screenId === "screenTitle" || screenId === "screenMode");
    tb.classList.toggle("hidden", hideTop);
  }
  // ヘッダーの中身（役説明/実績/降参など）も画面遷移ごとに更新
  renderTopbar(screenId);
}


function navBtn(text, onClick) {
  const b = document.createElement("button");
  b.className = "topLink";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function renderTopbar(screenId) {
  const nav = $("topNav");
  nav.innerHTML = "";

  // タイトル・モードはヘッダー非表示
  if (screenId === "screenTitle" || screenId === "screenMode") {
    topbar.classList.add("hidden");
    return;
  }
  topbar.classList.remove("hidden");

  if (screenId === "screenBattle") {
    nav.appendChild(navBtn("役説明", () => openRules("screenBattle")));
    nav.appendChild(navBtn("実績", () => openAch("screenBattle")));
    nav.appendChild(navBtn("降参", resignToTitle));
  } else if (screenId === "screenResult") {
    nav.appendChild(navBtn("タイトルへ", () => show("screenTitle")));
  }
}

// ----------------------
// Dice image
// ----------------------
function diceFaceHtml(n) {
  const safe = Math.min(6, Math.max(1, n | 0));
  return `<img class="dieImg" src="./assets/dice/${safe}.png" alt="${safe}" />`;
}

function diceExampleHtml(arr){
  return `<div class="diceExample">` + arr.map(v =>
    `<span class="die ex">${diceFaceHtml(v)}</span>`
  ).join("") + `</div>`;
}

const RULE_EXAMPLE = {
  A: [1,1,3,5,6],
  TWO: [2,2,4,5,6],
  THREE: [3,3,3,1,6],
  FOUR: [4,4,2,1,6],
  FIVE: [5,5,5,2,1],
  SIX: [6,6,6,2,1],
  CHOICE: [6,5,4,3,1],
  FOUR_KIND: [2,2,2,2,5],
  FULL_HOUSE: [3,3,3,5,5],
  SMALL_STRAIGHT: [1,2,3,4,6],
  LARGE_STRAIGHT: [2,3,4,5,6],
  YAHTZEE: [6,6,6,6,6],
};

// ----------------------
// Match state
// ----------------------
let mode = "normal";
let round = 1;

let pScore = newScorecard();
let cScore = newScorecard();
let turn = newTurnState();

// "player" | "cpu"
let phase = "player";
let lastCpu = null;

let lastPlayer = null; // { catName, pts }

// 役説明/実績から戻る先
let returnFromInfo = "screenBattle";

// ----------------------
// Mode select (secret unlock)
// ----------------------
function updateModeCards() {
  const secret = document.getElementById("secretModeCard");
  if (!secret) return;
  secret.style.display = isSecretUnlocked() ? "" : "none";
}

// ----------------------
// Basic helpers
// ----------------------
const cpuTitle = (m) => {
  const n = cpuName(m);
  return n.endsWith(" 極") ? n.replace(" 極", "（極）") : n;
};

let modalResolver = null;

function closeModal(result){
  const ov = $("modalOverlay");
  ov.classList.add("hidden");
  ov.setAttribute("aria-hidden","true");
  $("modalActions").innerHTML = "";
  if (modalResolver) modalResolver(result);
  modalResolver = null;
}

function openModal({ title, message, actions }){
  const ov = $("modalOverlay");
  $("modalTitle").textContent = title ?? "";
  $("modalBody").textContent = message ?? "";

  const area = $("modalActions");
  area.innerHTML = "";
  actions.forEach(a=>{
    const b = document.createElement("button");
    b.className = `btn ${a.primary ? "primary" : ""}`.trim();
    b.textContent = a.label;
    b.addEventListener("click", ()=> closeModal(a.value));
    area.appendChild(b);
  });

  ov.classList.remove("hidden");
  ov.setAttribute("aria-hidden","false");

  area.querySelector("button")?.focus();
  return new Promise(resolve => { modalResolver = resolve; });
}

document.addEventListener("keydown", (e)=>{
  if (e.key !== "Escape") return;
  const ov = $("modalOverlay");
  if (!ov || ov.classList.contains("hidden")) return;
  closeModal(false);
});

async function modalConfirm({ title, message, okText="はい", cancelText="いいえ" }){
  const v = await openModal({
    title, message,
    actions: [
      { label: cancelText, value:false, primary:false },
      { label: okText, value:true, primary:true },
    ]
  });
  return !!v;
}

function resetMatch() {
  round = 1;
  pScore = newScorecard();
  cScore = newScorecard();
  turn = newTurnState();
  phase = "player";
  lastCpu = null;
}

async function resignToTitle() {
  // 仕様：降参は記録しない（勝敗も実績も）
  const ok = await modalConfirm({
    title: cpuTitle(mode),
    message: `${line(mode, "resign")}\n\n降参しますか？`
  });
  if (!ok) return;

  resetMatch();
  show("screenTitle");
}

function renderRound() {
  $("roundBig").textContent = `ラウンド ${round} / 12`;
}

function renderScorecard() {
  const sc = $("scorecard");
  sc.innerHTML = "";

  const pUpper = upperSum(pScore), pBonus = upperBonus(pScore), pTotal = totalScore(pScore);
  const cUpper = upperSum(cScore), cBonus = upperBonus(cScore), cTotal = totalScore(cScore);

  // 仕様：合計点をスコアカードの一番上にも表示
  const top = document.createElement("div");
  top.className = "row totalTop";
  top.innerHTML = `
    <div class="k">合計（現在）</div>
    <div class="v">
      <span class="t ${pBonus > 0 ? "bonus" : ""}">自 ${pTotal}</span>
      ｜
      <span class="t ${cBonus > 0 ? "bonus" : ""}">${cpuName(mode)} ${cTotal}</span>
    </div>
  `;
  sc.appendChild(top);

  for (const cat of CAT_ORDER) {
    const pv = pScore[cat];
    const cv = cScore[cat];
    const r = document.createElement("div");
    r.className = "row";
    r.innerHTML = `
      <div class="k">${CAT_LABEL[cat]}</div>
      <div class="v">自 ${pv === null ? "—" : pv} / ${cpuName(mode)} ${cv === null ? "—" : cv}</div>
    `;
    sc.appendChild(r);
  }

  const hr = document.createElement("div");
  hr.className = "row";
  hr.innerHTML = `<div class="k">上段合計 / ボーナス</div><div class="v">自 ${pUpper}/${pBonus}｜${cpuName(mode)} ${cUpper}/${cBonus}</div>`;
  sc.appendChild(hr);

  // ボーナスが付いた側だけ色を強調（合計の文字色が変わる）
  const tr = document.createElement("div");
  tr.className = "row";
  tr.innerHTML = `
    <div class="k">合計</div>
    <div class="v">
      <span class="t ${pBonus > 0 ? "bonus" : ""}">自 ${pTotal}</span>
      ｜
      <span class="t ${cBonus > 0 ? "bonus" : ""}">${cpuName(mode)} ${cTotal}</span>
    </div>
  `;
  sc.appendChild(tr);
}

function renderCats() {
  const catsEl = $("cats");
  catsEl.innerHTML = "";

  const av = availableCats(pScore);

  // 各役について「今の点数」を計算
  const items = av.map(cat => {
    const pts = turn.hasRolled ? scoreCategory(turn.dice, cat) : 0;
    return { cat, pts };
  });

  // 並び替え：
  // 1. 点数 降順
  // 2. 優先度 降順
  items.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const pa = CAT_PRIORITY[a.cat] ?? 0;
    const pb = CAT_PRIORITY[b.cat] ?? 0;
    return pb - pa;
  });

  const bestCat = items.length ? items[0].cat : null;

  // 描画
  for (const { cat, pts } of items) {
    const item = document.createElement("div");
    item.className = "cat";
    if (pts === 0 && turn.hasRolled) item.classList.add("weak"); // 見た目用（任意）

    const star = (turn.hasRolled && cat === bestCat) ? "★ " : "";
    item.innerHTML = `
    <div class="name">${star}${CAT_LABEL[cat]}</div>
    <div class="score">${pts} 点</div>
    `;
    if (turn.hasRolled && cat === bestCat) item.classList.add("best");

    item.addEventListener("click", async () => {
      if (phase !== "player") return;
      if (!turn.hasRolled) return;

      const ok = await confirmPopup(
          "役を確定",
          `「${CAT_LABEL[cat]}」に <b>${pts}点</b> を記入する。`
      );
      if (!ok) return;

      pScore = commitCategory(pScore, turn.dice, cat);
      lastPlayer = { catName: CAT_LABEL[cat], pts };
      doCpuTurn();
    });


    catsEl.appendChild(item);
  }
}

function renderTurnArea() {
  const area = $("turnArea");
  area.innerHTML = "";

  const box = document.createElement("div");
  box.className = "turnBox";

  const playerControls = $("playerControls");
  const cpuControls = $("cpuControls");
  const hint = $("hint");

  if (phase === "player") {
    box.innerHTML = `<div class="turnTitle">あなたのターン（残りロール ${turn.rollsLeft}）</div>`;

    const diceRow = document.createElement("div");
    diceRow.className = "diceRow";

    turn.dice.forEach((v, i) => {
      const d = document.createElement("div");
      d.className = "die" + (turn.held[i] ? " held" : "");
      d.innerHTML = `<div>${diceFaceHtml(v)}</div>`;
      d.addEventListener("click", () => {
        turn = toggleHold(turn, i);
        renderBattle();
      });
      diceRow.appendChild(d);
    });

    box.appendChild(diceRow);

    playerControls.style.display = "";
    cpuControls.style.display = "none";

    const rollBtn = $("rollBtn");
    rollBtn.disabled = turn.rollsLeft <= 0;
    rollBtn.textContent = `ロール（残り${turn.rollsLeft}）`;

    hint.textContent = turn.hasRolled
      ? line(mode, "hint", { key: "afterRoll" })
      : line(mode, "hint", { key: "beforeRoll" });
  } else {
    box.innerHTML = `<div class="turnTitle">${cpuName(mode)} のターン</div>`;

    const diceRow = document.createElement("div");
    diceRow.className = "diceRow";

    for (const v of lastCpu.dice) {
      const d = document.createElement("div");
      d.className = "die";
      d.innerHTML = `<div>${diceFaceHtml(v)}</div>`;
      diceRow.appendChild(d);
    }
    box.appendChild(diceRow);

    const catName = CAT_LABEL[lastCpu.chosenCat];
    const pts = lastCpu.points;

    // イベント判定（最小セット）
    let key = null;
    if (catName.includes("ヨット") || catName.toLowerCase().includes("yahtzee")) key = "yahtzee";
    if (catName.includes("ストレート")) key = "straight";
    if (pts === 0) key = "zero";
    if (pts >= 30 && !key) key = "big";

    const msg = document.createElement("div");
    const msg1 = document.createElement("div");
    msg1.className = "turnLine";
    // 直前のあなたの確定役へのリアクション
    if (lastPlayer) {
      msg1.textContent = line(mode, "react", { round, cat: lastPlayer.catName, pts: lastPlayer.pts });
      box.appendChild(msg1);
    }

    const msg2 = document.createElement("div");
    msg2.className = "turnLine";
    msg2.textContent = key
    ? line(mode, "event", { key, round, cat: catName, pts })
    : line(mode, "cpu",   { round, cat: catName, pts });
    box.appendChild(msg2);

    playerControls.style.display = "none";
    cpuControls.style.display = "";

    hint.textContent = line(mode, "hint", { key: "afterCpu" });

  }

  area.appendChild(box);
}

function renderBattle() {
  renderRound();
  renderTurnArea();
  renderCats();
  renderScorecard();
}

// ----------------------
// Flow
// ----------------------
function doCpuTurn() {
  lastCpu = cpuPlayTurn(cScore, mode);
  cScore = lastCpu.nextScorecard;
  phase = "cpu";
  renderBattle();
}

async function nextRoundOrResult() {
  // 12ラウンド想定：両者が埋まったら終了
  if (isComplete(pScore) && isComplete(cScore)) {
    await showResult();
    return;
  }

  round += 1;
  turn = newTurnState();
  phase = "player";
  lastCpu = null;
  renderBattle();
}

function ensurePopup() {
  let el = document.getElementById("achPopup");
  if (el) return el;

  el = document.createElement("div");
  el.id = "achPopup";
  el.style.cssText = `
    position: fixed; inset: 0; display:none; place-items:center;
    background: rgba(0,0,0,0.55); z-index: 9999; padding: 16px;
  `;
  el.innerHTML = `
    <div style="max-width:520px; width:100%; background:#fff; color:#000; border:2px solid #000; border-radius:14px; padding:14px;">
      <div id="achPTitle" style="font-weight:900; font-size:18px; margin-bottom:8px;"></div>
      <div id="achPBody" style="font-size:14px; line-height:1.6;"></div>
      <div style="display:flex; justify-content:flex-end; margin-top:12px;">
        <button id="achPNext" class="btn primary">次へ</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

async function showInfoPopup(titleText, bodyHtml){
  const popup = ensurePopup();
  const btn = popup.querySelector("#achPNext");
  const title = popup.querySelector("#achPTitle");
  const body = popup.querySelector("#achPBody");

  popup.style.display = "grid";
  title.textContent = titleText;
  body.innerHTML = bodyHtml;

  await new Promise(resolve => {
    const handler = () => { btn.removeEventListener("click", handler); resolve(); };
    btn.addEventListener("click", handler);
  });

  popup.style.display = "none";
}

async function confirmPopup(titleText, bodyHtml, okText="確定", cancelText="キャンセル"){
  const popup = ensurePopup();
  const btn = popup.querySelector("#achPNext");
  const title = popup.querySelector("#achPTitle");
  const body = popup.querySelector("#achPBody");

  popup.style.display = "grid";
  title.textContent = titleText;
  body.innerHTML = `
    <div>${bodyHtml}</div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px;">
      <button id="popCancel" class="btn">${cancelText}</button>
      <button id="popOk" class="btn primary">${okText}</button>
    </div>
  `;

  const okBtn = body.querySelector("#popOk");
  const cancelBtn = body.querySelector("#popCancel");

  return await new Promise(resolve => {
    const cleanup = () => {
      popup.style.display = "none";
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      btn.style.display = ""; // 念のため戻す
    };
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    // ach用のNextボタンはここでは使わないので隠す
    btn.style.display = "none";

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

async function showAchievementPopups(nums) {
  if (!nums.length) return;

  const popup = ensurePopup();
  const btn = popup.querySelector("#achPNext");
  const title = popup.querySelector("#achPTitle");
  const body = popup.querySelector("#achPBody");

  for (const n of nums) {
    const def = ACH.find(a => a.n === n);
    popup.style.display = "grid";
    title.textContent = `実績 ${def.n}：${def.name}`;
    body.innerHTML =
      `<div>${def.desc}</div>
      <div style="margin-top:10px; color:#444;">${line(mode, "ach", { ach: def })}</div>`;

    await new Promise(resolve => {
      const handler = () => { btn.removeEventListener("click", handler); resolve(); };
      btn.addEventListener("click", handler);
    });
  }

  popup.style.display = "none";
}

async function showResult() {
  const pTotal = totalScore(pScore);
  const cTotal = totalScore(cScore);

  let verdict = "引き分け";
  if (pTotal > cTotal) verdict = "勝利";
  if (pTotal < cTotal) verdict = "敗北";

  const win = pTotal > cTotal;
  const completed = isComplete(pScore) && isComplete(cScore);

  // 通算記録
  recordResult(mode, { win, playerScore: pTotal });

  // 隠し解放：解放の「前」を覚える
  const wasUnlocked = isSecretUnlocked();

  // 勝利なら勝利フラグを立てる
  if (win) setWinFlag(mode);

  // 解放の「後」を確認
  const nowUnlocked = isSecretUnlocked();

  // 解放された“瞬間”だけ演出（1回だけ）
  if (!wasUnlocked && nowUnlocked && !hasShownSecretToast()){
    await showInfoPopup(
      "隠しモード解放",
      `<div>「乱（山姥切長義 極）」が解放された。</div>
       <div style="margin-top:8px; color:#444;">モード選択画面に追加される。</div>`
    );
    markShownSecretToast();
  }

  // 実績判定（終了時まとめて）
  const { newlyUnlocked } = evaluateAndUnlock(mode, {
    scorecard: pScore,
    win,
    completed
  });

  // 番号昇順で1つずつ
  await showAchievementPopups(newlyUnlocked);

  // リザルト表示
  const finLine =
    verdict === "勝利" ? line(mode, "lose") :
    verdict === "敗北" ? line(mode, "win") :
    line(mode, "draw");

  $("resultBody").innerHTML = `
    <div class="ruleItem">
      <div class="name">${verdict}</div>
      <div class="desc">自 ${pTotal} 点 / 敵 ${cTotal} 点</div>
      <div class="note">上段ボーナス：自 +${upperBonus(pScore)} / 敵 +${upperBonus(cScore)}</div>
      <div class="note" style="margin-top:8px;">${finLine}</div>
    </div>
  `;

  show("screenResult");
}

// ----------------------
// Rules / Ach pages
// ----------------------
function openRules(from) {
  returnFromInfo = from;
  renderRules();
  show("screenRules");
}
function openAch(from) {
  returnFromInfo = from;
  renderAch();
  show("screenAch");
}
function backFromInfo() {
  show(returnFromInfo);
  if (returnFromInfo === "screenBattle") renderBattle();
}

function renderRules() {
  $("rulesBody").innerHTML = `
    <p class="muted">役は「成立条件」と「点の入り方」が違う。</p>
    <div class="rulesGrid" id="rulesGrid"></div>
    <div class="ruleItem" style="margin-top:10px;">
      <div class="name">上段ボーナス</div>
      <div class="desc">A〜6の合計が63以上で +35 点。</div>
    </div>
  `;
  const grid = $("rulesGrid");
  for (const cat of CAT_ORDER) {
    const div = document.createElement("div");
    div.className = "ruleItem";
    div.innerHTML =
      `<div class="name">${CAT_LABEL[cat]}</div>
       <div class="desc">${CAT_DESC[cat]}</div>
       ${RULE_EXAMPLE[cat] ? diceExampleHtml(RULE_EXAMPLE[cat]) : ""}`;
    grid.appendChild(div);
  }
}

function renderAch() {
  const list = getAchievementList(mode);

  const rows = list.map(a => {
    if (!a.unlocked) return `<div class="ruleItem"><div class="name">#${a.n} ???</div></div>`;
    return `<div class="ruleItem"><div class="name">#${a.n} ${a.name}</div><div class="desc">${a.desc}</div></div>`;
  }).join("");

  $("achBody").innerHTML = `
    <p class="muted">現在のモード：${modeLabel(mode)}</p>
    <div class="rulesGrid">${rows}</div>

    <div class="ruleItem" style="margin-top:10px;">
      <div class="name">削除</div>
      <div class="controls" style="margin-top:10px;">
        <button class="btn" id="clearAchBtn">このモードの実績を削除</button>
      </div>
    </div>
  `;

  $("clearAchBtn").addEventListener("click", async () => {
    const ok = await modalConfirm({
      title: modeLabel(mode),
      message: "このモードの実績と保存データを削除しますか？\n（乱モードの解放状況は維持されます）"
    });
    if (!ok) return;

    storageClearMode(mode);
    renderAch();
  });

}

// ----------------------
// Events
// ----------------------
$("goModeBtn")?.addEventListener("click", () => {
  updateModeCards();
  show("screenMode");
});
$("backTitleBtn")?.addEventListener("click", () => show("screenTitle"));

$("rollBtn")?.addEventListener("click", () => {
  if (phase !== "player") return;
  turn = rollDice(turn);
  renderBattle();
});

$("nextRoundBtn")?.addEventListener("click", async () => {
  if (phase !== "cpu") return;
  await nextRoundOrResult();
});

$("backBtnFromRules")?.addEventListener("click", backFromInfo);
$("backBtnFromAch")?.addEventListener("click", backFromInfo);

document.querySelectorAll(".mode").forEach(el => {
  el.addEventListener("click", () => {
    mode = el.dataset.mode;
    resetMatch();
    show("screenBattle");
    renderBattle();
  });
});

$("retryBtn")?.addEventListener("click", () => {
  resetMatch();
  show("screenBattle");
  renderBattle();
});

$("toTitleBtn")?.addEventListener("click", () => {
  resetMatch();
  show("screenTitle");
});

// start
show("screenTitle");
