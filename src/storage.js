const KEY_PREFIX = "ty_";

function k(name){ return `${KEY_PREFIX}${name}`; }
function km(mode, name){ return `${KEY_PREFIX}${mode}_${name}`; }

export function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}
export function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/** グローバル：初期4人への勝利フラグ */
export function getWinFlags(){
  return loadJSON(k("wins_vs"), { easy:false, normal:false, hard:false, expert:false });
}
export function setWinFlag(mode){
  const w = getWinFlags();
  if (mode in w) w[mode] = true;
  saveJSON(k("wins_vs"), w);
}
export function isSecretUnlocked(){
  const w = getWinFlags();
  return !!(w.easy && w.normal && w.hard && w.expert);
}

/** モード別：実績・通算 */
export function getModeData(mode){
  return loadJSON(km(mode, "data"), {
    wins: 0,
    losses: 0,
    games: 0,
    bestScore: null,
    unlocked: {},   // { "1": true, ... }
  });
}
export function saveModeData(mode, data){
  saveJSON(km(mode, "data"), data);
}

/** 仕様どおり：モード別削除（実績のみ / 全部） */
export function storageClearMode(mode, { achievementsOnly } = { achievementsOnly: false }){
  if (achievementsOnly){
    const d = getModeData(mode);
    d.unlocked = {};
    saveModeData(mode, d);
    return;
  }
  localStorage.removeItem(km(mode, "data"));
}

/** 降参用：記録を一切しない（呼ぶだけ） */
export function noopRecord(){}

/** 対戦結果の記録（降参時は呼ばない） */
export function recordResult(mode, { win, playerScore }){
  const d = getModeData(mode);
  d.games += 1;
  if (win) d.wins += 1; else d.losses += 1;
  if (d.bestScore === null || playerScore > d.bestScore) d.bestScore = playerScore;
  saveModeData(mode, d);
  return d;
}
