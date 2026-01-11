// src/dialogues.js
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * mode: easy | normal | hard | expert | secret
 * kind: start | react | cpu | win | lose | draw | resign | ach | event
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
    start: ["始めよう。焦らず行けばいい。", "開始する。手順は変わらない。", "我が主。始めよう。"],
    react: ["「{cat}」か。悪くない。", "なるほど、「{cat}」で{pts}点。", "その選択は理解できる。「{cat}」。"],
    cpu: ["私は「{cat}」で{pts}点にする。", "記入は「{cat}」。{pts}点。", "「{cat}」を選ぶ。{pts}点。"],
    win: ["私の勝ちだ。だが、油断はしない。", "勝利。次も同じように積み上げる。", "勝った。礼は言わないよ。"],
    lose: ["……私が負けたか。見事だ。", "敗北。君の采配が上だった。", "認める。君の勝ちだ。"],
    draw: ["同点。決着は次に預けよう。", "引き分け。悪くない勝負だ。"],
    resign: ["降参か。分かった。次も付き合う。"],
    ach: ["実績：「{achName}」。記録しておく。", "解除。「{achName}」。", "「{achName}」。達成だ。"],
    hint: {
      beforeRoll: ["ロールしよう。"],
      afterRoll: ["固定する目を選んで、役を決める。"],
      afterCpu: ["確認したら、次へ。"]
    },
    event: {
      yahtzee: ["……ヨット。{pts}点。見事だ。"],
      straight: ["{cat}。{pts}点。手堅い。"],
      zero: ["0点か。割り切ったな。"],
      big: ["{cat}。{pts}点。いい流れだ。"]
    }
  },

  normal: {
    start: ["開始する。合理的に進める。", "状況を確認。手順どおり。", "記録は残る。油断は不要。"],
    react: ["「{cat}」。{pts}点。確認。", "前ターン：「{cat}」{pts}点。把握。", "「{cat}」か。記録した。"],
    cpu: ["「{cat}」。{pts}点。妥当。", "処理完了。「{cat}」{pts}点。", "評価：「{cat}」{pts}点。"],
    win: ["勝利。結果は正当。", "問題なし。勝った。", "完了。"],
    lose: ["敗北。原因は手順ではない。出目だ。", "負けた。再現性を上げる。", "次で回収する。"],
    draw: ["同点。偶然性が強い。", "引き分け。"],
    resign: ["降参。了解。次は手順を見直して。"],
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
    start: ["さあ、始めようか。", "遊びじゃない。始めるよ。", "……始める。"],
    react: ["へぇ。「{cat}」で{pts}点？", "「{cat}」か。……やるね。", "なるほどね、「{cat}」。"],
    cpu: ["ボクは「{cat}」で{pts}点。", "「{cat}」。{pts}点。これでいい。", "……「{cat}」。{pts}点で行くよ。"],
    win: ["ボクの勝ち。……当然とは言わないけどさ。", "勝った。次も同じように。", "悪くない勝負だったよ。"],
    lose: ["……ボクが負けた？ まあ、いいや。", "負けたね。次は譲らない。", "……参った。君の勝ちだ。"],
    draw: ["同点か。面倒だね。", "引き分け。続きをやろう。"],
    resign: ["降参だね。分かった。また遊ぼう。"],
    ach: ["実績：「{achName}」。……ふうん。", "解除。「{achName}」。", "「{achName}」。達成だね。"],
    hint: {
      beforeRoll: ["ロールして。"],
      afterRoll: ["固定して、役を決めよう。"],
      afterCpu: ["次。"]
    },
    event: {
      yahtzee: ["ヨット？ {pts}点。……派手だね。"],
      straight: ["{cat}。{pts}点。悪くない。"],
      zero: ["0点。切ったか。"],
      big: ["{cat}。{pts}点。へぇ。"]
    }
  },

  expert: {
    start: ["っはは。俺の戦いを見せてやる。", "始めようか。", "来い。"],
    react: ["「{cat}」か。なかなかやるな。", "へぇ……「{cat}」で{pts}点？ 面白い。", "その役を切るか。悪くない。"],
    cpu: ["俺は「{cat}」で{pts}点だ。", "処理は「{cat}」。{pts}点。", "「{cat}」{pts}点。まあいいだろう。"],
    win: ["俺の勝ちだ。……当然と言っておく。", "ははっ、決着だな。", "終わりだ。次はもっと足掻け。"],
    lose: ["俺が負けたのか。……見事だ。", "へぇ、やるじゃないか。今回は認める。", "……君の勝ちだ。次は斬って捨てる。"],
    draw: ["同点？ 決着が要るな。", "引き分けか。つまらない。"],
    resign: ["降参か。いい判断だ。次は逃がさない。"],
    ach: ["実績：「{achName}」。悪くない。", "解除か。「{achName}」。", "「{achName}」。記録しておく。"],
    hint: {
      beforeRoll: ["ロールしろ。"],
      afterRoll: ["固定して、役を選べ。"],
      afterCpu: ["確認して次だ。"]
    },
    event: {
      yahtzee: ["……ヨット。{pts}点。ほう。"],
      straight: ["{cat}。{pts}点。斬れ味は悪くない。"],
      zero: ["0点？ 捨てたか。"],
      big: ["{cat}。{pts}点。いいね。"]
    }
  },

  secret: {
    start: ["さあ、伝説を作りにゆこうか。", "俺がいれば十分だろう？", "始めよう。君の手腕を見せてごらん。"],
    react: ["「{cat}」か。君らしい。", "なるほど、「{cat}」で{pts}点。", "いい選択だ。……認めよう。"],
    cpu: ["俺は「{cat}」。{pts}点で行く。", "「{cat}」{pts}点。備えなくして勝てない。", "記入は「{cat}」。{pts}点。"],
    win: ["俺の勝ちだ。……当然の結果かな。", "勝利。君も悪くなかったよ。", "ははっ、これが実力差だ。"],
    lose: ["俺が負けたのか。……君の勝ちだ。", "見事だ。君の采配に敬意を払おう。", "……参った。次は俺が勝つ。"],
    draw: ["同点。決着を付けよう。", "引き分けか。まあ、それでも構わない。"],
    resign: ["降参ね。分かった。次は勝ちに来なよ。"],
    ach: ["実績：「{achName}」。よくやった。", "解除。「{achName}」。", "「{achName}」。伝説の一歩だ。"],
    hint: {
      beforeRoll: ["ロールしようか。"],
      afterRoll: ["固定して、役を選べ。"],
      afterCpu: ["次へ。"]
    },
    event: {
      yahtzee: ["……ヨット。{pts}点。君はやるね。"],
      straight: ["{cat}。{pts}点。堅実だ。"],
      zero: ["0点。割り切りも必要だ。"],
      big: ["{cat}。{pts}点。これはいい。"]
    }
  },

};
