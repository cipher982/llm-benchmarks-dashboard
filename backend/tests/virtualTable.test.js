/**
 * The virtualized results table hid its first row: rows were absolutely
 * positioned inside the same element as the sticky header, so the row at
 * offset 0 rendered underneath it. On /cloud that hid the fastest model while
 * the meter strip above reported its throughput as the maximum.
 *
 * The geometry is now: header in normal flow, rows in their own canvas below
 * it, and `scrollMargin` told to the virtualizer so its windowing still tracks
 * the scroll container. `scrollMargin` is folded into `virtualRow.start`, so
 * the transform has to take it back out or the canvas offset is counted twice.
 *
 * That subtraction is the whole fix, and it only runs above 100 rows — a path
 * no screenshot exercised until the fixture was widened. Pinning it here.
 */

const { virtualRowOffset } = require('../utils/virtualTable');

describe('virtualized row offset', () => {
  it('puts the first row at the top of its canvas, not under the header', () => {
    expect(virtualRowOffset(30, 30)).toBe(0);
  });

  it('does not double-count the header once scrolled', () => {
    // start already includes scrollMargin, so row n sits at n * rowHeight.
    expect(virtualRowOffset(30 + 26 * 4, 30)).toBe(26 * 4);
  });

  it('is the identity when there is no header to clear', () => {
    expect(virtualRowOffset(260, 0)).toBe(260);
  });

  it('never returns a negative offset before the header is measured', () => {
    // First paint runs with headerHeight 0; a later measure must not drag rows
    // above their canvas if start has not caught up.
    expect(virtualRowOffset(0, 30)).toBe(0);
  });
});
