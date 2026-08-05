#!/usr/bin/env node
/**
 * Builds the data extract the Phase 1 bake-off mocks render from.
 *
 * The mocks use real benchmark output rather than placeholder values so the
 * comparison is about design decisions and not about how flattering the fake
 * numbers are. Reads the same static file the live site serves.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'public/api/processed-14days.json');
const OUT = path.join(ROOT, 'public/design/data.json');

const RIDGE_MODELS = 22;
const RIDGE_POINTS = 72;
const SERIES_MODELS = 12;
const SERIES_POINTS = 84;

const raw = JSON.parse(await fs.readFile(SRC, 'utf8'));

// Ridgeline: fastest models first, each density curve resampled onto a shared grid.
const ridgeSource = raw.speedDistribution
  .filter((d) => d.density_points?.length && d.mean_tokens_per_second > 0)
  .sort((a, b) => b.mean_tokens_per_second - a.mean_tokens_per_second)
  .slice(0, RIDGE_MODELS);

// Domain is set by where the data actually stops carrying mass. A fixed round
// number leaves a third of the plot empty, which reads as a rendering bug.
const xMax = Math.ceil(
  Math.max(
    ...ridgeSource.map((d) => {
      const peak = Math.max(...d.density_points.map((p) => p.y));
      const tail = d.density_points.filter((p) => p.y > peak * 0.02);
      return tail.length ? tail[tail.length - 1].x : d.max_tokens_per_second;
    }),
  ) / 10,
) * 10;

const ridge = ridgeSource
  .map((d) => ({
    model: d.display_name || d.model_name,
    provider: d.provider,
    mean: round(d.mean_tokens_per_second),
    min: round(d.min_tokens_per_second),
    max: round(d.max_tokens_per_second),
    curve: resample(d.density_points, xMax, RIDGE_POINTS),
  }));

// Time series: one line per model, most-benchmarked first, tail of the window.
const series = raw.timeSeries.models
  .map((m) => {
    const p = m.providers[0];
    return {
      model: m.display_name || m.model_name,
      provider: p.provider,
      values: p.values.slice(-SERIES_POINTS).map((v) => (v == null ? null : round(v))),
    };
  })
  .filter((m) => m.values.filter((v) => v != null).length > SERIES_POINTS * 0.6)
  .sort((a, b) => avg(b.values) - avg(a.values))
  .slice(0, SERIES_MODELS);

const timestamps = raw.timeSeries.timestamps.slice(-SERIES_POINTS);

const table = raw.table
  .filter((r) => r.tokens_per_second_mean > 0)
  .sort((a, b) => b.tokens_per_second_mean - a.tokens_per_second_mean)
  .map((r) => ({
    provider: r.provider,
    model: r.model_name,
    mean: round(r.tokens_per_second_mean),
    min: round(r.tokens_per_second_min),
    max: round(r.tokens_per_second_max),
    ttft: r.time_to_first_token_mean == null ? null : round(r.time_to_first_token_mean, 3),
    spread: round(
      ((r.tokens_per_second_max - r.tokens_per_second_min) / r.tokens_per_second_mean) * 100,
    ),
  }));

const sampleCount = new Map(
  raw.timeSeries.models.flatMap((m) =>
    m.providers.map((p) => [
      `${p.provider}/${m.display_name || m.model_name}`,
      p.values.slice(-SERIES_POINTS).filter((v) => v != null).length,
    ]),
  ),
);
for (const r of table) r.n = sampleCount.get(`${r.provider}/${r.model}`) ?? null;

// Per-provider aggregates. This is the panel that used to reprint the same
// three leader figures the meter strip already carried.
const providers = [...new Set(table.map((r) => r.provider))]
  .map((name) => {
    const rows = table.filter((r) => r.provider === name);
    const ttfts = rows.map((r) => r.ttft).filter((v) => v != null);
    return {
      name,
      models: rows.length,
      median: round(pct(rows.map((r) => r.mean), 50)),
      p90: round(pct(rows.map((r) => r.mean), 90)),
      best: round(Math.max(...rows.map((r) => r.mean))),
      spread: round(pct(rows.map((r) => r.spread), 50)),
      ttft: ttfts.length ? round(pct(ttfts, 50), 2) : null,
    };
  })
  .sort((a, b) => b.median - a.median);

const allMeans = table.map((r) => r.mean);
const overall = {
  samples: table.reduce((a, r) => a + (r.n ?? 0), 0),
  median: round(pct(allMeans, 50)),
  p90: round(pct(allMeans, 90)),
  max: round(Math.max(...allMeans)),
  medianSpread: round(pct(table.map((r) => r.spread), 50)),
  medianTtft: round(pct(table.map((r) => r.ttft).filter((v) => v != null), 50), 2),
};

const payload = {
  generatedFrom: path.basename(SRC),
  window: { from: timestamps[0], to: timestamps.at(-1), points: timestamps.length },
  counts: { models: table.length, providers: providers.length },
  overall,
  leaders: {
    fastest: table.slice(0, 5),
    lowestTtft: table
      .filter((r) => r.ttft != null)
      .sort((a, b) => a.ttft - b.ttft)
      .slice(0, 5),
    mostStable: table
      .filter((r) => r.mean > 20)
      .sort((a, b) => a.spread - b.spread)
      .slice(0, 5),
  },
  ridge: { xMax, points: RIDGE_POINTS, rows: ridge },
  series: { timestamps, models: series },
  table: table.slice(0, 40),
  // Every model, trimmed to what the throughput-vs-consistency scatter plots.
  scatter: table.map((r) => ({ p: r.provider, m: r.model, x: r.mean, y: r.spread })),
  providers,
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(payload));

const kb = Math.round((await fs.stat(OUT)).size / 1024);
console.log(
  `${OUT} — ${kb}kB · ${ridge.length} ridge rows · ${series.length} series · ${payload.table.length} table rows`,
);

/** Resample an irregular density curve onto an evenly spaced grid of `n` points. */
function resample(pts, max, n) {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * max;
    const j = sorted.findIndex((p) => p.x >= x);
    if (j <= 0) {
      out.push(j === 0 ? sorted[0].y : 0);
      continue;
    }
    const a = sorted[j - 1];
    const b = sorted[j];
    const t = (x - a.x) / (b.x - a.x || 1);
    out.push(a.y + t * (b.y - a.y));
  }
  const peak = Math.max(...out) || 1;
  return out.map((y) => round(y / peak, 3)); // normalised per row: ridgelines compare shape
}

/** Nearest-rank percentile. */
function pct(vals, p) {
  const v = [...vals].filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return 0;
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];
}

function avg(vals) {
  const v = vals.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function round(n, dp = 1) {
  return Number(n.toFixed(dp));
}
