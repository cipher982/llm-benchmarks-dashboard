/**
 * Geometry for the virtualized results table.
 *
 * Extracted so the one line that fixed rows rendering under the sticky header
 * is testable without a DOM. See `tests/virtualTable.test.js`.
 */

/**
 * Where a virtual row sits inside its canvas.
 *
 * `@tanstack/react-virtual` folds `scrollMargin` into `virtualRow.start`, and
 * the row canvas is itself offset by that margin in normal flow — so the
 * transform must subtract it back out or every row is pushed down by the height
 * of the header twice, opening a blank band beneath it.
 *
 * Clamped at zero because `headerHeight` is measured after first paint: for one
 * frame it is 0 while `start` is not, and the reverse must never drag a row
 * above the top of its canvas.
 */
export function virtualRowOffset(start: number, headerHeight: number): number {
    return Math.max(0, start - headerHeight);
}
