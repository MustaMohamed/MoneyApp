#!/usr/bin/env node
const path = require('node:path');
const { loadManifest } = require('./lib/manifest');
const { runVerification } = require('./lib/verification');

const root = path.resolve(__dirname, '../..');
const result = runVerification(root, loadManifest(root).verification.checks);
if (!result.ok) {
  console.error(`PR verification failed at ${result.failedCheck}`);
  process.exit(1);
}
console.log('CI parity green — safe to request push authorization');
