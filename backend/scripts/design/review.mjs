#!/usr/bin/env node
/**
 * Builds a single scrollable HTML review page from one or two capture labels.
 *
 * The tiles produced by shoot.mjs are the unit a vision model reads. This is the
 * same material arranged for a person: every route, every tile, in order, with
 * an optional second label pinned alongside for before/after comparison.
 *
 * Usage:
 *   node scripts/design/review.mjs --label prod
 *   node scripts/design/review.mjs --label after --against prod
 *   node scripts/design/review.mjs --label refs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(__dirname, '../..', '.design/shots');

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(' ')
    .matchAll(/--(\w+)(?:[= ]([^-\s][^\s]*))?/g)
    .map((m) => [m[1], m[2] ?? true]),
);

const label = args.label ?? 'current';
const against = typeof args.against === 'string' ? args.against : null;

const manifest = await load(label);
const baseline = against ? await load(against) : null;

const out = path.join(SHOTS, `review-${label}${against ? `-vs-${against}` : ''}.html`);
await fs.writeFile(out, render());
console.log(`open ${out}`);

async function load(name) {
  const file = path.join(SHOTS, name, 'manifest.json');
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    throw new Error(`no capture named "${name}" — run shoot.mjs --label ${name} first`);
  }
}

function findBaseline(shot) {
  return baseline?.shots.find((s) => s.route === shot.route && s.viewport === shot.viewport);
}

function render() {
  const sections = manifest.shots
    .map((shot) => {
      if (shot.error) {
        return `<section><h2>${shot.viewport} / ${shot.route}</h2><p class="err">${esc(shot.error)}</p></section>`;
      }
      const base = findBaseline(shot);
      const rows = shot.tiles
        .map((t, i) => {
          const b = base?.tiles[i];
          const left = b
            ? `<figure><figcaption>${esc(against)}</figcaption><img loading="lazy" src="${rel(against, b.file)}"></figure>`
            : '';
          return `
        <div class="tile ${base ? 'pair' : 'solo'}">
          <div class="meta"><span class="n">${String(i + 1).padStart(2, '0')}</span> ${esc(t.label)} <span class="y">y=${t.y}</span></div>
          <div class="imgs">
            ${left}
            <figure><figcaption>${esc(label)}</figcaption><img loading="lazy" src="${rel(label, t.file)}"></figure>
          </div>
        </div>`;
        })
        .join('');
      return `
    <section id="${shot.viewport}-${shot.route}">
      <h2>${shot.viewport} / ${shot.route} <a href="${esc(manifest.base + shot.path)}">${esc(shot.path)}</a></h2>
      <p class="sub">${shot.pageHeight}px tall · ${shot.tiles.length} tiles${
        base ? ` · baseline ${base.pageHeight}px` : ''
      }${shot.consoleErrors?.length ? ` · <b class="err">${shot.consoleErrors.length} console errors</b>` : ''}</p>
      ${rows}
    </section>`;
    })
    .join('');

  const nav = manifest.shots
    .map((s) => `<a href="#${s.viewport}-${s.route}">${s.viewport}/${s.route}</a>`)
    .join('');

  return `<!doctype html>
<meta charset="utf-8">
<title>design review — ${esc(label)}${against ? ` vs ${esc(against)}` : ''}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0b0c0e; color:#e6e6e6;
         font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  header { position:sticky; top:0; z-index:5; background:#0b0c0edd; backdrop-filter:blur(8px);
           padding:12px 20px; border-bottom:1px solid #23262b; }
  header h1 { font-size:14px; margin:0 0 8px; font-weight:600; letter-spacing:.02em; }
  nav { display:flex; flex-wrap:wrap; gap:6px; }
  nav a { color:#9aa4b2; text-decoration:none; font-size:11px; padding:2px 7px;
          border:1px solid #23262b; border-radius:3px; }
  nav a:hover { color:#fff; border-color:#3d444d; }
  section { padding:36px 20px; border-bottom:1px solid #17191d; }
  h2 { font-size:15px; margin:0 0 2px; }
  h2 a { color:#6ea8fe; font-weight:400; font-size:12px; margin-left:8px; }
  .sub { color:#8b949e; font-size:11px; margin:0 0 20px; }
  .err { color:#ff7b72; }
  .tile { margin-bottom:28px; }
  .meta { color:#8b949e; font-size:11px; margin-bottom:6px; }
  .meta .n { color:#e6e6e6; }
  .meta .y { color:#4d545c; }
  .imgs { display:flex; gap:12px; }
  .tile.solo .imgs figure { max-width:1440px; }
  figure { margin:0; flex:1; min-width:0; }
  figcaption { color:#4d545c; font-size:10px; margin-bottom:4px; text-transform:uppercase; letter-spacing:.08em; }
  img { width:100%; height:auto; display:block; border:1px solid #23262b; background:#fff; }
</style>
<header>
  <h1>design review — ${esc(label)}${against ? ` vs ${esc(against)}` : ''} · ${esc(manifest.base)} · ${esc(manifest.capturedAt)}</h1>
  <nav>${nav}</nav>
</header>
${sections}
`;
}

function rel(lbl, file) {
  return `./${lbl}/${file.split(path.sep).join('/')}`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
