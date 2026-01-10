import { upperBonus, totalScore, CATS } from "./scoring.js";
import { getModeData, saveModeData } from "./storage.js";

/**
 * 仕様書：1モードあたり11実績
 * 表示は番号昇順で1つずつポップアップ
 * :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}
 */
export const ACH = [
  { n: 1,  name: "完走",           desc: "12ラウンドを最後までプレイする" },
  { n: 2,  name: "五つの目",       desc: "ヨット（同じ目5個）を成立させる" },
  { n: 3,  name: "道は続いている", desc: "Sストレートを成立させる" },
  { n: 4,  name: "一直線",         desc: "Bストレートを成立させる" },
  { n: 5,  name: "帳尻合わせ",     desc: "上段ボーナス（+35）を獲得する" },
  { n: 6,  name: "伝説の航海",     desc: "合計250点以上で終了する" },
  { n: 7,  name: "捨て身",         desc: "0点をどこかに記入して完走する" },
  { n: 8,  name: "完璧主義者",     desc: "0点なしで完走する" },
  { n: 9,  name: "勝利",           desc: "対戦に勝利する" },
  { n: 10, name: "敗北",           desc: "対戦に敗北する" },
  { n: 11, name: "勝ち越し",       desc: "通算3勝を達成する（同モード）" },
];

/**
 * gameSummary は app.js から渡す
 * - scorecard: プレイヤーのスコアカード（各枠の点数が入ってる）
 * - win: 勝利ならtrue
 * - completed: 12枠すべて埋めた（=完走）
 */
export function evaluateAndUnlock(mode, gameSummary){
  const d = getModeData(mode);
  const unlockedBefore = { ...d.unlocked };

  const sc = gameSummary.scorecard;
  const completed = !!gameSummary.completed;
  const win = !!gameSummary.win;

  // 0点記入数（nullは未記入。終了時は全枠埋まっている前提）
  const values = Object.values(sc).filter(v => v !== null);
  const zeroCount = values.filter(v => v === 0).length;

  const hasYahtzee = sc[CATS.YAHTZEE] !== null && sc[CATS.YAHTZEE] > 0;
  const hasSmall = sc[CATS.SMALL_STRAIGHT] !== null && sc[CATS.SMALL_STRAIGHT] > 0;
  const hasLarge = sc[CATS.LARGE_STRAIGHT] !== null && sc[CATS.LARGE_STRAIGHT] > 0;
  const hasBonus = upperBonus(sc) > 0;

  const total = totalScore(sc);

  // 解除判定（終了時まとめて）
  const willUnlock = [];
  function unlock(n){
    const key = String(n);
    if (!d.unlocked[key]){
      d.unlocked[key] = true;
      willUnlock.push(n);
    }
  }

  if (completed) unlock(1);
  if (completed && hasYahtzee) unlock(2);
  if (completed && hasSmall) unlock(3);
  if (completed && hasLarge) unlock(4);
  if (completed && hasBonus) unlock(5);
  if (completed && total >= 250) unlock(6);
  if (completed && zeroCount >= 1) unlock(7);
  if (completed && zeroCount === 0) unlock(8);

  if (completed && win) unlock(9);
  if (completed && !win) unlock(10);

  // 通算3勝（同モード）…winsは recordResult 後に反映される想定
  if (d.wins >= 3) unlock(11);

  saveModeData(mode, d);

  // 番号昇順で返す（ポップアップの順序）
  willUnlock.sort((a,b)=>a-b);

  return {
    newlyUnlocked: willUnlock,
    unlockedBefore,
    unlockedAfter: d.unlocked,
  };
}

export function getAchievementList(mode){
  const d = getModeData(mode);
  return ACH.map(a => ({
    ...a,
    unlocked: !!d.unlocked[String(a.n)]
  }));
}
