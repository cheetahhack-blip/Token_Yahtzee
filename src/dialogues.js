// src/dialogues.js
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * mode: easy | normal | hard | expert | secret
 * kind: start | cpu | win | lose | draw | resign | ach | event
 * ctx: { round, cat, pts, ach:{n,name}, key }
 */
export function line(mode, kind, ctx = {}) {
  const M = DATA[mode] ?? DATA.normal;

  // eventだけ特別：ctx.keyで引く
  if (kind === "event") {
    const key = ctx.key;
    const bank = (M.event && M.event[key]) || (DATA.normal.event && DATA.normal.event[key]);
    if (bank && bank.length) return format(pick(bank), ctx);
    // fallback
    return format(pick(M.cpu ?? ["……。"]), ctx);
  }
  // hint（ctx.keyで引く）
  if (kind === "hint") {
    const key = ctx.key; // beforeRoll / afterRoll / afterCpu
    const bank = (M.hint && M.hint[key]) || (DATA.normal.hint && DATA.normal.hint[key]);
    if (bank && bank.length) return format(pick(bank), ctx);
    return "…";
  }

  const bank = M[kind] ?? DATA.normal[kind] ?? ["……。"];
  return format(pick(bank), ctx);
}

function format(s, ctx) {
  return s
    .replaceAll("{round}", String(ctx.round ?? ""))
    .replaceAll("{cat}", String(ctx.cat ?? ""))
    .replaceAll("{pts}", String(ctx.pts ?? ""))
    .replaceAll("{achName}", String(ctx.ach?.name ?? ""))
    .replaceAll("{achN}", String(ctx.ach?.n ?? ""))
    .trim();
}

const DATA = {
  easy: {
    start: [
      "よろしく。焦らず、ゆっくりいこう。",
      "大丈夫。少しずつ埋めればいい。",
      "今日は穏やかな航海にしたい。"
    ],
    cpu: [
      "今回は「{cat}」で{pts}点。うん、悪くない。",
      "慎重にいく。{cat}、{pts}点。",
      "ここは手堅く。{cat}で{pts}点。"
    ],
    win: ["勝てた。少しうれしい。", "ありがとう。いい勝負だった。", "次も、落ち着いていけばいい。"],
    lose: ["負けた……でも、悪くなかった。", "次はもう少し上手くできると思う。", "悔しい。けど、焦らない。"],
    draw: ["引き分け。こういう日もある。", "同点。すごい。"],
    resign: ["……また今度、続きやろう。"],
    ach: ["実績「{achName}」を達成。すごい。", "……達成。「{achName}」。", "おめでとう。「{achName}」。"],
    hint: {
      beforeRoll: ["まずロールしよう。"],
      afterRoll: ["ダイスをタップでHOLD。役を選ぶと確定するよ。"],
      afterCpu: ["相手の結果を見たら、次へ進もう。"]
    },
    event: {
      yahtzee: ["……ヨット。{pts}点。すごい。"],
      straight: ["一直線だ。{cat}、{pts}点。"],
      zero: ["0点……。でも、最後までいけばいい。"],
      big: ["高い。{cat}で{pts}点。いいね。"],
    }
  },

  normal: {
    start: ["開始する。合理的に進める。", "状況を確認。手順どおり。", "記録は残る。油断は不要。"],
    cpu: ["「{cat}」。{pts}点。妥当。", "処理完了。「{cat}」{pts}点。", "評価：「{cat}」{pts}点。"],
    win: ["勝利。結果は正当。", "問題なし。勝った。", "完了。"],
    lose: ["敗北。原因は手順ではない。出目だ。", "負けた。再現性を上げる。", "次で回収する。"],
    draw: ["同点。偶然性が強い。", "引き分け。"],
    resign: ["降参を確認。記録しない。"],
    ach: ["実績解除：「{achName}」。記録。", "達成：「{achName}」。", "確認。「{achName}」。"],
    hint: {
      beforeRoll: ["まずロール。"],
      afterRoll: ["ダイスをタップで固定。役を選べ。"],
      afterCpu: ["相手の結果を確認後、次へ。"]
    },

    event: {
      yahtzee: ["評価：ヨット。{pts}点。"],
      straight: ["直線成立。{cat}。{pts}点。"],
      zero: ["0点を記録。許容範囲。"],
      big: ["高得点。「{cat}」{pts}点。"],
    }
  },

  hard: {
    start: ["さあ、派手にいこう。高い役を狙う。", "遠慮はしない。攻める。", "リスクは歓迎。"],
    cpu: ["「{cat}」で{pts}点。もう少し伸ばせたかも。", "{cat}、{pts}点。攻めた結果。", "ここは勝負。{cat}で{pts}点。"],
    win: ["勝った。気分がいい。", "よし。攻めが通った。", "次もやろう。"],
    lose: ["負けた。でも攻めた。後悔はない。", "惜しい。次はもっと崩す。", "攻めすぎたか……いや、まだいける。"],
    draw: ["引き分けか。面白い。", "同点。もう一回。"],
    resign: ["降参？……次は逃がさない。"],
    ach: ["実績「{achName}」！いいね。", "達成、「{achName}」。やるじゃない。", "「{achName}」を取った。上出来。"],
    hint: {
      beforeRoll: ["まず振ろう。"],
      afterRoll: ["HOLDして、役を選んで確定。攻めどころ。"],
      afterCpu: ["相手の結果を見た？次、いこう。"]
    },
    event: {
      yahtzee: ["ヨット！{pts}点。最高。"],
      straight: ["ストレート！{cat}、{pts}点。"],
      zero: ["0点？攻めた証拠だね。"],
      big: ["いい点。{cat}で{pts}点。"],
    }
  },

  expert: {
    start: ["開始。無駄は切る。", "評価基準は明確。結果で示す。", "行こう。"],
    cpu: ["「{cat}」。{pts}点。可。", "処理：「{cat}」{pts}点。次。", "「{cat}」{pts}点。及第。"],
    win: ["勝利。妥当。", "当然の結果。", "終わり。"],
    lose: ["敗北。……記録しておく。", "負けた。次は修正する。", "認める。今回はこちらが劣った。"],
    draw: ["同点。決着が要る。", "引き分け。"],
    resign: ["降参を受理。記録しない。"],
    ach: ["実績：「{achName}」。……悪くない。", "解除確認。「{achName}」。", "「{achName}」。記録。"],
    hint: {
      beforeRoll: ["ロール。"],
      afterRoll: ["HOLD。役を選択して確定。"],
      afterCpu: ["確認後、次へ。"]
    },
    event: {
      yahtzee: ["……ヨット。{pts}点。可。"],
      straight: ["「{cat}」。{pts}点。問題なし。"],
      zero: ["0点。切り捨て。"],
      big: ["{cat}。{pts}点。次。"],
    }
  },

  secret: {
    start: ["……始める。乱。", "評価は厳密。甘えは許さない。", "見せて。"],
    cpu: ["「{cat}」。{pts}点。まだ甘い。", "処理：「{cat}」{pts}点。続行。", "「{cat}」{pts}点。次。"],
    win: ["勝利。想定内。", "当然。", "終幕。"],
    lose: ["……負けた。記録して、潰す。", "敗北。次は許さない。", "認める。だが、次で返す。"],
    draw: ["同点。面倒。", "引き分け。"],
    resign: ["降参。記録しない。"],
    ach: ["実績：「{achName}」。……ふん。", "解除。「{achName}」。", "「{achName}」。記録。"],
    hint: {
      beforeRoll: ["ロール。"],
      afterRoll: ["固定。役を選べ。"],
      afterCpu: ["確認。次。"]
    },
    event: {
      yahtzee: ["……ヨット。{pts}点。"],
      straight: ["{cat}。{pts}点。"],
      zero: ["0点。判断は正しい。"],
      big: ["{cat}。{pts}点。"],
    }
  }
};
