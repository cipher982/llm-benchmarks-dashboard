/**
 * TanStack Table with Windows 98 Design System
 * 
 * Headless table component using TanStack Table v8 with full Windows 98 styling.
 * Supports sorting, virtualization, and custom cell renderers while maintaining
 * strict adherence to design system tokens.
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
  sizing
} from '../design-system';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const TableWrapper = styled('div')({
  backgroundColor: colors.surface,
  border: `2px inset ${colors.surfaceElevated}`,
  boxShadow: sizing.shadows.md,
  fontFamily: typography.fontFamily,
  overflow: 'hidden',
});

const TableContainer = styled('div')({
  width: '100%',
  height: '100%',
  overflow: 'auto',
  
  // Windows 98 scrollbar styles
  '&::-webkit-scrollbar': {
    width: '16px',
    height: '16px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: colors.surfaceElevated,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.borderMedium,
    border: `1px outset ${colors.surfaceElevated}`,
  },
  '&::-webkit-scrollbar-corner': {
    backgroundColor: colors.surfaceElevated,
  },
});

const Table = styled('table')({
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
});

const TableHead = styled('thead')({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: colors.surfaceElevated,
});

const TableBody = styled('tbody')({
  backgroundColor: colors.surface,
});

const HeaderCell = styled('th')<{ sortable?: boolean }>(({ sortable }) => ({
  backgroundColor: colors.surfaceElevated,
  color: colors.textPrimary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
  fontWeight: typography.weights.semibold,
  padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
  textAlign: 'left',
  userSelect: 'none',
  cursor: sortable ? 'pointer' : 'default',
  border: `1px solid ${colors.borderMedium}`,
  borderTop: `2px solid ${colors.borderLight}`,
  borderLeft: `2px solid ${colors.borderLight}`,
  borderRight: `1px solid ${colors.borderDark}`,
  borderBottom: `1px solid ${colors.borderDark}`,
  
  '&:hover': sortable ? {
    backgroundColor: colors.hover,
  } : {},
  
  '&:active': sortable ? {
    backgroundColor: colors.pressed,
    borderTop: `1px solid ${colors.borderDark}`,
    borderLeft: `1px solid ${colors.borderDark}`,
    borderRight: `2px solid ${colors.borderLight}`,
    borderBottom: `2px solid ${colors.borderLight}`,
  } : {},
  
  '&:focus': sortable ? {
    outline: `2px solid ${colors.primary}`,
    outlineOffset: '-2px',
  } : {},
}));

const SortableHeaderButton = styled('button')({
  all: 'unset',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  
  '&:focus': {
    outline: `2px solid ${colors.primary}`,
    outlineOffset: '-2px',
  },
});

const SortIndicator = styled('span')<{ direction?: 'asc' | 'desc' }>(({ direction }) => ({
  marginLeft: spacing.scale[1],
  fontSize: typography.sizes.xs,
  color: colors.textSecondary,
  
  '&::after': {
    content: direction === 'asc' ? '"▲"' : direction === 'desc' ? '"▼"' : '"◆"',
  },
}));

const DataCell = styled('td')({
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
  padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
  border: `1px solid ${colors.borderMedium}`,
  
  '&:hover': {
    backgroundColor: colors.hover,
  },
});


const VirtualCell = styled('td')<{ width: number }>(({ width }) => ({
  display: 'flex',
  alignItems: 'center',
  width: `${width}px`,
  minWidth: `${width}px`,
  maxWidth: `${width}px`,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
  padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
  border: `1px solid ${colors.borderMedium}`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  
  '&:hover': {
    backgroundColor: colors.hover,
  },
}));

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

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
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35, // Approximate row height
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
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {/* Header */}
            <div 
              role="row"
              style={{ 
                display: 'flex', 
                position: 'sticky', 
                top: 0, 
                zIndex: 10,
                backgroundColor: colors.surfaceElevated 
              }}
            >
              {headers.map((header, index) => {
                const sortDirection = header.column.getIsSorted();
                const canSort = sortable && header.column.getCanSort();
                
                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    header.column.getToggleSortingHandler()?.(e as any);
                  }
                };
                
                return (
                  <HeaderCell
                    key={header.id}
                    role="columnheader"
                    aria-sort={canSort ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined}
                    sortable={canSort}
                    tabIndex={canSort ? 0 : undefined}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    onKeyDown={canSort ? handleKeyDown : undefined}
                    style={{
                      width: columnWidths[index],
                      minWidth: columnWidths[index],
                      maxWidth: columnWidths[index],
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
                  </HeaderCell>
                );
              })}
            </div>

            {/* Virtual Rows */}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  role="row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <VirtualCell key={cell.id} role="cell" width={columnWidths[cellIndex]}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </VirtualCell>
                  ))}
                </div>
              );
            })}
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
                    tabIndex={sortable && header.column.getCanSort() ? 0 : undefined}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                    onKeyDown={(e) => {
                      if (sortable && header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e as any);
                      }
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      sortable && header.column.getCanSort() ? (
                        <SortableHeaderButton>
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
            {rows.map((row) => {
              const rowData = row.original as any;
              const isDeprecated = rowData?.deprecated;
              return (
                <tr
                  key={row.id}
                  style={isDeprecated ? {
                    backgroundColor: 'rgba(255, 152, 0, 0.08)',
                    opacity: 0.7
                  } : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <DataCell key={cell.id}>
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