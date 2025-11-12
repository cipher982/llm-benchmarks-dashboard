import { styled } from '@mui/material/styles';
import { colors, typography } from '../design-system';

export const DeprecationDetails = styled('div')({
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    padding: '4px 12px',
    fontFamily: typography.fontFamily,
    fontStyle: 'italic',
});
