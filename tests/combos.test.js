import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress } from '../src/domain/periods.js';
import { applyQuizEvent } from '../src/domain/progress.js';

const now = new Date('2026-09-24T15:00:00Z');
const answer = (game, index, selected = 0, extra = {}) => ({
  id: `${game}:answer:${index}`, type: 'answer', selected, remaining: 20,
  question: { id: `${game}-q${index}`, disciplina: 'Excel', dificuldade: 'Fácil', respostaCorreta: 0 },
  ...extra
});

test('combo sequence is stored per quiz, resets on error and ignores caller streak', () => {
  let data = initialProgress('local', now);
  const sequence = [1, 2, 3, 0, 1, 2, 3];
  for (let i = 0; i < sequence.length; i++) {
    const result = applyQuizEvent(data, answer('one', i, i === 3 ? 1 : 0, {streak: 999}), now);
    assert.equal(result.streak, sequence[i]);
    assert.equal(result.data.partidaAtual.streak, sequence[i]);
    assert.equal(result.comboXp, i === 2 ? 10 : 0);
    data = result.data;
  }
  const replay = applyQuizEvent(data, answer('one', 6), now);
  assert.equal(replay.streak, 3);
  assert.equal(replay.data.pontuacaoGeral, data.pontuacaoGeral);
  assert.equal(applyQuizEvent(data, answer('two', 0), now).streak, 1);
});

test('all combo tiers pay once, survive serialization and reset for a new quiz', () => {
  let data = initialProgress('local', now);
  for (const game of ['one', 'two']) {
    let comboTotal = 0;
    for(let i=0; i<10; i++) {
      const result = applyQuizEvent(JSON.parse(JSON.stringify(data)), answer(game,i),now);
      assert.equal(result.comboXp, ({2:10,4:20,9:30})[i] || 0);
      comboTotal += result.comboXp;
      data = result.data;
    }
    assert.equal(comboTotal,60);
    assert.deepEqual(data.partidaAtual.rewardedCombos,[3,5,10]);
    const replay=applyQuizEvent(data,answer(game,9),now);
    assert.equal(replay.data.pontuacaoGeral,data.pontuacaoGeral);
  }
});

test('a repeated three-answer combo can still reach a new five-answer milestone', () => {
  let data=initialProgress('local',now);
  for(let i=0;i<9;i++) {
    const result=applyQuizEvent(data,answer('one',i,i===3?1:0),now);
    assert.equal(result.comboXp, i===2?10:i===8?20:0);
    data=result.data;
  }
  assert.deepEqual(data.partidaAtual.rewardedCombos,[3,5]);
});

test('timeout, review and same-day repeated questions break the combo', () => {
  let data = applyQuizEvent(initialProgress('local', now), answer('one', 0), now).data;
  for (const extra of [{remaining:0}, {review:true}, {question:answer('one',0).question}]) {
    const result = applyQuizEvent(data, answer('one', 1, 0, extra), now);
    assert.equal(result.streak, 0);
  }
});
