import { styled } from '@mui/material/styles';
import { colors, typography } from '../design-system';

export const ProviderHeader = styled('h3')({
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: '0',
    marginBottom: '16px',
    padding: '8px 0',
    textAlign: 'center',
    backgroundColor: colors.surfaceElevated,
    borderTop: `1px solid ${colors.borderLight}`,
    borderBottom: `1px solid ${colors.borderDark}`,
    fontFamily: typography.fontFamily,
});
