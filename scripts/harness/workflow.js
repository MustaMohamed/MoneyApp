const path = require('node:path');
const { runCli } = require('./lib/workflow/cli');

void runCli({
  root: path.resolve(__dirname, '../..'),
  argv: process.argv.slice(2),
}).then((code) => {
  process.exitCode = code;
});
