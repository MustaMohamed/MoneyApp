import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { resolvePaymentDayDistance } from '@/modules/commitments/domain/payment_day_distance';
import { calendarDaysBetween } from '@/utils/year_month';

const TODAY = '2026-10-23';

// Jest hands each file a copy of `process.env`, so a TZ set here never moves V8's zone; a child node started under TZ does.
const CHILD_PRELUDE = `
const ts = require(${JSON.stringify(require.resolve('typescript'))});
const fs = require('fs');
const path = require('path');
const Module = require('module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const mapped = request.startsWith('@/') ? path.join(${JSON.stringify(path.resolve(__dirname, '../src'))}, request.slice(2)) : request;
  return resolve.call(this, mapped, ...rest);
};
require.extensions['.ts'] = (module, file) => {
  const options = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
  module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: options }).outputText, file);
};
const offsetAt = (day) => new Date(day + 'T12:00:00').getTimezoneOffset();
`;

/** Runs `body`, a JS function expression over `require` and `offsetAt`, in a node started under `zone`; returns its JSON result. */
function runInZone(zone: string, body: string): unknown {
  const output = execFileSync(
    process.execPath,
    ['-e', `${CHILD_PRELUDE}\nprocess.stdout.write(JSON.stringify((${body})()));`],
    { env: { ...process.env, TZ: zone }, encoding: 'utf8' },
  );
  return JSON.parse(output);
}

// Each zone changes its clocks between `before` and `after`, so a gap read from local midnights is off by the hour there.
const CLOCK_CHANGES = [
  {
    zone: 'America/New_York',
    before: '2026-03-07',
    after: '2026-03-09',
    gaps: [
      ['2026-03-07', '2026-03-09', 2],
      ['2026-03-08', '2026-03-09', 1],
      ['2026-10-31', '2026-11-02', 2],
    ],
  },
  {
    zone: 'Africa/Cairo',
    before: '2026-04-23',
    after: '2026-04-25',
    gaps: [
      ['2026-04-23', '2026-04-25', 2],
      ['2026-04-24', '2026-04-25', 1],
      ['2026-04-25', '2026-04-23', -2],
    ],
  },
] as const;

function payment(
  due_date: string,
  dates: { paid_date?: string; skipped_date?: string } = {},
): { due_date: string; paid_date: string | null; skipped_date: string | null } {
  return {
    due_date,
    paid_date: dates.paid_date ?? null,
    skipped_date: dates.skipped_date ?? null,
  };
}

describe('calendarDaysBetween', () => {
  it('is 0 on the same day', () => {
    expect(calendarDaysBetween('2026-10-23', '2026-10-23')).toBe(0);
  });

  it('is positive forward and negative backward', () => {
    expect(calendarDaysBetween('2026-10-20', '2026-10-23')).toBe(3);
    expect(calendarDaysBetween('2026-10-23', '2026-10-20')).toBe(-3);
  });

  it('counts across a month end', () => {
    expect(calendarDaysBetween('2026-01-31', '2026-03-01')).toBe(29);
    expect(calendarDaysBetween('2026-04-30', '2026-05-31')).toBe(31);
    expect(calendarDaysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('counts the leap day in a leap year only', () => {
    expect(calendarDaysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(calendarDaysBetween('2027-02-28', '2027-03-01')).toBe(1);
  });

  it.each(CLOCK_CHANGES)(
    'counts whole calendar days across a clock change in $zone',
    ({ zone, before, after, gaps }) => {
      const result = runInZone(
        zone,
        `() => {
          const { calendarDaysBetween } = require('@/utils/year_month');
          const gaps = ${JSON.stringify(gaps)};
          return {
            clockChanged: offsetAt('${before}') !== offsetAt('${after}'),
            days: gaps.map(([from, to]) => calendarDaysBetween(from, to)),
          };
        }`,
      );

      expect(result).toEqual({ clockChanged: true, days: gaps.map(([, , days]) => days) });
    },
  );

  it('counts a gap of years', () => {
    expect(calendarDaysBetween('2023-01-02', '2026-01-01')).toBe(1095);
  });
});

describe('resolvePaymentDayDistance', () => {
  it('counts an unpaid row from its due day to today, positive once past due', () => {
    expect(resolvePaymentDayDistance(payment('2026-10-20'), TODAY)).toEqual({
      settlement: 'unpaid',
      days: 3,
    });
  });

  it('reads 0 on an unpaid row due today', () => {
    expect(resolvePaymentDayDistance(payment(TODAY), TODAY)).toEqual({
      settlement: 'unpaid',
      days: 0,
    });
  });

  it('reads negative on an unpaid row due after today', () => {
    expect(resolvePaymentDayDistance(payment('2026-10-25'), TODAY)).toEqual({
      settlement: 'unpaid',
      days: -2,
    });
  });

  it('counts a paid row from its due day to its paid day, whatever today is', () => {
    const late = payment('2026-10-01', { paid_date: '2026-10-04' });

    expect(resolvePaymentDayDistance(late, TODAY)).toEqual({ settlement: 'paid', days: 3 });
    expect(resolvePaymentDayDistance(late, '2027-01-15')).toEqual({ settlement: 'paid', days: 3 });
  });

  it('reads negative on a row paid before its due day and 0 on one paid on it', () => {
    expect(
      resolvePaymentDayDistance(payment('2026-10-01', { paid_date: '2026-09-28' }), TODAY),
    ).toEqual({ settlement: 'paid', days: -3 });
    expect(
      resolvePaymentDayDistance(payment('2026-10-01', { paid_date: '2026-10-01' }), TODAY),
    ).toEqual({ settlement: 'paid', days: 0 });
  });

  it('counts a skipped row from its due day to its skipped day, whatever today is', () => {
    const skipped = payment('2026-10-01', { skipped_date: '2026-10-05' });

    expect(resolvePaymentDayDistance(skipped, TODAY)).toEqual({ settlement: 'skipped', days: 4 });
    expect(resolvePaymentDayDistance(skipped, '2026-12-01')).toEqual({
      settlement: 'skipped',
      days: 4,
    });
    expect(
      resolvePaymentDayDistance(payment('2026-10-25', { skipped_date: '2026-10-23' }), TODAY),
    ).toEqual({ settlement: 'skipped', days: -2 });
  });

  it('reads a row with both a paid and a skipped day as paid, from its paid day', () => {
    const both = payment('2026-10-01', { paid_date: '2026-10-02', skipped_date: '2026-10-09' });

    expect(resolvePaymentDayDistance(both, TODAY)).toEqual({ settlement: 'paid', days: 1 });
  });

  it('counts an unpaid row across a month end and the leap day', () => {
    expect(resolvePaymentDayDistance(payment('2026-01-31'), '2026-03-01')).toEqual({
      settlement: 'unpaid',
      days: 29,
    });
    expect(resolvePaymentDayDistance(payment('2028-02-28'), '2028-03-01')).toEqual({
      settlement: 'unpaid',
      days: 2,
    });
    expect(resolvePaymentDayDistance(payment('2027-03-01'), '2027-02-28')).toEqual({
      settlement: 'unpaid',
      days: -1,
    });
  });

  it.each(CLOCK_CHANGES)(
    'counts whole calendar days across a clock change in $zone',
    ({ zone, before, after }) => {
      const result = runInZone(
        zone,
        `() => {
          const { resolvePaymentDayDistance } = require('@/modules/commitments/domain/payment_day_distance');
          return [
            resolvePaymentDayDistance({ due_date: '${before}', paid_date: null, skipped_date: null }, '${after}'),
            resolvePaymentDayDistance({ due_date: '${before}', paid_date: '${after}', skipped_date: null }, '2026-12-31'),
            resolvePaymentDayDistance({ due_date: '${before}', paid_date: null, skipped_date: '${after}' }, '2026-12-31'),
          ];
        }`,
      );

      expect(result).toEqual([
        { settlement: 'unpaid', days: 2 },
        { settlement: 'paid', days: 2 },
        { settlement: 'skipped', days: 2 },
      ]);
    },
  );
});
