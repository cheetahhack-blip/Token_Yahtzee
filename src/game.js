import { CATS, scoreCategory } from "./scoring.js";

export function newScorecard(){
  return {
    [CATS.A]: null,
    [CATS.TWO]: null,
    [CATS.THREE]: null,
    [CATS.FOUR]: null,
    [CATS.FIVE]: null,
    [CATS.SIX]: null,
    [CATS.CHOICE]: null,
    [CATS.FOUR_KIND]: null,
    [CATS.FULL_HOUSE]: null,
    [CATS.SMALL_STRAIGHT]: null,
    [CATS.LARGE_STRAIGHT]: null,
    [CATS.YAHTZEE]: null,
  };
}

export function newTurnState(){
  return {
    dice: [1,1,1,1,1],
    held: [false,false,false,false,false],
    rollsLeft: 3,
    hasRolled: false,
  };
}

export function rollDice(turn){
  if (turn.rollsLeft <= 0) return turn;
  const next = structuredClone(turn);
  for (let i=0;i<5;i++){
    if (!next.held[i]) next.dice[i] = 1 + Math.floor(Math.random()*6);
  }
  next.rollsLeft -= 1;
  next.hasRolled = true;
  return next;
}

export function toggleHold(turn, idx){
  if (!turn.hasRolled) return turn; // 最初のロール前は固定しない
  const next = structuredClone(turn);
  next.held[idx] = !next.held[idx];
  return next;
}

export function availableCats(scorecard){
  return Object.values(CATS).filter(k => scorecard[k] === null);
}

export function commitCategory(scorecard, dice, cat){
  if (scorecard[cat] !== null) return scorecard;
  const next = structuredClone(scorecard);
  next[cat] = scoreCategory(dice, cat);
  return next;
}

export function isComplete(scorecard){
  return availableCats(scorecard).length === 0;
}
