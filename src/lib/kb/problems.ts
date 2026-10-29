// The problems inside a merged ticket, one per fix. causes.ts says which bug a report's tenant and
// channel point to; the desk's own reading (desk-notes.json) says which reports are not that bug at all.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift';

export const PROBLEMS: Record<Problem, { name: string; issue: string }> = {
  parser: {
    name: 'Shared parser reads day-first dates month first',
    issue: 'https://github.com/robtech2022/mega_public/issues/1',
  },
  hint: {
    name: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    issue: 'https://github.com/robtech2022/mega_public/issues/2',
  },
  shift: {
    name: 'Dates move by one day (time zone conversion)',
    issue: 'https://github.com/robtech2022/mega_public/issues/3',
  },
};

// A one-day move is not a day/month swap, whatever the tenant: the desk read these apart, so they get their own problem.
export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem | 'unplaced' {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups };
}
