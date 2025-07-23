/**
 * Refined Table Component
 * 
 * A unified table solution that eliminates the styling chaos.
 * Uses composition to provide consistent styling across all tables.
 */

import React from 'react';
import { styled } from '@mui/material/styles';
import { DataGrid, DataGridProps } from '@mui/x-data-grid';
import { refinedColors, refinedSpacing, refinedTypography, refinedElevation, refinedPatterns } from './refined-design-system';

// =============================================================================
// STYLED DATAGRID - All styling in ONE place
// =============================================================================

export const RefinedDataGrid = styled(DataGrid)(({ theme }) => ({
  // Container
  border: `1px solid ${refinedColors.neutral[300]}`,
  borderRadius: refinedPatterns.radius.md,
  backgroundColor: refinedColors.background.elevated,
  fontFamily: refinedTypography.fontFamily.sans,
  fontSize: refinedTypography.scale.base,
  color: refinedColors.text.primary,
  boxShadow: refinedElevation.shadows.sm,
  
  // Remove all the default MUI borders
  '& .MuiDataGrid-main': {
    border: 'none',
  },
  
  // Column headers
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: refinedColors.neutral[100],
    borderBottom: `1px solid ${refinedColors.neutral[300]}`,
    borderRadius: 0,
  },
  
  '& .MuiDataGrid-columnHeader': {
    '&:focus': {
      outline: 'none',
    },
    '&:focus-within': {
      outline: 'none',
    },
  },
  
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: refinedTypography.weight.semibold,
    fontSize: refinedTypography.scale.sm,
    color: refinedColors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: refinedTypography.letterSpacing.wider,
  },
  
  // Cells
  '& .MuiDataGrid-cell': {
    borderBottom: `1px solid ${refinedColors.neutral[200]}`,
    borderRight: 'none',
    color: refinedColors.text.primary,
    fontSize: refinedTypography.scale.base,
    '&:focus': {
      outline: `2px solid ${refinedColors.primary.main}`,
      outlineOffset: '-1px',
    },
  },
  
  // Row hover
  '& .MuiDataGrid-row': {
    '&:hover': {
      backgroundColor: refinedColors.interaction.hover,
      cursor: 'pointer',
    },
    '&.Mui-selected': {
      backgroundColor: refinedColors.interaction.selected,
      '&:hover': {
        backgroundColor: refinedColors.interaction.selected,
      },
    },
  },
  
  // Remove column separator
  '& .MuiDataGrid-columnSeparator': {
    display: 'none',
  },
  
  // Icons
  '& .MuiDataGrid-sortIcon': {
    color: refinedColors.text.secondary,
  },
  
  '& .MuiDataGrid-menuIcon': {
    color: refinedColors.text.secondary,
  },
  
  // Footer/Pagination
  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${refinedColors.neutral[300]}`,
    backgroundColor: refinedColors.neutral[50],
    minHeight: '52px',
  },
  
  '& .MuiTablePagination-root': {
    color: refinedColors.text.primary,
  },
  
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    fontSize: refinedTypography.scale.sm,
    color: refinedColors.text.secondary,
  },
  
  '& .MuiTablePagination-select': {
    fontSize: refinedTypography.scale.sm,
  },
  
  // Checkboxes
  '& .MuiCheckbox-root': {
    color: refinedColors.neutral[400],
    '&.Mui-checked': {
      color: refinedColors.primary.main,
    },
  },
  
  // Loading overlay
  '& .MuiDataGrid-overlay': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
}));

// =============================================================================
// WRAPPER COMPONENT - Handles common props and behaviors
// =============================================================================

interface RefinedTableProps extends DataGridProps {
  height?: number | string;
  enableCheckboxSelection?: boolean;
  enableDensitySelector?: boolean;
}

export const RefinedTable: React.FC<RefinedTableProps> = ({
  height = 600,
  enableCheckboxSelection = false,
  enableDensitySelector = false,
  ...props
}) => {
  // Common configuration for all tables
  const defaultProps: Partial<DataGridProps> = {
    checkboxSelection: enableCheckboxSelection,
    disableRowSelectionOnClick: !enableCheckboxSelection,
    disableColumnMenu: false,
    disableDensitySelector: !enableDensitySelector,
    disableColumnSelector: true,
    rowHeight: 52,
    columnHeaderHeight: 56,
    pageSizeOptions: [25, 50, 100],
    initialState: {
      pagination: {
        paginationModel: { pageSize: 25 },
      },
    },
  };

  return (
    <div style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}>
      <RefinedDataGrid
        {...defaultProps}
        {...props}
      />
    </div>
  );
};

// =============================================================================
// USAGE EXAMPLES IN COMMENTS
// =============================================================================

/**
 * Example usage in your components:
 * 
 * ```tsx
 * import { RefinedTable } from '../components/design-system/refined-table';
 * 
 * // Simple usage
 * <RefinedTable
 *   rows={data}
 *   columns={columns}
 *   height={500}
 * />
 * 
 * // With selection
 * <RefinedTable
 *   rows={data}
 *   columns={columns}
 *   height={500}
 *   enableCheckboxSelection
 *   onRowSelectionModelChange={(selection) => console.log(selection)}
 * />
 * 
 * // Custom sorting
 * <RefinedTable
 *   rows={data}
 *   columns={columns}
 *   sortModel={sortModel}
 *   onSortModelChange={setSortModel}
 * />
 * ```
 */

// =============================================================================
// MIGRATION HELPER
// =============================================================================

export const migrateTableStyles = () => {
  console.warn(`
    🚨 TABLE MIGRATION GUIDE:
    
    1. Remove ALL inline sx props from DataGrid
    2. Remove ALL color: "white" hard-coding
    3. Remove border styles from parent Box
    4. Replace with: <RefinedTable rows={data} columns={columns} />
    
    Before:
    <Box sx={{ height: 500, width: '100%', border: "1px solid white" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        sx={{
          "& .MuiDataGrid-columnHeaders": { color: "white", ... },
          // ... tons of overrides
        }}
      />
    </Box>
    
    After:
    <RefinedTable rows={rows} columns={columns} height={500} />
  `);
}; 