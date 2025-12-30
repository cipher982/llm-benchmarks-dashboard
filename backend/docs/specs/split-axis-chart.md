# Split-Axis Speed Distribution Chart

**Status:** Completed (2025-12-30)
**Priority:** Medium
**Complexity:** Medium-High

## Problem Statement

The speed distribution chart has a visualization tension:

1. **~90% of models** cluster in the 0-140 tok/s range with meaningful variance
2. **Speed leaders** (Groq, Cerebras) reach 200-400 tok/s

Currently, we cap at 140 tok/s which hides the speed leaders entirely. Removing the cap compresses the main cluster and hides variance. We need both.

### Current Data (as of 2025-12-30)

```
Models >140 tok/s:
- groq/llama-3.1-8b: 277 tok/s
- cerebras/qwen-3-32b: 270 tok/s
- cerebras/gpt-oss-120b: 240 tok/s
- cerebras/llama-3.3-70b: 226 tok/s
- groq/llama-3.3-70b: 220 tok/s
- groq/qwen-3-32b: 214 tok/s
- cerebras/llama-3.1-8b: 198 tok/s
- groq/llama-4-maverick: 197 tok/s
- cerebras/qwen-3-235b-instruct: 159 tok/s
- together/llama-3.1-8b: 150 tok/s

Max observed: 277 tok/s
```

---

## Solution: Two-Panel Split Axis

Render **two adjacent plot regions** that share a y-scale:

```
┌────────────────────────────────┬──┬─────────────┐
│                                │  │             │
│   Left Panel (0-140)           │gap│ Right Panel │
│   ~75% width                   │  │  (140-300)  │
│   Where most models live       │//│  ~20% width │
│                                │  │ Speed leaders│
│                                │  │             │
├────────────────────────────────┴──┴─────────────┤
│ 0    20    40    60    80   100  120  140    200   250   300 │
│         "Common Range"                    "Leaders"          │
└──────────────────────────────────────────────────────────────┘
```

### Why This Works

- **Preserves readability** in 0-140 range (most variance visible)
- **Shows speed leaders** visually (not just text)
- **Explicit break** makes scale change impossible to miss (not deceptive)
- **Shared y-scale** keeps density heights comparable

---

## Implementation Details

### File: `components/charts/cloud/SpeedDistChart.tsx`

### 1. Geometry Constants

```typescript
const BREAKPOINT = 140;        // Where to split
const LEFT_RATIO = 0.75;       // Left panel gets 75% of width
const GAP = 14;                // Pixel gap between panels
const RIGHT_MAX = 300;         // Right panel max (round up from 277)

// Computed widths
const leftWidth = Math.round((width - GAP) * LEFT_RATIO);
const rightWidth = width - leftWidth - GAP;
```

### 2. Two X-Scales (Shared Y-Scale)

```typescript
// Left panel: 0-140 tok/s
const xLeft = d3.scaleLinear()
    .domain([0, BREAKPOINT])
    .range([0, leftWidth]);

// Right panel: 140-300 tok/s
const xRight = d3.scaleLinear()
    .domain([BREAKPOINT, RIGHT_MAX])
    .range([leftWidth + GAP, width]);

// Shared Y scale (density)
const y = d3.scaleLinear()
    .domain([0, maxDensity * 1.1])
    .range([height, 0]);
```

### 3. Split Density Points at Breakpoint

Each model's KDE curve must be split into left/right segments. Insert an interpolated point at exactly x=140 so curves end cleanly at the boundary.

```typescript
interface Point { x: number; y: number; }

function splitAtBreakpoint(points: Point[], breakX: number): { left: Point[]; right: Point[] } {
    const left: Point[] = [];
    const right: Point[] = [];

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.x < breakX) {
            left.push(p);
        } else if (p.x > breakX) {
            right.push(p);
        } else {
            // Exactly at breakpoint - add to both
            left.push(p);
            right.push(p);
        }
    }

    // If no exact breakpoint, interpolate one
    const hasExactBreak = points.some(p => p.x === breakX);
    if (!hasExactBreak && left.length > 0 && right.length > 0) {
        // Find segment that crosses breakpoint
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const b = points[i];
            if (a.x < breakX && b.x > breakX) {
                const t = (breakX - a.x) / (b.x - a.x);
                const interpolatedY = a.y + t * (b.y - a.y);
                const breakPoint = { x: breakX, y: interpolatedY };
                left.push(breakPoint);
                right.unshift(breakPoint);
                break;
            }
        }
    }

    return { left, right };
}
```

### 4. Two Line Generators

```typescript
const lineLeft = d3.line<Point>()
    .x(p => xLeft(p.x))
    .y(p => y(p.y))
    .curve(d3.curveBasis);

const lineRight = d3.line<Point>()
    .x(p => xRight(p.x))
    .y(p => y(p.y))
    .curve(d3.curveBasis);
```

### 5. Clip Paths (Two Regions)

```typescript
// Left clip region
svg.append("defs")
    .append("clipPath")
    .attr("id", "clip-left")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", leftWidth)
    .attr("height", height);

// Right clip region
svg.append("defs")
    .append("clipPath")
    .attr("id", "clip-right")
    .append("rect")
    .attr("x", leftWidth + GAP)
    .attr("y", 0)
    .attr("width", rightWidth)
    .attr("height", height);
```

### 6. Draw Break Indicator

Add visual break markers between panels:

```typescript
// Break indicator (diagonal lines)
const breakX = leftWidth + GAP / 2;
svg.append("g")
    .attr("class", "break-indicator")
    .selectAll("line")
    .data([
        { y1: height - 10, y2: height + 5 },
        { y1: height - 5, y2: height + 10 }
    ])
    .enter()
    .append("line")
    .attr("x1", breakX - 4)
    .attr("x2", breakX + 4)
    .attr("y1", d => d.y1)
    .attr("y2", d => d.y2)
    .style("stroke", theme.palette.text.secondary)
    .style("stroke-width", 1.5);
```

### 7. Two X-Axes

```typescript
// Left axis (0-140)
svg.append("g")
    .attr("class", "axis axis-left")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xLeft).ticks(7));

// Right axis (140-300)
svg.append("g")
    .attr("class", "axis axis-right")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xRight).ticks(4));
```

### 8. Panel Labels

```typescript
// "Common Range" label
svg.append("text")
    .attr("class", "panel-label")
    .attr("x", leftWidth / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", theme.palette.text.secondary)
    .text("Common Range (0-140)");

// "Speed Leaders" label
svg.append("text")
    .attr("class", "panel-label")
    .attr("x", leftWidth + GAP + rightWidth / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", theme.palette.text.secondary)
    .text("⚡ Speed Leaders");
```

### 9. Optional: Subtle Background Tint for Right Panel

```typescript
svg.append("rect")
    .attr("class", "right-panel-bg")
    .attr("x", leftWidth + GAP)
    .attr("y", 0)
    .attr("width", rightWidth)
    .attr("height", height)
    .style("fill", theme.palette.action.hover)
    .style("opacity", 0.3);
```

### 10. Drawing Density Paths (Modified)

```typescript
data.forEach((modelData, index) => {
    if (!modelData.density_points) return;

    const { left, right } = splitAtBreakpoint(modelData.density_points, BREAKPOINT);

    // Style setup (same as current)
    const isDeprecated = modelData.deprecated;
    const strokeColor = isDeprecated ? '#999999' : getProviderColor(theme, modelData.provider);
    const strokeWidth = isDeprecated ? 1.5 : 2;
    const strokeDasharray = isDeprecated ? '5,5' : 'none';
    const opacity = isDeprecated ? 0.5 : 1;

    // Draw left segment (if has points)
    if (left.length > 1) {
        svg.append("path")
            .datum(left)
            .attr("class", "density-path density-left")
            .attr("d", lineLeft)
            .attr("clip-path", "url(#clip-left)")
            .style("fill", "none")
            .style("stroke", strokeColor)
            .style("stroke-width", strokeWidth)
            .style("stroke-dasharray", strokeDasharray)
            .style("opacity", opacity);
    }

    // Draw right segment (if has points)
    if (right.length > 1) {
        svg.append("path")
            .datum(right)
            .attr("class", "density-path density-right")
            .attr("d", lineRight)
            .attr("clip-path", "url(#clip-right)")
            .style("fill", "none")
            .style("stroke", strokeColor)
            .style("stroke-width", strokeWidth)
            .style("stroke-dasharray", strokeDasharray)
            .style("opacity", opacity);
    }

    // Label placement: use max density point, place in appropriate panel
    const allPoints = [...left, ...right];
    const maxPoint = allPoints.reduce((prev, curr) => prev.y > curr.y ? prev : curr);
    const labelX = maxPoint.x <= BREAKPOINT ? xLeft(maxPoint.x) : xRight(maxPoint.x);

    svg.append("text")
        .attr("class", "model-label")
        .attr("x", labelX)
        .attr("y", y(maxPoint.y))
        .attr("dx", "0.5em")
        .attr("dy", "-0.5em")
        .style("fill", strokeColor)
        .style("font-size", "12px")
        .text(modelData.display_name);
});
```

---

## Data Pipeline Change

### File: `utils/dataProcessing.ts` (line ~374)

**Before:**
```typescript
tokens_per_second: d.tokens_per_second.filter(val => val <= 140)
```

**After:**
```typescript
tokens_per_second: d.tokens_per_second  // No filter - split-axis chart handles all data
```

---

## Testing Checklist

- [ ] Left panel shows 0-140 range with good variance visibility
- [ ] Right panel shows 140-300 range with speed leaders
- [ ] Gap/break indicator clearly visible
- [ ] Both panels share same y-scale (density heights comparable)
- [ ] KDE curves split cleanly at 140 (no visual artifacts)
- [ ] Labels appear in correct panel
- [ ] Tooltips work on both panels
- [ ] Legend still works
- [ ] Deprecated models still show dashed/grey
- [ ] Mobile responsive (panels may need to stack or adjust ratios)
- [ ] No TypeScript errors
- [ ] Pipeline tests pass

---

## Visual Reference

### Good Examples of Split Axes
- Gap + explicit labels make break obvious
- Each segment internally linear (honest encoding)
- Small "//" or wave break marks on axis line

### Anti-Patterns to Avoid
- Zigzag break marks that dominate attention
- No labels explaining the panels
- Unclear where the break occurs
- Misleading visual comparison across the break

---

## Future Enhancements (Optional)

### Interactive Panel Expansion
On hover over right panel, animate expansion:
- Left shrinks to 60%
- Right expands to 35%
- Gives "focus view" on speed leaders

### Dynamic Right Panel Max
Instead of hardcoded 300, compute from data:
```typescript
const rightMax = Math.ceil(d3.max(data, d => d.mean_tokens_per_second) / 50) * 50;
```

---

## Related Files

- `components/charts/cloud/SpeedDistChart.tsx` - Main chart component
- `utils/dataProcessing.ts` - Where 140 filter currently lives
- `types/ProcessedData.ts` - SpeedDistributionPoint interface
- `components/theme/theme.ts` - getProviderColor function

---

## Commit Strategy

1. Remove 140 filter from `dataProcessing.ts`
2. Implement split-axis chart
3. Test thoroughly
4. Single commit: `feat: implement split-axis speed distribution chart`
