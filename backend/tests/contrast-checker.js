/**
 * WCAG Contrast Ratio Checker
 *
 * Verifies that all colors in our design system meet WCAG AA standards.
 * Run with: node tests/contrast-checker.js
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

// Test colors
const tableBackground = '#ECE9D8';  // Beige table background

const testCases = [
    // Links
    { name: 'Link (new)', fg: '#0A246A', bg: tableBackground },
    { name: 'Link (old)', fg: '#316AC5', bg: tableBackground },

    // Status badges
    { name: 'Active (new)', fg: '#1b5e20', bg: tableBackground },
    { name: 'Active (old)', fg: '#2e7d32', bg: tableBackground },
    { name: 'Monitor (new)', fg: '#6b4700', bg: tableBackground },
    { name: 'Monitor (old)', fg: '#f9a825', bg: tableBackground },
    { name: 'Stale (new)', fg: '#6b2900', bg: tableBackground },
    { name: 'Stale (old)', fg: '#ed6c02', bg: tableBackground },
    { name: 'Failing (new)', fg: '#b71c1c', bg: tableBackground },
    { name: 'Failing (old)', fg: '#d32f2f', bg: tableBackground },
    { name: 'Disabled (new)', fg: '#424242', bg: tableBackground },
    { name: 'Disabled (old)', fg: '#616161', bg: tableBackground },
];

console.log('\n🎨 WCAG Contrast Ratio Report\n');
console.log('Background:', tableBackground, '\n');
console.log('WCAG AA Standard: 4.5:1 for normal text, 3:1 for large text\n');
console.log('─'.repeat(70));

testCases.forEach(test => {
    const ratio = getContrastRatio(test.fg, test.bg);
    const passes = ratio >= 4.5;
    const icon = passes ? '✅' : '❌';
    const status = passes ? 'PASS' : 'FAIL';

    console.log(`${icon} ${test.name.padEnd(25)} ${test.fg} → ${ratio.toFixed(2)}:1 [${status}]`);
});

console.log('─'.repeat(70));
