#!/usr/bin/env node
/**
 * Design screenshot pipeline.
 *
 * Captures every route at every viewport in three forms:
 *   full.png      native-resolution full-page capture (archive / human review)
 *   overview.png  half-scale full-page capture (whole-page composition at a glance)
 *   tiles/NN.png  viewport-sized slices with overlap, each labelled with the
 *                 nearest heading above it (readable by a vision model)
 *
 * Tiles exist because a vision model downscales any image whose long side is
 * over ~1568px. A 9000px-tall full-page screenshot arrives unreadable. Slicing
 * at native resolution keeps text legible while still covering the whole page.
 *
 * Usage:
 *   node scripts/design/shoot.mjs --label before
 *   node scripts/design/shoot.mjs --label after --routes cloud,status
 *   node scripts/design/shoot.mjs --base https://llm-benchmarks.com --label prod
 */

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const args = parseArgs(process.argv.slice(2));
const BASE = typeof args.base === 'string' ? args.base : 'http://localhost:3111';

/** Routes may be absolute URLs (external design references) or app-relative paths. */
const urlFor = (routePath) => (/^https?:\/\//.test(routePath) ? routePath : BASE + routePath);
const LABEL = args.label ?? 'current';
const OUT_ROOT = path.resolve(REPO_ROOT, '.design/shots', LABEL);
const TILE_OVERLAP = 60;
const SETTLE_MS = Number(args.settle ?? 1200);

// Frozen so any "updated 3 hours ago" style copy renders identically run to run.
const FROZEN_NOW = Date.parse('2026-01-15T12:00:00Z');

const BLOCKED_HOSTS = ['analytics.drose.io', 'www.googletagmanager.com', 'google-analytics.com'];

const KILL_MOTION = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
  /* Next.js dev error overlay and build indicator would otherwise cover the page. */
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dialog-overlay],
  #__next-build-watcher {
    display: none !important;
  }
`;

async function main() {
  const configPath = args.routesFile
    ? path.resolve(__dirname, args.routesFile)
    : path.join(__dirname, 'routes.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

  const routeFilter = args.routes ? new Set(args.routes.split(',')) : null;
  const viewportFilter = args.viewports ? new Set(args.viewports.split(',')) : null;

  const routes = config.routes.filter((r) => !routeFilter || routeFilter.has(r.id));
  const viewports = Object.entries(config.viewports).filter(
    ([name]) => !viewportFilter || viewportFilter.has(name),
  );

  await fs.rm(OUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(OUT_ROOT, { recursive: true });

  const browser = await chromium.launch();
  const manifest = { label: LABEL, base: BASE, capturedAt: new Date().toISOString(), shots: [] };

  for (const [viewportName, viewport] of viewports) {
    for (const route of routes) {
      const started = Date.now();
      try {
        const shot = await captureRoute(browser, { route, viewportName, viewport });
        manifest.shots.push(shot);
        console.log(
          `  ok   ${viewportName}/${route.id}  ${shot.pageHeight}px  ${shot.tiles.length} tiles  ${Date.now() - started}ms`,
        );
      } catch (err) {
        manifest.shots.push({ route: route.id, viewport: viewportName, error: err.message });
        console.log(`  FAIL ${viewportName}/${route.id}  ${err.message}`);
      }
    }
  }

  await browser.close();
  await fs.writeFile(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(OUT_ROOT, 'INDEX.md'), renderIndex(manifest));

  const failed = manifest.shots.filter((s) => s.error).length;
  console.log(`\n${manifest.shots.length - failed} captured, ${failed} failed -> ${OUT_ROOT}`);
  console.log(`review order: ${path.join(OUT_ROOT, 'INDEX.md')}`);
}

async function captureRoute(browser, { route, viewportName, viewport }) {
  const dir = path.join(OUT_ROOT, viewportName, route.id);
  await fs.mkdir(path.join(dir, 'tiles'), { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: args.scheme ?? 'light',
  });
  await context.addInitScript(freezeClock, FROZEN_NOW);
  await context.route('**/*', (r) => {
    const host = new URL(r.request().url()).hostname;
    return BLOCKED_HOSTS.some((h) => host.endsWith(h)) ? r.abort() : r.continue();
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));

  const response = await page.goto(urlFor(route.path), {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.addStyleTag({ content: KILL_MOTION });
  await settle(page, SETTLE_MS);

  const outline = await page.evaluate(collectOutline);
  const pageHeight = await page.evaluate(
    () => document.documentElement.scrollHeight || document.body.scrollHeight,
  );

  await page.screenshot({ path: path.join(dir, 'full.png'), fullPage: true, animations: 'disabled' });

  const tiles = [];
  const step = viewport.height - TILE_OVERLAP;
  for (let i = 0, y = 0; y < pageHeight; i++, y += step) {
    const height = Math.min(viewport.height, pageHeight - y);
    if (height < 40) break; // sliver at the bottom, already covered by overlap
    const label = nearestHeading(outline, y, y + height);
    const name = `${String(i + 1).padStart(2, '0')}-${slug(label)}.png`;
    await page.screenshot({
      path: path.join(dir, 'tiles', name),
      fullPage: true,
      animations: 'disabled',
      clip: { x: 0, y, width: viewport.width, height },
    });
    tiles.push({ file: path.join(viewportName, route.id, 'tiles', name), y, height, label });
  }

  await context.close();

  // Half-scale whole-page pass: composition and rhythm, not legibility.
  const smallCtx = await browser.newContext({
    viewport,
    deviceScaleFactor: 0.5,
    reducedMotion: 'reduce',
    colorScheme: args.scheme ?? 'light',
  });
  await smallCtx.addInitScript(freezeClock, FROZEN_NOW);
  const smallPage = await smallCtx.newPage();
  await smallPage.goto(urlFor(route.path), { waitUntil: 'networkidle', timeout: 60_000 });
  await smallPage.addStyleTag({ content: KILL_MOTION });
  await settle(smallPage, SETTLE_MS);
  await smallPage.screenshot({
    path: path.join(dir, 'overview.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await smallCtx.close();

  return {
    route: route.id,
    path: route.path,
    viewport: viewportName,
    status: response?.status() ?? null,
    pageHeight,
    dir: path.join(viewportName, route.id),
    full: path.join(viewportName, route.id, 'full.png'),
    overview: path.join(viewportName, route.id, 'overview.png'),
    tiles,
    outline,
    consoleErrors: consoleErrors.slice(0, 10),
  };
}

/** Wait for fonts, images and chart SVGs to stop changing. */
async function settle(page, ms) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(ms);
  await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.all(imgs.map((i) => new Promise((r) => (i.onload = i.onerror = r))));
  });
  await page.waitForTimeout(200);
}

/** Runs in the page. Returns heading text + vertical position for tile labelling. */
function collectOutline() {
  return [...document.querySelectorAll('h1, h2, h3, [role="heading"]')]
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 80),
        top: Math.round(rect.top + window.scrollY),
      };
    })
    .filter((h) => h.text)
    .sort((a, b) => a.top - b.top);
}

function freezeClock(fixedNow) {
  const RealDate = Date;
  const fixed = fixedNow;
  // eslint-disable-next-line no-global-assign
  Date = class extends RealDate {
    constructor(...a) {
      return a.length ? new RealDate(...a) : new RealDate(fixed);
    }
    static now() {
      return fixed;
    }
  };
  Date.parse = RealDate.parse;
  Date.UTC = RealDate.UTC;
}

function nearestHeading(outline, top, bottom) {
  const inside = outline.filter((h) => h.top >= top && h.top < bottom);
  if (inside.length) return inside[0].text;
  const above = outline.filter((h) => h.top < top);
  return above.length ? above[above.length - 1].text : 'top';
}

function slug(s) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'section'
  );
}

function renderIndex(manifest) {
  const lines = [
    `# Design shots: ${manifest.label}`,
    '',
    `base: ${manifest.base}`,
    `captured: ${manifest.capturedAt}`,
    '',
    'Read tiles in order for a full-page review. `overview.png` shows whole-page',
    'composition at half scale; `full.png` is the native-resolution archive.',
    '',
  ];
  for (const shot of manifest.shots) {
    if (shot.error) {
      lines.push(`## ${shot.viewport} / ${shot.route} — FAILED: ${shot.error}`, '');
      continue;
    }
    lines.push(
      `## ${shot.viewport} / ${shot.route} (${shot.path})`,
      `height ${shot.pageHeight}px · status ${shot.status}` +
        (shot.consoleErrors.length ? ` · ${shot.consoleErrors.length} console errors` : ''),
      '',
    );
    for (const t of shot.tiles) lines.push(`- \`${t.file}\` — y=${t.y} — ${t.label}`);
    lines.push('');
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else out[key] = next, i++;
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
