import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import { colors, typography } from '../design-system';

export const StyledTable = styled(Table)({
    backgroundColor: colors.surface,
    '& .MuiTableCell-root': {
        fontFamily: typography.fontFamily,
        fontSize: typography.sizes.base,
        color: colors.textPrimary,
        borderBottom: `1px solid ${colors.borderMedium}`,
        padding: '12px 16px',  // Increased from 8px 12px for better readability
    },
    '& .MuiTableHead-root': {
        backgroundColor: colors.surfaceElevated,
        '& .MuiTableCell-root': {
            fontWeight: typography.weights.semibold,
            fontSize: typography.sizes.md,  // Slightly larger for headers
        },
    },
    '& .MuiTableRow-root': {
        '&:hover': {
            backgroundColor: colors.hover,
        },
    },
});
