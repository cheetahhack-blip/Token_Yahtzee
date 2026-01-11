export const CATS = Object.freeze({
  A: "A",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  CHOICE: "CHOICE",
  FOUR_KIND: "FOUR_KIND",
  FULL_HOUSE: "FULL_HOUSE",
  SMALL_STRAIGHT: "SMALL_STRAIGHT",
  LARGE_STRAIGHT: "LARGE_STRAIGHT",
  YAHTZEE: "YAHTZEE",
});

export const CAT_LABEL = Object.freeze({
  [CATS.A]: "A（1の目）",
  [CATS.TWO]: "2の目",
  [CATS.THREE]: "3の目",
  [CATS.FOUR]: "4の目",
  [CATS.FIVE]: "5の目",
  [CATS.SIX]: "6の目",
  [CATS.CHOICE]: "チョイス",
  [CATS.FOUR_KIND]: "フォーダイス",
  [CATS.FULL_HOUSE]: "フルハウス",
  [CATS.SMALL_STRAIGHT]: "Sストレート",
  [CATS.LARGE_STRAIGHT]: "Bストレート",
  [CATS.YAHTZEE]: "ヨット",
});

// UI固定並び：理論上の最大点（上限）順（同上限は任意順）
export const CAT_ORDER = [
  CATS.YAHTZEE,
  CATS.FOUR_KIND,
  CATS.LARGE_STRAIGHT,
  CATS.SMALL_STRAIGHT,
  CATS.FULL_HOUSE,
  CATS.CHOICE,
  CATS.A,
  CATS.TWO,
  CATS.THREE,
  CATS.FOUR,
  CATS.FIVE,
  CATS.SIX,
];

export function sum(dice){ return dice.reduce((a,b)=>a+b,0); }

export function counts(dice){
  const c = new Map();
  for (const d of dice) c.set(d, (c.get(d) ?? 0) + 1);
  return c;
}

export function isSmallStraight(dice){
  const s = new Set(dice);
  const has = (...arr) => arr.every(x => s.has(x));
  return has(1,2,3,4) || has(2,3,4,5) || has(3,4,5,6);
}

export function isLargeStraight(dice){
  const s = new Set(dice);
  const has = (...arr) => arr.every(x => s.has(x));
  return (s.size === 5) && (has(1,2,3,4,5) || has(2,3,4,5,6));
}

export function scoreCategory(dice, cat){
  const c = counts(dice);
  const total = sum(dice);

  switch(cat){
    case CATS.A:     return (c.get(1) ?? 0) * 1;
    case CATS.TWO:   return (c.get(2) ?? 0) * 2;
    case CATS.THREE: return (c.get(3) ?? 0) * 3;
    case CATS.FOUR:  return (c.get(4) ?? 0) * 4;
    case CATS.FIVE:  return (c.get(5) ?? 0) * 5;
    case CATS.SIX:   return (c.get(6) ?? 0) * 6;

    case CATS.CHOICE:
      return total;

    case CATS.FOUR_KIND: {
      const has4 = [...c.values()].some(v => v >= 4);
      return has4 ? total : 0; // ← 5個合計
    }

    case CATS.FULL_HOUSE: {
      const vals = [...c.values()].sort((a,b)=>a-b);
      const isFH = (vals.length === 2 && vals[0] === 2 && vals[1] === 3);
      return isFH ? 25 : 0; // ← 25点固定
    }

    case CATS.SMALL_STRAIGHT:
      return isSmallStraight(dice) ? 15 : 0;

    case CATS.LARGE_STRAIGHT:
      return isLargeStraight(dice) ? 30 : 0;

    case CATS.YAHTZEE: {
      const has5 = [...c.values()].some(v => v === 5);
      return has5 ? 50 : 0;
    }

    default:
      return 0;
  }
}

export function upperSum(scorecard){
  return (scorecard[CATS.A] ?? 0)
    + (scorecard[CATS.TWO] ?? 0)
    + (scorecard[CATS.THREE] ?? 0)
    + (scorecard[CATS.FOUR] ?? 0)
    + (scorecard[CATS.FIVE] ?? 0)
    + (scorecard[CATS.SIX] ?? 0);
}

export function upperBonus(scorecard){
  return upperSum(scorecard) >= 63 ? 35 : 0;
}

export function totalScore(scorecard){
  let t = 0;
  for (const k of Object.values(CATS)) t += (scorecard[k] ?? 0);
  return t + upperBonus(scorecard);
}

export const CAT_DESC = Object.freeze({
  [CATS.A]: "1の目の合計点。",
  [CATS.TWO]: "2の目の合計点。",
  [CATS.THREE]: "3の目の合計点。",
  [CATS.FOUR]: "4の目の合計点。",
  [CATS.FIVE]: "5の目の合計点。",
  [CATS.SIX]: "6の目の合計点。",
  [CATS.CHOICE]: "出目5個の合計点。",
  [CATS.FOUR_KIND]: "同じ目が4個以上。成立すると合計点。",
  [CATS.FULL_HOUSE]: "同じ目3個＋別の目2個。25点固定。",
  [CATS.SMALL_STRAIGHT]: "連番4個（1234 / 2345 / 3456）。15点固定。",
  [CATS.LARGE_STRAIGHT]: "連番5個（12345 / 23456）。30点固定。",
  [CATS.YAHTZEE]: "同じ目が5個。50点固定。",
});
