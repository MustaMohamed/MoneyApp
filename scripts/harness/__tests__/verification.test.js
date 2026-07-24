const assert = require('node:assert/strict');
const test = require('node:test');

const { runVerification } = require('../lib/verification');

void test('runs checks in order and stops at first failure', () => {
  const calls = [];
  const checks = [
    { id: 'format', local: ['npm', 'run', 'format:check'] },
    { id: 'lint', local: ['npm', 'run', 'lint'] },
    { id: 'typecheck', local: ['npm', 'run', 'typecheck'] },
  ];
  const result = runVerification('/repo', checks, {
    spawn(command, args) {
      calls.push([command, ...args]);
      return { status: command === 'npm' && args[1] === 'lint' ? 1 : 0 };
    },
    isDirectory() {
      return true;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.failedCheck, 'lint');
  assert.deepEqual(calls, [
    ['npm', 'run', 'format:check'],
    ['npm', 'run', 'lint'],
  ]);
});

void test('requires the registered generated directory', () => {
  const result = runVerification(
    '/repo',
    [{ id: 'prebuild', local: ['npx', 'expo', 'prebuild'], assertDirectory: 'android' }],
    { spawn: () => ({ status: 0 }), isDirectory: () => false },
  );

  assert.equal(result.failedCheck, 'prebuild');
});
