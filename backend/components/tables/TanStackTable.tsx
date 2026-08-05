/**
 * Dense results table.
 *
 * Headless TanStack Table v8 in Console dress: hairline row rules, mono cells
 * with tabular figures, and lifecycle state carried by a 2px left rule in a
 * semantic colour rather than a tinted row background — a wash of orange across
 * a near-black ground reads as damage rather than as data.
 */

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  colors,
  typography,
  spacing,
} from '../design-system';
import { virtualRowOffset } from '../../utils/virtualTable';

const FLAGGED_STATUSES = new Set([
  'likely_deprecated',
  'deprecated',
  'failing',
  'stale',
  'never_succeeded',
  'disabled',
]);

const CAUTION_STATUSES = new Set([
  'monitor',
]);

/**
 * The one rule a row gets for its lifecycle state. Deprecated and flagged both
 * mean "do not rely on this number"; monitor means "watch it".
 */
function rowStateRule(rowData: any): string | undefined {
  const lifecycleStatus = rowData?.lifecycle_status as string | undefined;
  if (rowData?.deprecated) return `2px solid ${colors.warn}`;
  if (lifecycleStatus && FLAGGED_STATUSES.has(lifecycleStatus)) return `2px solid ${colors.bad}`;
  if (lifecycleStatus && CAUTION_STATUSES.has(lifecycleStatus)) return `2px solid ${colors.warn}`;
  return undefined;
}

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const TableWrapper = styled('div')({
  backgroundColor: colors.ground,
  fontFamily: typography.monoFamily,
  overflow: 'hidden',
});

const TableContainer = styled('div')({
  width: '100%',
  height: '100%',
  overflow: 'auto',

  '&::-webkit-scrollbar': {
    width: '10px',
    height: '10px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: colors.surface,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.rule,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: colors.textMute,
  },
  '&::-webkit-scrollbar-corner': {
    backgroundColor: colors.surface,
  },
});

const Table = styled('table')({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.sm,
  fontVariantNumeric: 'tabular-nums',
});

const TableHead = styled('thead')({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: colors.surface,
});

const TableBody = styled('tbody')({
  backgroundColor: colors.ground,
});

/**
 * Column head styling, shared by the `th` used in the plain table and the
 * `div role="columnheader"` used in the virtualized one. The virtualized path
 * lays its rows out with flexbox and absolute positioning, so it cannot use
 * real table elements — rendering a `th` inside a `div` threw a hydration error
 * on every page carrying this table.
 */
const headerCellStyles = (sortable?: boolean) => ({
  backgroundColor: colors.surface,
  color: colors.textMute,
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.micro,
  fontWeight: typography.weights.medium,
  letterSpacing: typography.tracking.label,
  textTransform: 'uppercase' as const,
  padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
  textAlign: 'left' as const,
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
  cursor: sortable ? 'pointer' : 'default',
  borderBottom: `1px solid ${colors.rule}`,

  '&:hover': sortable ? { color: colors.text } : {},

  '&:focus-visible': sortable ? {
    outline: `1px solid ${colors.accent}`,
    outlineOffset: '-1px',
  } : {},
});

const HeaderCell = styled('th')<{ sortable?: boolean }>(({ sortable }) => headerCellStyles(sortable));

const VirtualHeaderCell = styled('div')<{ sortable?: boolean }>(({ sortable }) => ({
  ...headerCellStyles(sortable),
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box',
  overflow: 'hidden',
}));

const SortableHeaderButton = styled('button')({
  all: 'unset',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',

  '&:focus-visible': {
    outline: `1px solid ${colors.accent}`,
    outlineOffset: '-1px',
  },
});

const SortIndicator = styled('span')<{ direction?: 'asc' | 'desc' }>(({ direction }) => ({
  marginLeft: spacing.scale[1],
  fontSize: typography.sizes.micro,
  color: direction ? colors.accent : colors.rule,

  '&::after': {
    content: direction === 'asc' ? '"▲"' : direction === 'desc' ? '"▼"' : '"◆"',
  },
}));

const cellStyles = {
  color: colors.text,
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.sm,
  fontVariantNumeric: 'tabular-nums' as const,
  padding: `${spacing.scale[1]}px ${spacing.scale[3]}px`,
  borderBottom: `1px solid ${colors.ruleSoft}`,
  boxSizing: 'border-box' as const,
};

const DataCell = styled('td')({
  ...cellStyles,
  height: '26px',
  verticalAlign: 'middle',
});

const VirtualCell = styled('div')<{ width: number }>(({ width }) => ({
  ...cellStyles,
  display: 'flex',
  alignItems: 'center',
  width: `${width}px`,
  minWidth: `${width}px`,
  maxWidth: `${width}px`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

/**
 * Per-column presentation. Numeric columns are right-aligned so digits line up
 * down the column — with tabular figures that is what makes a dense table
 * scannable, and it is the only reason the alignment is worth threading
 * through at all.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends unknown, TValue> {
    align?: 'left' | 'right';
  }
}

const alignOf = (column: { columnDef: { meta?: { align?: 'left' | 'right' } } }): 'left' | 'right' =>
  column.columnDef.meta?.align ?? 'left';

export interface TanStackTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  height?: number;
  virtualized?: boolean;
  sortable?: boolean;
  initialSorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function TanStackTable<T>({
  data,
  columns,
  height = 600,
  virtualized = false,
  sortable = true,
  initialSorting = [],
  onSortingChange,
  className,
}: TanStackTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      onSortingChange?.(newSorting);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: sortable,
  });

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  // The row canvas starts below the sticky header, so the virtualizer's offsets
  // are shifted by exactly that much. Without telling it, the window it chooses
  // to render drifts from what is actually on screen.
  //
  // Measured once and then only when the header actually changes size. An
  // effect with no dependency array would re-read `offsetHeight` after every
  // render — including every scroll-driven virtualizer render — forcing a
  // synchronous reflow per frame, and would still miss a resize that did not
  // happen to coincide with a render.
  const [headerHeight, setHeaderHeight] = React.useState(0);
  React.useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const measure = () => {
      const measured = node.offsetHeight;
      setHeaderHeight((current) => (current === measured ? current : measured));
    };
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [virtualized, rows.length > 0]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 26, // Row height in the Console table
    overscan: 8,
    scrollMargin: headerHeight,
    enabled: virtualized && rows.length > 100,
  });

  const headers = table.getFlatHeaders();
  const columnWidths = useMemo(() => {
    return headers.map(header => {
      const column = header.column.columnDef;
      if ('size' in column && typeof column.size === 'number') {
        return column.size;
      }
      if ('width' in column && typeof column.width === 'number') {
        return column.width;
      }
      return 150; // Default width
    });
  }, [headers]);

  if (virtualized && rows.length > 100) {
    return (
      <TableWrapper className={className} style={{ height }}>
        <TableContainer ref={tableContainerRef}>
          {/* The virtual rows get their own positioning context, below the
              header in normal flow.

              They used to be absolutely positioned inside the same element as
              the sticky header, so the row at `translateY(0)` rendered
              underneath it — the table silently dropped whichever row sorted
              first. On /cloud that hid llama-3-8b at 275 tok/s while the meter
              strip above reported "Max tok/s 275", so the page stated a number
              its own leaderboard appeared to contradict. A benchmark site
              cannot hide the fastest row. */}
          {/* `aria-rowcount` because the DOM only ever holds the ~30 rows in
              the virtual window; without it a screen reader reports the window
              as the whole table. */}
          <div
            role="table"
            aria-label="Benchmark data table"
            aria-rowcount={rows.length}
            style={{ width: '100%' }}
          >
            {/* Header */}
            <div
              ref={headerRef}
              role="row"
              aria-rowindex={1}
              style={{
                display: 'flex',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: colors.surface
              }}
            >
              {headers.map((header, index) => {
                const sortDirection = header.column.getIsSorted();
                const canSort = sortable && header.column.getCanSort();
                
                return (
                  <VirtualHeaderCell
                    key={header.id}
                    role="columnheader"
                    aria-sort={canSort ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined}
                    sortable={canSort}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      width: columnWidths[index],
                      minWidth: columnWidths[index],
                      maxWidth: columnWidths[index],
                      justifyContent: alignOf(header.column) === 'right' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      canSort ? (
                        <SortableHeaderButton>
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          <SortIndicator direction={sortDirection || undefined} />
                        </SortableHeaderButton>
                      ) : (
                        <>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </>
                      )
                    )}
                  </VirtualHeaderCell>
                );
              })}
            </div>

            {/* Virtual Rows, in their own canvas so `translateY(0)` is the top
                of the rows rather than the top of the header. */}
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                const borderLeft = rowStateRule(row.original);

                return (
                  <div
                    key={row.id}
                    role="row"
                    aria-rowindex={virtualRow.index + 2}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRowOffset(virtualRow.start, headerHeight)}px)`,
                      display: 'flex',
                      backgroundColor: virtualRow.index % 2 === 1 ? colors.zebra : undefined,
                    }}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <VirtualCell
                        key={cell.id}
                        role="cell"
                        width={columnWidths[cellIndex]}
                        style={{
                          justifyContent: alignOf(cell.column) === 'right' ? 'flex-end' : 'flex-start',
                          ...(cellIndex === 0 && borderLeft ? { borderLeft } : {}),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </VirtualCell>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </TableContainer>
      </TableWrapper>
    );
  }

  // Non-virtualized table for smaller datasets
  return (
    <TableWrapper className={className} style={{ height }}>
      <TableContainer>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <HeaderCell
                    key={header.id}
                    role="columnheader"
                    aria-sort={sortable && header.column.getCanSort() ? 
                      (header.column.getIsSorted() === 'asc' ? 'ascending' : 
                       header.column.getIsSorted() === 'desc' ? 'descending' : 'none') : undefined}
                    sortable={sortable && header.column.getCanSort()}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      width: header.column.columnDef.size,
                      textAlign: alignOf(header.column),
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      sortable && header.column.getCanSort() ? (
                        <SortableHeaderButton
                          style={{
                            flexDirection: alignOf(header.column) === 'right' ? 'row-reverse' : 'row',
                            justifyContent: 'flex-start',
                            gap: '4px',
                          }}
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          <SortIndicator direction={header.column.getIsSorted() || undefined} />
                        </SortableHeaderButton>
                      ) : (
                        <>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </>
                      )
                    )}
                  </HeaderCell>
                ))}
              </tr>
            ))}
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => {
              const borderLeft = rowStateRule(row.original);
              return (
                <tr
                  key={row.id}
                  style={rowIndex % 2 === 1 ? { backgroundColor: colors.zebra } : undefined}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <DataCell
                      key={cell.id}
                      style={{
                        textAlign: alignOf(cell.column),
                        ...(cellIndex === 0 && borderLeft ? { borderLeft } : {}),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </DataCell>
                  ))}
                </tr>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </TableWrapper>
  );
}

export default TanStackTable;
