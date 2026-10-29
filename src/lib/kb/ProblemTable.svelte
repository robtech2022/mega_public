<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEMS, splitTicket } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, n]) => `${ch} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports merged into #{ticket} ·
  <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'problem' : 'problems'} ·
  <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'ticket' : 'tickets'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr>
        <td>{g.problem === 'unplaced' ? 'no tenant on file' : PROBLEMS[g.problem].name} <code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td>{g.tenants}</td>
        <td class="small">{channels(g.channels)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if g.problem === 'unplaced'}none yet{:else}<a href={PROBLEMS[g.problem].issue}>#{PROBLEMS[g.problem].issue.split('/').pop()}</a>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="note">
  Counted the desk's way, where each report is filed: the <code>parser</code> count includes the
  {split.alsoParser} one-day moves, which the desk files under <code>parser</code> by tenant. They are counted again
  under <code>shift</code>, the problem they show. Counted once per report id: the export has {split.rows} rows for #{ticket}, {split.rows - split.merged.length} of them
  repeated from overlapping export pages. Intake tags are not used; they are a guess from the reporter's browser.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
</style>
