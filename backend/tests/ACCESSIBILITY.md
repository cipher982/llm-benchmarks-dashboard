# Accessibility Testing Setup

## Overview
Automated accessibility testing catches issues like poor color contrast, missing labels, and WCAG violations **before** they reach production.

## What This Catches

✅ **Color Contrast Issues** (like the blue-on-blue text bug)
✅ Missing form labels
✅ Keyboard navigation problems
✅ Missing alt text on images
✅ ARIA attribute errors
✅ Focus management issues

## Quick Start

### One-Time Setup
```bash
# Install Playwright browser (only needed once)
npx playwright install chromium
```

### Run Tests Locally
```bash
# Run all accessibility tests
npm run test:a11y

# Run with visual UI (see tests in browser)
npm run test:a11y:ui
```

**Note**: Tests will use your existing `.env` MongoDB connection or fall back to a mock connection string.

### What Gets Tested
- `/status` - Status page
- `/cloud` - Cloud benchmarks
- `/local` - Local benchmarks

Add more pages by editing `tests/accessibility.test.ts`.

## How It Works

### 1. Automated Testing (Playwright + axe-core)
The test suite:
1. Opens each page in a headless browser
2. Runs axe-core accessibility scanner
3. Checks for WCAG 2.1 Level AA violations
4. Reports any issues with line numbers and fix suggestions

### 2. CI/CD Integration
GitHub Actions automatically runs tests on:
- Every pull request
- Every push to main
- Will **fail the build** if violations found

### 3. Example Output

**Before fix (would have caught the bug):**
```
❌ Color contrast violations on Status Page:

- color-contrast: Elements must have sufficient color contrast
  Impact: serious
  HTML: <p style="color:#333333;background:#3B6EA5">Models currently...</p>
  Contrast ratio issue: Expected 4.5:1, got 2.1:1
```

**After fix:**
```
✅ All accessibility tests passed
```

## Adding New Pages to Test

Edit `tests/accessibility.test.ts`:

```typescript
const PAGES_TO_TEST = [
  { path: '/status', name: 'Status Page' },
  { path: '/cloud', name: 'Cloud Benchmarks' },
  { path: '/local', name: 'Local Benchmarks' },
  { path: '/your-new-page', name: 'Your Page' },  // ← Add here
];
```

## Manual Testing (Optional)

### Browser DevTools
1. Chrome: Lighthouse tab → Run audit → Accessibility score
2. Firefox: Accessibility Inspector
3. Edge: Issues tab → Accessibility

### Command Line (Fast)
```bash
# Install axe CLI globally
npm install -g @axe-core/cli

# Scan any page
axe http://localhost:3000/status
```

## WCAG Standards

We test for:
- **WCAG 2.1 Level A** (minimum)
- **WCAG 2.1 Level AA** (enhanced)

### Key Rules
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Form Labels**: Every input must have a label
- **Alt Text**: All images need descriptive alt text
- **ARIA**: Proper use of ARIA roles and attributes

## Fixing Common Issues

### 1. Color Contrast
**Problem**: Text hard to read on background

**Fix**: Use design system colors
```typescript
// ❌ Bad
color: '#333333',  // dark gray
backgroundColor: '#3B6EA5',  // blue

// ✅ Good
color: colors.primaryText,  // white (#FFFFFF)
backgroundColor: colors.background,  // blue
```

### 2. Missing Labels
**Problem**: Form inputs without labels

**Fix**: Add proper labels
```typescript
// ❌ Bad
<input type="text" placeholder="Name" />

// ✅ Good
<label htmlFor="name">Name</label>
<input id="name" type="text" />
```

### 3. Keyboard Navigation
**Problem**: Can't tab to button

**Fix**: Use semantic HTML
```typescript
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>
```

## Performance

- **Fast**: ~5-10 seconds per page
- **Parallel**: Runs multiple pages simultaneously
- **CI-friendly**: Caches browser binaries

## Troubleshooting

### Tests Won't Run
```bash
# Install Playwright browsers
npx playwright install chromium

# Update dependencies
npm install
```

### Port Already in Use
```bash
# Kill existing server
killall -9 node

# Or change port in playwright.config.ts
```

### False Positives
```typescript
// Disable specific rules if needed (rare)
const results = await new AxeBuilder({ page })
  .disableRules(['color-contrast'])  // Only if truly needed
  .analyze();
```

## Benefits

### Before This Setup
- ❌ Manual testing only
- ❌ Issues found by users
- ❌ Slow feedback loop
- ❌ Inconsistent checking

### After This Setup
- ✅ Automated on every commit
- ✅ Catches issues in CI
- ✅ Fast feedback (seconds)
- ✅ Consistent standards

## Resources

- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**This would have caught the status page contrast bug automatically!** 🎯
