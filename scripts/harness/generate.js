#!/usr/bin/env node
const path = require('node:path');
const { loadManifest } = require('./lib/manifest');
const { renderAll } = require('./lib/render');
const { writeFileAtomic } = require('./lib/paths');

const root = path.resolve(__dirname, '../..');
const manifest = loadManifest(root);
const rendered = renderAll(root, manifest);

for (const [target, content] of rendered) {
  writeFileAtomic(root, target, content);
}

console.log(`Generated ${rendered.size} harness targets`);
