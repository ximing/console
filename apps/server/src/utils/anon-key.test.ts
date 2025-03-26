import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildAnonKey, resolveLikeActor } from './anon-key.js';

test('buildAnonKey is deterministic and salt-sensitive', () => {
  const a = buildAnonKey('1.2.3.4', 'UA', 's1');
  assert.equal(a, buildAnonKey('1.2.3.4', 'UA', 's1'));
  assert.notEqual(a, buildAnonKey('1.2.3.4', 'UA', 's2'));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('resolveLikeActor prefers visitor over anon', () => {
  assert.deepEqual(resolveLikeActor('u123', 'anon'), { field: 'visitorId', value: 'u123' });
  assert.deepEqual(resolveLikeActor(null, 'anon'), { field: 'anonKey', value: 'anon' });
});
