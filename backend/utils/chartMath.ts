/**
 * Pure geometry shared by the Console charts.
 *
 * Kept separate from the components so the maths is testable without a DOM and
 * so the ridgeline, the sparkline and the small multiples cannot drift apart in
 * how they resample, trim or scale.
 */

export interface DensityPoint {
    x: number;
    y: number;
}

/** SVG path `d` from a list of [x, y] pairs. */
export function toPath(points: Array<[number, number]>): string {
    return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
}

/**
 * Resample an irregular density curve onto an evenly spaced grid over
 * `[0, max]`, then normalise it to its own peak.
 *
 * Normalising per row is what makes a ridgeline readable: rows compare *shape*
 * and position, and a model with ten times the sample count would otherwise
 * flatten every other row against the axis.
 */
export function resampleDensity(points: DensityPoint[], max: number, n: number): number[] {
    if (!points.length || max <= 0) return new Array(n).fill(0);

    const sorted = [...points].sort((a, b) => a.x - b.x);
    const out: number[] = [];

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
    return out.map((y) => Number((y / peak).toFixed(3)));
}

/**
 * First and last index whose normalised density clears `eps`.
 *
 * Drawing the near-zero tails produces a flat rule across the full width of
 * every row, which reads as chart furniture rather than as data.
 */
export function support(curve: number[], eps = 0.025): [number, number] {
    const lo = curve.findIndex((y) => y > eps);
    if (lo < 0) return [0, curve.length - 1];
    const hi = curve.length - 1 - [...curve].reverse().findIndex((y) => y > eps);
    return [Math.max(0, lo - 1), Math.min(curve.length - 1, hi + 1)];
}

/** Where a single density curve stops carrying meaningful mass. */
function upperSupport(row: { density_points?: DensityPoint[]; max: number }): number {
    if (!row.density_points?.length) return row.max;
    const peak = Math.max(...row.density_points.map((p) => p.y));
    const tail = row.density_points.filter((p) => p.y > peak * 0.02);
    return tail.length ? tail[tail.length - 1].x : row.max;
}

/**
 * Upper bound of the shared x domain.
 *
 * The old chart fixed the axis at 0–140 and crammed everything above it into a
 * squeezed right-hand panel. Deriving the bound instead means one linear axis
 * with no break in it.
 *
 * Derived from where most rows stop, not where the widest one does. Taking the
 * maximum let a single very variable model set the scale for everyone else:
 * GPT-oss-safeguard-20b's density ran to 642 tok/s while the next widest
 * stopped at 357, so the axis went to 650 and twenty-one of twenty-two rows
 * were drawn inside the left half of the frame.
 *
 * The floor keeps every row's mean on the axis — a domain that hid the marker
 * for the fastest model would trade one unreadable chart for another.
 */
export function densityDomainMax(
    rows: Array<{ density_points?: DensityPoint[]; max: number; mean?: number }>,
): number {
    if (!rows.length) return 10;

    const bounds = rows.map(upperSupport);
    const bulk = percentile(bounds, 90);
    const meanFloor = Math.max(...rows.map((r) => r.mean ?? 0), 0) * 1.2;

    const domain = Math.max(bulk, meanFloor, 1);
    return Math.ceil(domain / 10) * 10;
}

/** How many rows carry mass past `domain`, for disclosure under the chart. */
export function rowsBeyondDomain(
    rows: Array<{ density_points?: DensityPoint[]; max: number }>,
    domain: number,
): number {
    return rows.filter((row) => upperSupport(row) > domain).length;
}

/** Nearest-rank percentile. Returns 0 for an empty set. */
export function percentile(values: Array<number | null | undefined>, p: number): number {
    const v = values.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return 0;
    return v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];
}

export function mean(values: Array<number | null | undefined>): number {
    const v = values.filter((x): x is number => x != null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** Round tick values below `max`, roughly `count` of them. */
export function niceTicks(max: number, count: number): number[] {
    if (!(max > 0)) return [];
    const raw = max / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 2.5, 5, 10].find((s) => s * magnitude >= raw) ?? 10) * magnitude;
    const out: number[] = [];
    for (let t = step; t < max; t += step) out.push(Math.round(t));
    return out;
}

/** Ticks from zero, inclusive of the domain end when it lands on one. */
export function axisTicks(max: number): number[] {
    const step = max > 400 ? 100 : max > 150 ? 50 : 25;
    const out: number[] = [];
    for (let t = 0; t <= max; t += step) out.push(t);
    return out;
}

/**
 * Run-to-run variation as a fraction of the mean. The column the site calls
 * "spread"; stated here once so the table, the scatter and the meter strip
 * cannot disagree about it.
 */
export function spreadPercent(min: number, mid: number, max: number): number | null {
    if (!Number.isFinite(mid) || mid <= 0) return null;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;
    return ((max - min) / mid) * 100;
}

export type StabilityState = 'steady' | 'variable' | 'unstable';

/**
 * Buckets for the spread column. The thresholds are wide because throughput
 * genuinely swings with provider load — the point of the bucket is to separate
 * "this number means something" from "this number is a coin flip".
 */
export function stabilityOf(spread: number | null | undefined): StabilityState {
    if (spread == null) return 'steady';
    if (spread > 180) return 'unstable';
    if (spread > 110) return 'variable';
    return 'steady';
}

export const fmt = {
    int: (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? '—' : Math.round(n).toLocaleString()),
    dec: (n: number | null | undefined, d = 1): string => (n == null || !Number.isFinite(n) ? '—' : n.toFixed(d)),
    pct: (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(0)}%`),
    date: (iso: string | number | Date | null | undefined): string =>
        iso == null ? '—' : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
};

/**
 * Slugs for a model, keyed by `provider/model` as those labels appear in the
 * chart data.
 *
 * Only the table rows carry `providerSlug` / `modelSlug` — the distribution and
 * time-series payloads do not. Rather than have each chart re-derive a slug
 * (and risk generating URLs that 404), the page builds this from the table it
 * already has and the charts only look up.
 */
export type SlugLookup = Map<string, { providerSlug: string; modelSlug: string }>;

export const slugKey = (provider: string, model: string): string => `${provider}/${model}`;
