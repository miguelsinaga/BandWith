import test from 'node:test'
import assert from 'node:assert/strict'
import { judgeTiming, applyHit, accuracy, grade, NEW_STATS } from './useGameEngine.js'

test('timing windows are symmetric and exclusive past 150ms', () => {
  assert.equal(judgeTiming(0), 'perfect')
  assert.equal(judgeTiming(-50), 'perfect')
  assert.equal(judgeTiming(51), 'good')
  assert.equal(judgeTiming(-150), 'ok')
  assert.equal(judgeTiming(151), null)
})

test('combo bonus, miss reset and hp clamps', () => {
  let s = NEW_STATS
  for (let i = 0; i < 10; i++) s = applyHit(s, 'perfect')
  assert.equal(s.score, 9 * 300 + 330)   // 10th hit gets +10%
  assert.equal(s.hp, 100)

  s = applyHit(s, 'miss')
  assert.deepEqual([s.combo, s.maxCombo, s.hp, s.miss], [0, 10, 88, 1])

  for (let i = 0; i < 20; i++) s = applyHit(s, 'miss')
  assert.equal(s.hp, 0)
  assert.equal(grade(s), 'F')
})

test('accuracy and grade', () => {
  assert.equal(accuracy(NEW_STATS), 100)
  assert.equal(accuracy({ ...NEW_STATS, perfect: 1, miss: 1 }), 50)
  assert.equal(grade({ ...NEW_STATS, perfect: 19, good: 1 }), 'S')
  assert.equal(grade({ ...NEW_STATS, perfect: 1, miss: 1 }), 'D')
})
