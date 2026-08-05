#!/usr/bin/env node
/**
 * Downloads the bake-off typefaces and emits @font-face rules with the woff2
 * inlined as data URIs.
 *
 * The presentation page is published as an Artifact, where a strict CSP blocks
 * every external host including font CDNs. A linked webfont there fails
 * silently and the whole comparison collapses onto one system fallback — which
 * would make five typographic directions look like one.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../.design/fonts.css');

// A current Chrome UA is what makes Google Fonts serve woff2 + unicode-range.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const FAMILIES = [
  'Archivo:wght@400;500;600',
  'Spline+Sans+Mono:wght@400;500',
  'Familjen+Grotesk:wght@400;600;700',
  'Fragment+Mono:wght@400',
  'Martian+Mono:wght@400;500',
  'IBM+Plex+Sans:wght@400;500;600',
  'IBM+Plex+Mono:wght@400;500',
  'Newsreader:wght@400;500;600',
];

// Every glyph the five mocks can set. Google Fonts subsets to exactly this,
// which is the difference between ~900kB of base64 and something shippable.
const GLYPHS = [
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '0123456789',
  ' .,:;!?\'"`()[]{}<>/\\|-_=+*&^%$#@~',
  '·—–…↑↓→←°×',
].join('');

const css = await Promise.all(FAMILIES.map(fetchFamily));
const blocks = css.join('\n').match(/@font-face\s*\{[^}]*\}/g) ?? [];

// A variable family serves every requested weight from one file, so the same
// URL comes back once per weight. Emit one rule per distinct file with a weight
// range covering the group — otherwise the same base64 payload is repeated
// three times over and the page triples in size for nothing.
const groups = new Map();
for (const rule of blocks) {
  const url = rule.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) continue;
  const family = rule.match(/font-family:\s*'([^']+)'/)?.[1];
  const weight = Number(rule.match(/font-weight:\s*(\d+)/)?.[1] ?? 400);
  const stretch = rule.match(/font-stretch:\s*([^;]+);/)?.[1]?.trim();
  const g = groups.get(url) ?? { family, stretch, weights: [] };
  g.weights.push(weight);
  groups.set(url, g);
}

let total = 0;
const out = [];
for (const [url, g] of groups) {
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  total += bytes.length;
  const lo = Math.min(...g.weights);
  const hi = Math.max(...g.weights);
  out.push(
    `@font-face{font-family:'${g.family}';font-style:normal;` +
      `font-weight:${lo === hi ? lo : `${lo} ${hi}`};` +
      (g.stretch ? `font-stretch:${g.stretch};` : '') +
      `font-display:swap;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2')}`,
  );
}

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, out.join('\n'));

const result = await fs.stat(OUT);
console.log(
  `${OUT}\n  ${out.length} faces · ${Math.round(total / 1024)}kB woff2 · ${Math.round(result.size / 1024)}kB base64`,
);

async function fetchFamily(spec) {
  const url =
    `https://fonts.googleapis.com/css2?family=${spec}` +
    `&text=${encodeURIComponent(GLYPHS)}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${spec}: ${res.status}`);
  return res.text();
}
