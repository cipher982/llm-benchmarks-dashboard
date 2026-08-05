/**
 * WCAG contrast checker for the Console palette.
 *
 * Every text colour in the design system is checked against every background
 * it can land on — ground, panel surface, raised, and the table zebra stripe.
 * The old `textMute` sat at 3.0:1 against the ground and was used for 9px
 * all-caps micro labels, which is precisely the case AA exists for.
 *
 * Run with: node tests/contrast-checker.js
 * Exits non-zero if anything fails, so it can gate a build.
 */

// Convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Get relative luminance
function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

// Mirrors components/design-system/index.ts. Kept as literals so this file runs
// under plain node without a TypeScript step.
const BACKGROUNDS = {
    ground: '#0C0D0F',
    surface: '#101215',
    raised: '#16181C',
    zebra: '#0F1113',
};

const FOREGROUNDS = {
    text: '#DFE3E8',
    textDim: '#9AA3AD',
    textMute: '#7A828C',
    accent: '#7DD3C0',
    ok: '#5FD08A',
    warn: '#E5B95C',
    bad: '#F08573',
};

// Chart series need 3:1 against the ground: they are graphical objects, not
// text, so WCAG 1.4.11 applies rather than 1.4.3.
const SERIES_RAMP = [
    '#7DD3C0', '#E5B95C', '#8FB8F0', '#D89AD4', '#7FD1E8',
    '#C6CF7A', '#F0A184', '#A6AEF2', '#6FCFA6', '#E8B0A0',
];

const TEXT_MIN = 4.5;      // WCAG AA, normal text
const GRAPHIC_MIN = 3.0;   // WCAG AA, non-text contrast

let failures = 0;

console.log('\nWCAG contrast report — Console palette\n');
console.log(`Text must clear ${TEXT_MIN}:1 on every background; series colours ${GRAPHIC_MIN}:1 on the ground.\n`);
console.log('─'.repeat(78));

for (const [fgName, fg] of Object.entries(FOREGROUNDS)) {
    const parts = [];
    let worst = Infinity;

    for (const [bgName, bg] of Object.entries(BACKGROUNDS)) {
        const ratio = getContrastRatio(fg, bg);
        worst = Math.min(worst, ratio);
        parts.push(`${bgName} ${ratio.toFixed(2)}`);
    }

    const passes = worst >= TEXT_MIN;
    if (!passes) failures++;
    console.log(`${passes ? 'PASS' : 'FAIL'}  ${fgName.padEnd(10)} ${fg}  ${parts.join('  ')}`);
}

console.log('─'.repeat(78));

SERIES_RAMP.forEach((colour, i) => {
    const ratio = getContrastRatio(colour, BACKGROUNDS.ground);
    const passes = ratio >= GRAPHIC_MIN;
    if (!passes) failures++;
    console.log(`${passes ? 'PASS' : 'FAIL'}  series[${i}]  ${colour}  ground ${ratio.toFixed(2)}`);
});

// Accent as a fill, with the ground colour as its ink — the pressed state of
// every control on the site.
const accentInk = getContrastRatio('#7DD3C0', '#0C0D0F');
if (accentInk < TEXT_MIN) failures++;
console.log('─'.repeat(78));
console.log(`${accentInk >= TEXT_MIN ? 'PASS' : 'FAIL'}  accent fill with ground ink  ${accentInk.toFixed(2)}`);

console.log('');
if (failures) {
    console.error(`${failures} contrast failure(s).`);
    process.exit(1);
}
console.log('All colours clear their threshold.\n');
