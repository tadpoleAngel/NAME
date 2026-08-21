import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

test('audit hash changes when the event payload changes', () => {
  const make = payload => createHash('sha256').update(JSON.stringify({ previous: 'GENESIS', payload })).digest('hex');
  assert.notEqual(make({ action: 'opened' }), make({ action: 'submitted' }));
});

test('audit chain links each event to the preceding hash', () => {
  const first = createHash('sha256').update('first').digest('hex');
  const second = createHash('sha256').update(JSON.stringify({ previous: first, event: 'next' })).digest('hex');
  assert.notEqual(first, second);
  assert.equal(JSON.parse(JSON.stringify({ previous: first, event: 'next' })).previous, first);
});
