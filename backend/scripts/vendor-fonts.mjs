#!/usr/bin/env node
/**
 * Vendors the site's typefaces into `fonts/` so the build is hermetic.
 *
 * `next/font/google` resolves families by fetching CSS from fonts.googleapis.com
 * and the woff2 files from fonts.gstatic.com *during `next build`*. A fetch
 * failure there is a build error, not a warning — so a deploy host without
 * egress to Google, or one Google rate-limits, turns a previously offline
 * build into a hard failure. The Docker builder installs fresh every time and
 * carries no `.next/cache`, so every image build was a cold fetch.
 *
 * The files this writes are committed. Re-run it only to change weights or
 * refresh the faces:
 *
 *     node scripts/vendor-fonts.mjs
 *
 * IBM Plex is OFL-1.1, which permits redistribution; `fonts/OFL.txt` carries
 * the licence alongside the binaries.
 */

import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../fonts');

// A current Chrome UA is what makes Google Fonts serve woff2 rather than ttf.
const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const FAMILIES = [
    { css: 'IBM+Plex+Sans:wght@400;500;600', file: 'IBMPlexSans' },
    { css: 'IBM+Plex+Mono:wght@400;500;600', file: 'IBMPlexMono' },
];

const LICENCE_URL = 'https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt';

await fs.mkdir(OUT_DIR, { recursive: true });

for (const family of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${family.css}&display=swap`;
    const css = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => {
        if (!r.ok) throw new Error(`${url} -> ${r.status}`);
        return r.text();
    });

    // Only the latin subset. The site is English and every other subset is dead
    // weight in the image and in the repo.
    const blocks = css.split('/*').filter((b) => b.startsWith(' latin '));
    if (!blocks.length) throw new Error(`no latin subset for ${family.css}`);

    const seen = new Map();

    for (const block of blocks) {
        const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
        const src = block.match(/src:\s*url\((https:[^)]+\.woff2)\)/)?.[1];
        if (!weight || !src) continue;

        const bytes = Buffer.from(await fetch(src).then((r) => r.arrayBuffer()));
        const digest = createHash('md5').update(bytes).digest('hex');

        // Google serves IBM Plex Sans as one variable file for every requested
        // weight and IBM Plex Mono as three static ones. Writing per-weight
        // copies of a variable font would triple the payload for nothing, so
        // dedupe by content: identical bytes become a single `-var` file that
        // `_app.tsx` declares with a weight range.
        const existing = seen.get(digest);
        const name = existing ?? `${family.file}-${weight}.woff2`;
        if (existing) {
            const varName = `${family.file}-var.woff2`;
            if (existing !== varName) {
                await fs.rename(path.join(OUT_DIR, existing), path.join(OUT_DIR, varName));
                seen.set(digest, varName);
                console.log(`${varName.padEnd(28)} variable, replaces ${existing}`);
            }
            continue;
        }

        seen.set(digest, name);
        await fs.writeFile(path.join(OUT_DIR, name), bytes);
        console.log(`${name.padEnd(28)} ${(bytes.length / 1024).toFixed(1)}kB`);
    }
}

const licence = await fetch(LICENCE_URL).then((r) => (r.ok ? r.text() : null));
if (licence) {
    await fs.writeFile(path.join(OUT_DIR, 'OFL.txt'), licence);
    console.log('OFL.txt');
}
