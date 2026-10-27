import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const mqaSh = path.join(repoRoot, '.claude', 'skills', 'emulator-verify', 'mqa.sh');

const APP = 'com.moneyapp.app';
const SYSTEM_UI = 'com.android.systemui';
const CLOCK = '12:34';
const HIDDEN = 'Delete commitment';
const APP_LABELS = ['Groceries', 'EGP 1,250', 'Add commitment'];
const SCROLL_PX = 240;
const SPAWN_TIMEOUT_MS = 10_000;
const MULTI_RUN_TIMEOUT_MS = 30_000;

const AGENT_DEVICE_STUB = [
  '#!/usr/bin/env bash',
  'printf "%s\\n" "$*" >> "$STUB_DIR/agent-device.log"',
  'case "$1" in',
  '  snapshot) cat "$STUB_SNAP"; exit 0 ;;',
  '  *) exit 1 ;;',
  'esac',
  '',
].join('\n');

const ADB_STUB = [
  '#!/usr/bin/env bash',
  'printf "%s\\n" "$*" >> "$STUB_DIR/adb.log"',
  'exit 0',
  '',
].join('\n');

interface SnapshotNode {
  ref: string;
  index: number;
  depth: number;
  type: string;
  label?: string;
  bundleId: string;
  visibleToUser?: boolean;
  rect: { x: number; y: number; width: number; height: number };
}

const SCREEN: SnapshotNode[] = [
  {
    ref: 'e1',
    index: 0,
    depth: 0,
    type: 'android.widget.TextView',
    label: CLOCK,
    bundleId: SYSTEM_UI,
    rect: { x: 42, y: 0, width: 120, height: 63 },
  },
  {
    ref: 'e2',
    index: 1,
    depth: 0,
    type: 'android.widget.TextView',
    label: APP_LABELS[0],
    bundleId: APP,
    rect: { x: 42, y: 420, width: 600, height: 60 },
  },
  {
    ref: 'e3',
    index: 2,
    depth: 0,
    type: 'android.widget.TextView',
    label: APP_LABELS[1],
    bundleId: APP,
    rect: { x: 700, y: 420, width: 338, height: 60 },
  },
  {
    ref: 'e4',
    index: 3,
    depth: 0,
    type: 'android.widget.Button',
    label: APP_LABELS[2],
    bundleId: APP,
    rect: { x: 42, y: 1600, width: 996, height: 132 },
  },
  {
    ref: 'e5',
    index: 4,
    depth: 0,
    type: 'android.view.ViewGroup',
    bundleId: APP,
    rect: { x: 0, y: 300, width: 1080, height: 1400 },
  },
  {
    ref: 'e6',
    index: 5,
    depth: 0,
    type: 'android.widget.TextView',
    label: HIDDEN,
    bundleId: APP,
    visibleToUser: false,
    rect: { x: 42, y: 1900, width: 600, height: 60 },
  },
];

const SCROLLED: SnapshotNode[] = SCREEN.map((node) =>
  node.bundleId === APP ? { ...node, rect: { ...node.rect, y: node.rect.y - SCROLL_PX } } : node,
);

const stubDirs: string[] = [];

function writeStub(dir: string, name: string, body: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
  return file;
}

function writeSnapshot(nodes: SnapshotNode[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma264-snap-'));
  stubDirs.push(dir);
  const file = path.join(dir, 'snapshot.json');
  const doc = { success: true, data: { appName: 'MoneyApp', appBundleId: APP, nodes } };
  fs.writeFileSync(file, JSON.stringify(doc));
  return file;
}

function run(args: string[], snapshot: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma264-mqa-'));
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
    timeout: SPAWN_TIMEOUT_MS,
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
      STUB_SNAP: snapshot,
    },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function boxLines(stdout: string): string[] {
  return stdout.split('\n').filter((line) => line.startsWith('~: '));
}

function classAndLabel(line: string): [string, string] {
  const m = /^~: (\S+) label='([^']*)'/.exec(line);
  return m ? [m[1], m[2]] : ['', line];
}

afterAll(() => {
  for (const dir of stubDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("mqa's box read under agent-device when the snapshot's first node is the status-bar clock", () => {
  const screen = writeSnapshot(SCREEN);

  it("bounds '~' prints one line per node in the snapshot, the clock and every app node among them", () => {
    const r = run(['bounds', '~'], screen);

    expect(r.status).toBe(0);
    expect(boxLines(r.stdout).map(classAndLabel)).toEqual(
      SCREEN.map((node) => [node.type.split('.').pop(), node.label ?? '']),
    );
  });

  it("read '~' prints the clock's line and no app node's label", () => {
    const r = run(['read', '~'], screen);

    expect(r.status).toBe(0);
    const lines = r.stdout.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`label='${CLOCK}'`);
    for (const label of [...APP_LABELS, HIDDEN]) expect(r.stdout).not.toContain(label);
  });

  it("a node the user cannot see is in bounds '~' and absent from the unscoped read", () => {
    const box = run(['bounds', '~'], screen);
    const listing = run(['read'], screen);

    expect(box.status).toBe(0);
    expect(boxLines(box.stdout).filter((line) => line.includes(`label='${HIDDEN}'`))).toHaveLength(
      1,
    );
    expect(listing.status).toBe(0);
    for (const label of APP_LABELS) expect(listing.stdout).toContain(JSON.stringify(label));
    expect(listing.stdout).not.toContain(HIDDEN);
  });

  it(
    "a scroll that moves every app node changes bounds '~' and leaves read '~' unchanged",
    () => {
      const scrolled = writeSnapshot(SCROLLED);
      const before = boxLines(run(['bounds', '~'], screen).stdout);
      const again = boxLines(run(['bounds', '~'], screen).stdout);
      const after = boxLines(run(['bounds', '~'], scrolled).stdout);
      const scopedBefore = run(['read', '~'], screen).stdout;
      const scopedAfter = run(['read', '~'], scrolled).stdout;

      expect(before).toHaveLength(SCREEN.length);
      expect(again).toEqual(before);
      expect(after).toHaveLength(SCREEN.length);
      expect(after[0]).toBe(before[0]);
      for (let i = 1; i < SCREEN.length; i++) expect(after[i]).not.toBe(before[i]);
      expect(scopedBefore).toContain(`label='${CLOCK}'`);
      expect(scopedAfter).toBe(scopedBefore);
    },
    MULTI_RUN_TIMEOUT_MS,
  );
});
