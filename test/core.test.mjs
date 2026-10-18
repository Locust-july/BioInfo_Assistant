import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { diagnostics, resolvePaths } from '../src/core.mjs';

test('custom storage remains separate from application files', () => {
  const custom = path.resolve('runtime', '用户数据');
  assert.equal(resolvePaths({ BIOINFO_ASSISTANT_DATA_DIR: custom }).dataRoot, custom);
});

test('reject relative custom storage', () => {
  assert.throws(() => resolvePaths({ BIOINFO_ASSISTANT_DATA_DIR: 'relative' }), /绝对路径/);
});

test('diagnostics do not claim unverified integration or analysis', () => {
  const result = diagnostics({});
  assert.equal(result.connection.status, 'unverified');
  assert.equal(result.analysisAvailable, false);
  assert.deepEqual(result.adapters, []);
});
