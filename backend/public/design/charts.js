/**
 * Chart geometry shared by the Phase 1 bake-off variants.
 *
 * These return SVG markup with no colours of their own — every stroke and fill
 * resolves through `currentColor` or a CSS custom property, so each variant
 * restyles the same geometry from its own stylesheet. That keeps the comparison
 * about design rather than about who got a nicer chart implementation.
 */

export async function loadData() {
  const res = await fetch('./data.json');
  return res.json();
}

const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/**
 * Ridgeline: one normalised density curve per model, sorted, overlapping.
 * Replaces ~120 KDE curves stacked in a single frame.
 */
export function ridgeline(
  ridge,
  { width = 720, rowHeight = 26, overlap = 2.1, labelWidth = 0, colorFor = null } = {},
) {
  const rows = ridge.rows;
  const w = width - labelWidth;
  const amp = rowHeight * overlap;
  const height = rowHeight * rows.length + amp;

  const body = rows
    .map((row, i) => {
      const baseY = amp + i * rowHeight;
      // Trim the near-zero tails. Drawing them produces a flat rule across the
      // full width of every row, which reads as chart furniture rather than data.
      const [lo, hi] = support(row.curve, 0.025);
      const pts = row.curve.slice(lo, hi + 1).map((y, j) => [
        labelWidth + ((lo + j) / (row.curve.length - 1)) * w,
        baseY - y * amp,
      ]);
      const x0 = pts[0][0];
      const x1 = pts[pts.length - 1][0];
      const area = `${path(pts)}L${x1.toFixed(1)} ${baseY}L${x0.toFixed(1)} ${baseY}Z`;
      const meanX = labelWidth + Math.min(row.mean / ridge.xMax, 1) * w;
      // A variant may map row position onto a sequential ramp; otherwise every
      // stroke stays on currentColor and the stylesheet decides.
      const tint = colorFor ? `;--c:${colorFor(i, rows.length)}` : '';
      return `<g class="ridge-row" data-provider="${row.provider}" style="--i:${i};--n:${rows.length}${tint}">
        <path class="ridge-area" d="${area}"/>
        <path class="ridge-line" d="${path(pts)}"/>
        <circle class="ridge-mean" cx="${meanX.toFixed(1)}" cy="${baseY.toFixed(1)}" r="2"/>
      </g>`;
    })
    .reverse() // draw slowest first so faster rows sit in front
    .join('');

  const step = ridge.xMax > 400 ? 100 : ridge.xMax > 150 ? 50 : 25;
  const ticks = Array.from({ length: Math.floor(ridge.xMax / step) + 1 }, (_, i) => i * step)
    .filter((t) => t <= ridge.xMax)
    .map((t) => {
      const x = labelWidth + (t / ridge.xMax) * w;
      // The first and last labels would be half-clipped by the plot edge if
      // they stayed centred on their tick.
      const anchor = t === 0 ? 'start' : x > labelWidth + w - 12 ? 'end' : 'middle';
      return `<g class="ridge-tick"><line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${height}"/>
        <text x="${x.toFixed(1)}" y="${height + 14}" style="text-anchor:${anchor}">${t}</text></g>`;
    })
    .join('');

  return `<svg class="chart ridge" viewBox="0 0 ${width} ${height + 22}" width="100%" role="img"
    aria-label="Throughput distribution by model, fastest at top">
    <g class="ridge-ticks">${ticks}</g>${body}</svg>`;
}

/** First and last index whose normalised density clears `eps`. */
function support(curve, eps) {
  let lo = curve.findIndex((y) => y > eps);
  let hi = curve.length - 1 - [...curve].reverse().findIndex((y) => y > eps);
  if (lo < 0) return [0, curve.length - 1];
  return [Math.max(0, lo - 1), Math.min(curve.length - 1, hi + 1)];
}

/**
 * Labels for a ridgeline, emitted as HTML so they stay selectable text.
 * The same model name appears under several providers, so the provider is part
 * of the label rather than an afterthought.
 */
export function ridgeLabels(ridge, { rowHeight = 26, overlap = 2.1 } = {}) {
  const amp = rowHeight * overlap;
  return ridge.rows
    .map(
      (row, i) => `<li style="top:${(amp + i * rowHeight - 7).toFixed(1)}px">
        <span class="rl-model">${row.model} <i>${row.provider}</i></span>
        <span class="rl-mean"><b>${row.mean}</b> tok/s</span>
      </li>`,
    )
    .join('');
}

/**
 * Small-multiples grid: one cell per model on a shared y-scale.
 * Replaces 22 stacked full-width charts.
 */
export function smallMultiples(series, { cellWidth = 210, cellHeight = 64 } = {}) {
  const all = series.models.flatMap((m) => m.values).filter((v) => v != null);
  const yMax = Math.max(...all) * 1.08;

  return series.models
    .map((m) => {
      const vals = m.values;
      const pts = vals
        .map((v, i) => [(i / (vals.length - 1)) * cellWidth, cellHeight - (v / yMax) * cellHeight])
        .filter((_, i) => vals[i] != null);
      const mean = vals.filter((v) => v != null).reduce((a, b) => a + b, 0) / vals.filter((v) => v != null).length;
      const meanY = cellHeight - (mean / yMax) * cellHeight;
      const area = `${path(pts)}L${cellWidth} ${cellHeight}L0 ${cellHeight}Z`;
      return `<figure class="sm-cell" data-provider="${m.provider}">
        <figcaption>
          <span class="sm-model">${m.model}</span>
          <span class="sm-provider">${m.provider}</span>
          <span class="sm-value">${mean.toFixed(0)}<i>tok/s</i></span>
        </figcaption>
        <svg class="chart sm" viewBox="0 0 ${cellWidth} ${cellHeight}" width="100%" preserveAspectRatio="none"
          role="img" aria-label="${m.model} throughput over the window, mean ${mean.toFixed(0)} tokens per second">
          <line class="sm-mean" x1="0" y1="${meanY.toFixed(1)}" x2="${cellWidth}" y2="${meanY.toFixed(1)}"/>
          <path class="sm-area" d="${area}"/>
          <path class="sm-line" d="${path(pts)}"/>
        </svg>
      </figure>`;
    })
    .join('');
}

/** Inline trend mark for a table row. */
export function sparkline(values, { width = 88, height = 18, yMax } = {}) {
  const clean = values.filter((v) => v != null);
  if (clean.length < 2) return '';
  const max = yMax ?? Math.max(...clean);
  const min = Math.min(...clean);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => [(i / (values.length - 1)) * width, height - ((v - min) / span) * height])
    .filter((_, i) => values[i] != null);
  return `<svg class="chart spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
    <path class="spark-line" d="${path(pts)}"/></svg>`;
}

/**
 * Min–mean–max strip on a shared scale. Puts the distribution inside the table
 * row instead of in a separate chart, which is the whole premise of variant B.
 */
export function rangeStrip(row, { scaleMax, width = 200, height = 14 } = {}) {
  const x = (v) => Math.max(0, Math.min(1, v / scaleMax)) * width;
  const mid = height / 2;
  return `<svg class="chart range" viewBox="0 0 ${width} ${height}" width="100%" height="${height}"
    preserveAspectRatio="none" role="img"
    aria-label="${row.min} to ${row.max} tokens per second, mean ${row.mean}">
    <line class="rg-track" x1="0" y1="${mid}" x2="${width}" y2="${mid}"/>
    <line class="rg-span" x1="${x(row.min).toFixed(1)}" y1="${mid}" x2="${x(row.max).toFixed(1)}" y2="${mid}"/>
    <circle class="rg-mean" cx="${x(row.mean).toFixed(1)}" cy="${mid}" r="3"/>
  </svg>`;
}

/**
 * Throughput against consistency, one dot per model. Fast and steady sits
 * bottom-right; the top of the plot is where a provider is quick on average but
 * not reliably so — which the ranked table cannot show.
 */
export function scatter(points, { width = 360, height = 210, pad = 28, stateOf } = {}) {
  const xMax = Math.max(...points.map((p) => p.x)) * 1.05;
  const yMax = Math.max(...points.map((p) => p.y)) * 1.05;
  const px = (v) => pad + (v / xMax) * (width - pad - 8);
  const py = (v) => height - pad - (v / yMax) * (height - pad - 10);

  const xt = niceTicks(xMax, 4);
  const yt = niceTicks(yMax, 3);

  const grid =
    xt
      .map(
        (t) => `<line class="sc-grid" x1="${px(t).toFixed(1)}" y1="8" x2="${px(t).toFixed(1)}" y2="${height - pad}"/>
      <text class="sc-ax" x="${px(t).toFixed(1)}" y="${height - pad + 13}" style="text-anchor:middle">${t}</text>`,
      )
      .join('') +
    yt
      .map(
        (t) => `<line class="sc-grid" x1="${pad}" y1="${py(t).toFixed(1)}" x2="${width - 8}" y2="${py(t).toFixed(1)}"/>
      <text class="sc-ax" x="${pad - 5}" y="${(py(t) + 3).toFixed(1)}" style="text-anchor:end">${t}</text>`,
      )
      .join('');

  const dots = points
    .map(
      (p) =>
        `<circle class="sc-dot" data-state="${stateOf ? stateOf(p) : ''}" cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="2.6"><title>${p.m} · ${p.p} · ${p.x} tok/s · ${p.y}% spread</title></circle>`,
    )
    .join('');

  return `<svg class="chart sc" viewBox="0 0 ${width} ${height}" width="100%" role="img"
    aria-label="Mean throughput against spread, one point per model">
    ${grid}${dots}</svg>`;
}

function niceTicks(max, count) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) * mag;
  const out = [];
  for (let t = step; t < max; t += step) out.push(Math.round(t));
  return out;
}

/** Deterministic pseudo-series so every table row can carry a trend mark. */
export function seriesFor(series, model) {
  const hit = series.models.find((m) => m.model === model);
  return hit ? hit.values : null;
}

export const fmt = {
  int: (n) => (n == null ? '—' : Math.round(n).toLocaleString()),
  dec: (n, d = 1) => (n == null ? '—' : n.toFixed(d)),
  pct: (n) => (n == null ? '—' : `${n.toFixed(0)}%`),
  date: (iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
};
