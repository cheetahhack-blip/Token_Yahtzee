// src/cpu.js
import { CATS, scoreCategory, isSmallStraight, isLargeStraight, counts, upperSum } from "./scoring.js";
import { newTurnState, rollDice, availableCats, commitCategory } from "./game.js";

const MODE = {
  // easy: 上段寄り＋0点回避＋早めに妥協
  easy:   { risk: 0.2, zeroHate: 2.5, upperBias: 1.5, highRoleBias: 0.8, straightBias: 0.7 },
  // normal: 中庸
  normal: { risk: 0.5, zeroHate: 1.8, upperBias: 1.0, highRoleBias: 1.0, straightBias: 1.0 },
  // hard: ストレート/高役寄り＋粘る
  hard:   { risk: 0.85, zeroHate: 1.2, upperBias: 0.85, highRoleBias: 1.25, straightBias: 1.35 },
  // expert: 選別（低点上段を切りやすい）＋高役寄り
  expert: { risk: 1.0, zeroHate: 0.9, upperBias: 0.65, highRoleBias: 1.45, straightBias: 1.25 },
  // secret: expertよりさらに切る
  secret: { risk: 1.1, zeroHate: 0.8, upperBias: 0.55, highRoleBias: 1.55, straightBias: 1.25 },
};

function cfg(mode){ return MODE[mode] ?? MODE.normal; }

function isUpper(cat){
  return cat === CATS.A || cat === CATS.TWO || cat === CATS.THREE || cat === CATS.FOUR || cat === CATS.FIVE || cat === CATS.SIX;
}

function chooseTargetCategory(avCats, dice, modeCfg){
  // 成立している強役は固定
  if (avCats.includes(CATS.YAHTZEE) && scoreCategory(dice, CATS.YAHTZEE) === 50) return CATS.YAHTZEE;
  if (avCats.includes(CATS.LARGE_STRAIGHT) && isLargeStraight(dice)) return CATS.LARGE_STRAIGHT;
  if (avCats.includes(CATS.SMALL_STRAIGHT) && isSmallStraight(dice)) return CATS.SMALL_STRAIGHT;

  // hard系はストレートを優先して狙いにしがち
  if (modeCfg.straightBias >= 1.3){
    if (avCats.includes(CATS.LARGE_STRAIGHT)) return CATS.LARGE_STRAIGHT;
    if (avCats.includes(CATS.SMALL_STRAIGHT)) return CATS.SMALL_STRAIGHT;
  }

  const prefHigh = [CATS.YAHTZEE, CATS.LARGE_STRAIGHT, CATS.FULL_HOUSE, CATS.FOUR_KIND, CATS.CHOICE];
  const prefSafe = [CATS.SIX, CATS.FIVE, CATS.FOUR, CATS.THREE, CATS.TWO, CATS.A, CATS.CHOICE, CATS.FOUR_KIND, CATS.FULL_HOUSE];

  const pickFrom = (arr) => arr.find(c => avCats.includes(c));

  if (modeCfg.highRoleBias >= 1.2) return pickFrom(prefHigh) ?? avCats[0];
  if (modeCfg.upperBias >= 1.2) return pickFrom(prefSafe) ?? avCats[0];

  // その場の点が高いもの
  let best = avCats[0], bestScore = -1;
  for (const c of avCats){
    const s = scoreCategory(dice, c);
    if (s > bestScore){ bestScore = s; best = c; }
  }
  return best;
}

function applyHoldStrategy(turn, targetCat){
  const dice = turn.dice;
  const held = [false,false,false,false,false];

  const c = counts(dice);
  const entries = [...c.entries()].sort((a,b)=>b[1]-a[1]);
  const most = entries[0]?.[0];

  // 同目収集
  if (targetCat === CATS.YAHTZEE || targetCat === CATS.FOUR_KIND || targetCat === CATS.FULL_HOUSE){
    for (let i=0;i<5;i++) if (dice[i] === most) held[i] = true;

    if (targetCat === CATS.FULL_HOUSE && entries.length >= 2){
      const second = entries[1][0];
      for (let i=0;i<5;i++) if (dice[i] === second) held[i] = true;
    }
    return { ...turn, held };
  }

  // ストレート狙い
  if (targetCat === CATS.SMALL_STRAIGHT || targetCat === CATS.LARGE_STRAIGHT){
    const set = new Set(dice);
    const needSets = (targetCat === CATS.LARGE_STRAIGHT)
      ? [[1,2,3,4,5],[2,3,4,5,6]]
      : [[1,2,3,4],[2,3,4,5],[3,4,5,6]];

    let bestNeed = needSets[0], bestHit = -1;
    for (const ns of needSets){
      const hit = ns.filter(x => set.has(x)).length;
      if (hit > bestHit){ bestHit = hit; bestNeed = ns; }
    }
    for (let i=0;i<5;i++) if (bestNeed.includes(dice[i])) held[i] = true;
    return { ...turn, held };
  }

  // 上段
  if (isUpper(targetCat)){
    const want = (targetCat === CATS.A) ? 1 : Number(targetCat);
    for (let i=0;i<5;i++) if (dice[i] === want) held[i] = true;
    return { ...turn, held };
  }

  // チョイス：4以上残す
  if (targetCat === CATS.CHOICE){
    for (let i=0;i<5;i++) if (dice[i] >= 4) held[i] = true;
    return { ...turn, held };
  }

  return { ...turn, held };
}

function pickFinalCategory(scorecard, dice, modeCfg){
  const cats = availableCats(scorecard);

  const upperNow = upperSum(scorecard); // 上段合計（未記入はnull扱いの実装前提）
  const needUpper = Math.max(0, 63 - upperNow);

  let best = cats[0];
  let bestValue = -1e9;

  for (const cat of cats){
    const pts = scoreCategory(dice, cat);
    let v = pts;

    // 0点回避
    if (pts === 0) v -= 20 * modeCfg.zeroHate;

    // easy: 上段ボーナスへ寄せる（63未満なら上段価値UP）
    if (isUpper(cat)){
      v *= modeCfg.upperBias;
      if (modeCfg.upperBias >= 1.4 && needUpper > 0){
        // 目標に近づくほど加点
        v += Math.min(needUpper, pts) * 0.6;
      }
      // expert/secret: 低点上段は切りがち
      if (modeCfg.risk >= 1.0 && pts <= 4) v -= 7;
    }

    // 高役
    const isHigh = (cat === CATS.YAHTZEE || cat === CATS.LARGE_STRAIGHT || cat === CATS.FULL_HOUSE || cat === CATS.FOUR_KIND);
    if (isHigh) v *= modeCfg.highRoleBias;

    // hard/expert: ストレートに少し色を付ける
    const isStr = (cat === CATS.SMALL_STRAIGHT || cat === CATS.LARGE_STRAIGHT);
    if (isStr) v *= modeCfg.straightBias;

    if (v > bestValue){
      bestValue = v;
      best = cat;
    }
  }
  return best;
}

export function cpuPlayTurn(scorecard, mode="normal"){
  const modeCfg = cfg(mode);

  let t = newTurnState();
  t = rollDice(t);

  const av = availableCats(scorecard);
  let target = chooseTargetCategory(av, t.dice, modeCfg);

  while (t.rollsLeft > 0){
    // easyほど止まりやすい / hardほど粘る
    const stopThreshold = 0.12 + (1.0 - modeCfg.risk) * 0.45;

    // “狙い”の現点がそこそこなら止める（easy寄り）
    const nowBest = scoreCategory(t.dice, target);
    if (nowBest >= 20 && Math.random() < stopThreshold) break;

    t = applyHoldStrategy(t, target);
    t = rollDice(t);
    target = chooseTargetCategory(av, t.dice, modeCfg);
  }

  const chosenCat = pickFinalCategory(scorecard, t.dice, modeCfg);
  const points = scoreCategory(t.dice, chosenCat);
  const nextScorecard = commitCategory(scorecard, t.dice, chosenCat);

  return { dice: t.dice, chosenCat, points, nextScorecard };
}
