import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const mqaSh = path.join(repoRoot, '.claude', 'skills', 'emulator-verify', 'mqa.sh');

const APP_TOP = 'com.moneyapp.app/.MainActivity';
const LAUNCHER = 'com.google.android.apps.nexuslauncher';
const LAUNCHER_TOP = `${LAUNCHER}/.NexusLauncherActivity`;
const ESCAPED = 'left com.moneyapp.app and foregrounded';
const WAIT_TIMEOUT_MS = 15_000;

// agent-device 0.21.13's own messages: the press form from interaction2.js, the selector form from selector-runtime.js.
const AGENT_DEVICE_STUB = [
  '#!/usr/bin/env bash',
  'printf "%s\\n" "$*" >> "$STUB_DIR/agent-device.log"',
  'case "$1" in',
  '  press | find)',
  '    if [ "$STUB_AD" = pass ] && [ "$1" = press ]; then echo "Tapped (540, 960)"; exit 0; fi',
  '    if [ "$STUB_AD" = nomatch ]; then echo "Error (COMMAND_FAILED): No element matches $2" >&2; exit 1; fi',
  '    target="$2"',
  '    if [ "$#" -eq 3 ] && [[ "$2" =~ ^[0-9]+$ ]] && [[ "$3" =~ ^[0-9]+$ ]]; then target="coordinate tap"; fi',
  '    echo "Error (COMMAND_FAILED): press $target left com.moneyapp.app and foregrounded com.google.android.apps.nexuslauncher. The tap likely escaped the app." >&2',
  '    exit 1 ;;',
  '  wait)',
  '    echo "Error (COMMAND_FAILED): wait failed because com.google.android.apps.nexuslauncher is foreground instead of com.moneyapp.app." >&2',
  '    exit 1 ;;',
  '  *) exit 1 ;;',
  'esac',
  '',
].join('\n');

const ADB_STUB = [
  '#!/usr/bin/env bash',
  'printf "%s\\n" "$*" >> "$STUB_DIR/adb.log"',
  'case "$*" in',
  '  *"dumpsys activity activities"*)',
  '    if [ -n "$STUB_TOP" ]; then echo "  topResumedActivity=ActivityRecord{6f1e2a u0 $STUB_TOP t12}"; fi ;;',
  'esac',
  'exit 0',
  '',
].join('\n');

type AgentDeviceMode = 'escaped' | 'nomatch' | 'pass';

interface Scenario {
  args: string[];
  top: string;
  ad?: AgentDeviceMode;
  timeoutMs?: number;
}

const stubDirs: string[] = [];

function writeStub(dir: string, name: string, body: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
  return file;
}

function logLines(dir: string, name: string): string[] {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
}

function run({ args, top, ad = 'escaped', timeoutMs = 10_000 }: Scenario) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma189-mqa-'));
  stubDirs.push(dir);
  const bin = path.join(dir, 'bin');
  const leases = path.join(dir, 'leases');
  fs.mkdirSync(bin);
  fs.mkdirSync(leases);
  const agentDevice = writeStub(bin, 'agent-device', AGENT_DEVICE_STUB);
  writeStub(bin, 'adb', ADB_STUB);
  const inherited: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(inherited)) {
    if (key.startsWith('MQA_')) inherited[key] = undefined;
  }
  const r = spawnSync('bash', [mqaSh, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: {
      ...inherited,
      PATH: `${bin}${path.delimiter}${String(process.env.PATH)}`,
      MQA_UI: 'agent-device',
      MQA_SERIAL: 'emulator-5558',
      MQA_PORT: '8084',
      MQA_WORK: path.join(dir, 'work'),
      MQA_LEASE_DIR: leases,
      MQA_AGENT_DEVICE: agentDevice,
      STUB_DIR: dir,
      STUB_AD: ad,
      STUB_TOP: top,
    },
  });
  const stderrLines = r.stderr.split('\n').filter(Boolean);
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    presses: logLines(dir, 'agent-device.log').filter((call) => call.split(' ')[0] === 'press'),
    linesWith: (...needles: string[]) =>
      stderrLines.filter((line) => needles.every((needle) => line.includes(needle))),
  };
}

afterAll(() => {
  for (const dir of stubDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('mqa press under agent-device when its post-press check names the launcher', () => {
  it('(a) tap @e8 with the app in front counts the press with one line naming both reads', () => {
    const r = run({ args: ['tap', '@e8'], top: APP_TOP });

    expect(r.status).toBe(0);
    expect(r.presses).toHaveLength(1);
    const both = r.linesWith(LAUNCHER, APP_TOP);
    expect(both).toHaveLength(1);
    expect(both[0]).toMatch(/^mqa:/);
    expect(r.linesWith(LAUNCHER)).toHaveLength(1);
    expect(r.linesWith('COMMAND_FAILED')).toEqual([]);
  });

  it('(b) tapxy with the app in front counts the press with one line naming both reads', () => {
    const r = run({ args: ['tapxy', '540', '960'], top: APP_TOP });

    expect(r.status).toBe(0);
    expect(r.presses).toHaveLength(1);
    const both = r.linesWith(LAUNCHER, APP_TOP);
    expect(both).toHaveLength(1);
    expect(both[0]).toMatch(/^mqa:/);
    expect(r.linesWith(LAUNCHER)).toHaveLength(1);
    expect(r.linesWith('COMMAND_FAILED')).toEqual([]);
  });

  it('(c) tap @e8 fails as today when mqa also reads the launcher in front', () => {
    const r = run({ args: ['tap', '@e8'], top: LAUNCHER_TOP });

    expect(r.status).toBe(1);
    expect(r.linesWith(ESCAPED)).toHaveLength(1);
    expect(r.linesWith(LAUNCHER)).toHaveLength(1);
  });

  it('(d) tap @e8 fails as today when mqa reads no top activity', () => {
    const r = run({ args: ['tap', '@e8'], top: '' });

    expect(r.status).toBe(1);
    expect(r.linesWith(ESCAPED)).toHaveLength(1);
  });

  it('(e) tap @e8 fails as today on a miss that is not the foreground check, with the app in front', () => {
    const r = run({ args: ['tap', '@e8'], top: APP_TOP, ad: 'nomatch' });

    expect(r.status).toBe(1);
    expect(r.linesWith('No element matches @e8')).toHaveLength(1);
  });

  it('(f) tapxy fails as today when mqa also reads the launcher in front', () => {
    const r = run({ args: ['tapxy', '540', '960'], top: LAUNCHER_TOP });

    expect(r.status).toBe(1);
    expect(r.presses).toHaveLength(1);
    expect(r.linesWith(ESCAPED)).toHaveLength(1);
  });

  it('(i) tapxy that agent-device passes prints its stdout and nothing on stderr', () => {
    const r = run({ args: ['tapxy', '540', '960'], top: APP_TOP, ad: 'pass' });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Tapped (540, 960)');
    expect(r.stderr).toBe('');
    expect(r.presses).toHaveLength(1);
  });
});

describe('mqa wait under agent-device when agent-device blames another app in front', () => {
  it(
    '(g) a miss with the app in front still fails and names both reads in one line',
    () => {
      const r = run({
        args: ['wait', 'label="Name"', '1000'],
        top: APP_TOP,
        timeoutMs: WAIT_TIMEOUT_MS - 2_000,
      });

      expect(r.status).toBe(1);
      const both = r.linesWith(LAUNCHER, APP_TOP);
      expect(both).toHaveLength(1);
      expect(both[0]).toMatch(/^mqa:/);
    },
    WAIT_TIMEOUT_MS,
  );

  it(
    '(h) a miss with the launcher in front fails as today with one line naming the launcher',
    () => {
      const r = run({
        args: ['wait', 'label="Name"', '1000'],
        top: LAUNCHER_TOP,
        timeoutMs: WAIT_TIMEOUT_MS - 2_000,
      });

      expect(r.status).toBe(1);
      expect(r.linesWith(LAUNCHER)).toHaveLength(1);
    },
    WAIT_TIMEOUT_MS,
  );
});
