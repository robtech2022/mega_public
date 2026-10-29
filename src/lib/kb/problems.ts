// The problems inside a merged ticket, one per fix. causes.ts says which bug a report's tenant and
// channel point to; the desk's own reading (desk-notes.json) says which reports are not that bug at all.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift';

// State from engineering's update on #4471 (closed 05 Oct 2026). A problem it did not mention is still open.
export const PROBLEMS: Record<Problem, { name: string; issue: string; state: string }> = {
  parser: {
    name: 'Shared parser reads day-first dates month first',
    issue: 'https://github.com/robtech2022/mega_public/issues/1',
    state: 'fixed · fix(dates): parse dd/mm for eu locales',
  },
  hint: {
    name: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    issue: 'https://github.com/robtech2022/mega_public/issues/2',
    state: "won't fix · booking-v3 form retired",
  },
  shift: {
    name: 'Dates move by one day (time zone conversion)',
    issue: 'https://github.com/robtech2022/mega_public/issues/3',
    state: 'open · not covered by the #4471 fix',
  },
};

// Counted the desk's way (CauseTable): every report under the cause its tenant and channel point to.
// A one-day move is a problem of its own, but the desk files those reports by tenant too, so they are
// counted where they are filed and again, on their own, under `shift`.
export function problemOf(r: Report, t: Tenant | undefined): Problem | 'unplaced' {
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
): { rows: number; merged: Report[]; groups: ProblemGroup[]; alsoParser: number } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r));
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) by.set('shift', moved);
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
  const alsoParser = moved.filter((r) => problemOf(r, tenantOf(r)) === 'parser').length;
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups, alsoParser };
}
