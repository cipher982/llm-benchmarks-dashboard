#!/usr/bin/env node
/**
 * Assembles the five bake-off variants into one self-contained page.
 *
 * Each variant keeps its own stylesheet, so they are mounted into separate
 * shadow roots — five sheets that all style `table`, `h1` and `.wrap` would
 * otherwise overwrite one another. Fonts are declared once at document level,
 * since @font-face is document-scoped and reaches into every shadow root.
 *
 *   node scripts/design/build-gallery.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, '.design/gallery.html');

const VARIANTS = [
  {
    id: 'a', name: 'Readout',
    thesis: 'Panels and charts carry the page. Closest to Modal: neutral ground, one accent used only where a value is being emphasised, whitespace as the structure.',
    signature: 'Tick-rule section breaks · ridgeline with a label rail · accent bar under the mean column',
    type: 'Archivo + Spline Sans Mono',
  },
  {
    id: 'b', name: 'Ledger',
    thesis: 'The table is the page. Closest to OpenRouter: no panels, no borders, no accent colour at all — rules and typographic hierarchy do everything.',
    signature: 'Two-column ranked list · min·mean·max strip inside each row · green/red deltas as the only colour',
    type: 'Familjen Grotesk + Fragment Mono',
  },
  {
    id: 'c', name: 'Trace',
    thesis: 'One signature image, made of the data itself, then hard editorial scale contrast underneath. The riskiest and the most memorable.',
    signature: 'Full-bleed ridgeline on a warm sequential ramp · 76px numerals · hairline everything else',
    type: 'Archivo (variable width) + Martian Mono',
  },
  {
    id: 'd', name: 'Console',
    thesis: 'It is a monitoring instrument, so it should look like one. Mono-dominant, zero marketing voice, maximum information per screen.',
    signature: 'Status bar · six-up meter strip · status chips in the table · 11 columns of data',
    type: 'IBM Plex Sans + IBM Plex Mono',
  },
  {
    id: 'e', name: 'Broadsheet',
    thesis: 'Authority through editorial structure. Charts become numbered exhibits with written captions that say what the reader should take from them.',
    signature: 'Serif headline and drop cap · captioned exhibits · muted gold accent',
    type: 'Newsreader + Archivo + Spline Sans Mono',
  },
];

/**
 * Rewrites a standalone page's stylesheet to work inside a shadow root.
 *
 * `:root`, `html` and `body` select the document element, which a shadow
 * stylesheet can never match — so every custom property declared there goes
 * undefined, `var()` falls back to nothing, and each variant silently inherits
 * the shell's colours instead of its own. `:host` is the shadow-tree equivalent.
 */
function scopeCss(css) {
  return (
    ':host{box-sizing:border-box;display:block}\n' +
    css.replace(/(^|[},])(\s*)(?::root|html|body)(\s*\{)/g, '$1$2:host$3')
  );
}

const fonts = await fs.readFile(path.join(ROOT, '.design/fonts.css'), 'utf8');
const data = await fs.readFile(path.join(ROOT, 'public/design/data.json'), 'utf8');
const charts = await fs.readFile(path.join(ROOT, 'public/design/charts.js'), 'utf8');

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;

/** Strip the module wrapper so the variant's script can run from a plain tag. */
function inlineScript(src) {
  return src
    .match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replace(/^\s*import\s+\{[\s\S]*?\}\s+from\s+'\.\/charts\.js';/m, '')
    .replace(/const d = await loadData\(\);/, 'const d = DATA;');
}

const chartsBody = charts
  .replace(/export\s+(async\s+)?function/g, '$1function')
  .replace(/export\s+const/g, 'const')
  .replace(/export\s+async\s+function\s+loadData[\s\S]*?\n}\n/, '');

// Single-variant mode: the chosen direction, published as the page itself with
// no comparison chrome around it. Styles stay at document scope, so `:root`,
// `html` and `body` selectors work as written.
if (only) {
  const src = await fs.readFile(path.join(ROOT, `public/design/${only}.html`), 'utf8');
  const page = `<title>llm-benchmarks.com — cloud</title>
<style>
${fonts}
${src.match(/<style>([\s\S]*?)<\/style>/)[1]}
</style>
${src.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '').trim()}
<script>
const DATA = ${data};
${chartsBody}
${inlineScript(src)}
</script>
`;
  const target = path.join(ROOT, '.design/console.html');
  await fs.writeFile(target, page);
  console.log(`${target} — ${Math.round((await fs.stat(target)).size / 1024)}kB · variant ${only}`);
  process.exit(0);
}

const stages = [];
for (const v of VARIANTS) {
  const src = await fs.readFile(path.join(ROOT, `public/design/${v.id}.html`), 'utf8');

  const style = scopeCss(src.match(/<style>([\s\S]*?)<\/style>/)[1]);
  const body = src.match(/<body>([\s\S]*?)<\/body>/)[1];
  const markup = body.replace(/<script[\s\S]*?<\/script>/g, '').trim();
  const script = src
    .match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replace(/^\s*import\s+\{[\s\S]*?\}\s+from\s+'\.\/charts\.js';/m, '')
    .replace(/const d = await loadData\(\);/, 'const d = DATA;');

  stages.push({ ...v, style, markup, script });
}

// Every variant script reaches for document.getElementById and nothing else, so
// the shadow root can stand in for `document` directly.
const chartsInline = charts
  .replace(/export\s+(async\s+)?function/g, '$1function')
  .replace(/export\s+const/g, 'const')
  .replace(/export\s+async\s+function\s+loadData[\s\S]*?\n}\n/, '');

const html = `<title>llm-benchmarks — five directions</title>
<style>
${fonts}

/* The shell is deliberately quiet and dark-only: it frames five dark mocks,
   and a light chrome around them would read as a rendering fault. */
:root {
  --shell-ground: #0F0F11;
  --shell-rail:   #17171A;
  --shell-rule:   #26262B;
  --shell-text:   #EDEDEB;
  --shell-dim:    #94948F;
  --shell-mute:   #66665F;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--shell-ground); color: var(--shell-text);
  font: 400 15px/1.5 'Archivo', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
}

.shell {
  position: sticky; top: 0; z-index: 20; background: var(--shell-rail);
  border-bottom: 1px solid var(--shell-rule);
}
.shell-in { max-width: 1440px; margin: 0 auto; padding: 14px 24px 0; }
.shell h1 { margin: 0 0 3px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.shell .lede { margin: 0 0 14px; font-size: 13px; color: var(--shell-mute); max-width: 78ch; }
.tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.tabs button {
  font: 500 13px 'Archivo', system-ui, sans-serif; color: var(--shell-dim);
  background: transparent; border: 1px solid var(--shell-rule); border-bottom: 0;
  padding: 9px 15px; cursor: pointer; border-radius: 5px 5px 0 0;
  display: flex; align-items: baseline; gap: 8px;
}
.tabs button:hover { color: var(--shell-text); background: #1E1E22; }
.tabs button[aria-selected="true"] {
  color: #0F0F11; background: var(--shell-text); border-color: var(--shell-text);
}
.tabs .key { font: 500 10px/1 'Spline Sans Mono', monospace; opacity: .55; letter-spacing: .06em; }
.tabs button:focus-visible { outline: 2px solid #7FA8FF; outline-offset: 2px; }

.about { max-width: 1440px; margin: 0 auto; padding: 18px 24px 20px;
  display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; align-items: start;
  border-bottom: 1px solid var(--shell-rule); }
.about p { margin: 0; font-size: 14.5px; line-height: 1.55; color: var(--shell-dim); max-width: 70ch; }
.about dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 7px 14px; font-size: 12px; }
.about dt { color: var(--shell-mute); font: 400 10px/1.6 'Spline Sans Mono', monospace;
  letter-spacing: .1em; text-transform: uppercase; }
.about dd { margin: 0; color: var(--shell-dim); }

.stage { display: none; }
.stage[data-active] { display: block; }

@media (max-width: 860px) {
  .about { grid-template-columns: 1fr; gap: 18px; }
  .shell .lede { display: none; }
}
@media (prefers-reduced-motion: no-preference) {
  .stage[data-active] { animation: fade .18s ease-out; }
  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
}
</style>

<header class="shell">
  <div class="shell-in">
    <h1>llm-benchmarks.com — five directions</h1>
    <p class="lede">The same page, built five ways, all rendering the real 14-day benchmark extract.
      Press 1–5 or use the tabs.</p>
    <div class="tabs" role="tablist" id="tabs"></div>
  </div>
</header>

<div class="about">
  <p id="thesis"></p>
  <dl>
    <dt>Type</dt><dd id="type"></dd>
    <dt>Signature</dt><dd id="signature"></dd>
  </dl>
</div>

<main id="stages"></main>

<script>
const DATA = ${data};

${chartsInline}

const VARIANTS = ${JSON.stringify(
  stages.map((s) => ({ id: s.id, name: s.name, thesis: s.thesis, signature: s.signature, type: s.type })),
)};

const SOURCES = {
${stages
  .map(
    (s) => `  ${s.id}: {
    css: ${JSON.stringify(s.style)},
    html: ${JSON.stringify(s.markup)},
    run: (document) => { ${s.script.replace(/<\/script>/g, '<\\/script>')} },
  }`,
  )
  .join(',\n')}
};

const tabs = document.getElementById('tabs');
const stagesEl = document.getElementById('stages');
const mounted = new Set();

VARIANTS.forEach((v, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.role = 'tab';
  b.id = 'tab-' + v.id;
  b.innerHTML = '<span class="key">' + (i + 1) + '</span>' + v.name;
  b.onclick = () => select(v.id);
  tabs.appendChild(b);

  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.id = 'stage-' + v.id;
  stage.attachShadow({ mode: 'open' });
  stagesEl.appendChild(stage);
});

function select(id) {
  const v = VARIANTS.find((x) => x.id === id);
  for (const b of tabs.children) b.setAttribute('aria-selected', b.id === 'tab-' + id);
  for (const s of stagesEl.children) s.toggleAttribute('data-active', s.id === 'stage-' + id);

  document.getElementById('thesis').textContent = v.thesis;
  document.getElementById('type').textContent = v.type;
  document.getElementById('signature').textContent = v.signature;

  if (!mounted.has(id)) {
    mounted.add(id);
    const root = document.getElementById('stage-' + id).shadowRoot;
    const src = SOURCES[id];
    root.innerHTML = '<style>' + src.css + '</style>' + src.html;
    try {
      src.run(root); // the shadow root stands in for the document
    } catch (err) {
      root.innerHTML = '<pre style="color:#E0705E;padding:24px;font:13px monospace">' + err + '</pre>';
    }
  }
  history.replaceState(null, '', '#' + id);
}

addEventListener('keydown', (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= VARIANTS.length && !e.metaKey && !e.ctrlKey) select(VARIANTS[n - 1].id);
});

select(VARIANTS.some((v) => v.id === location.hash.slice(1)) ? location.hash.slice(1) : 'a');
</script>
`;

await fs.writeFile(OUT, html);
console.log(`${OUT} — ${Math.round((await fs.stat(OUT)).size / 1024)}kB · ${stages.length} variants`);
