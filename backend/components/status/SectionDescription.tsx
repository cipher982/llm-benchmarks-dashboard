import { styled } from '@mui/material/styles';
import { colors, typography } from '../design-system';

export const SectionDescription = styled('p')({
    fontSize: typography.sizes.base,
    color: colors.textPrimary,  // Changed from textSecondary for better contrast
    margin: '8px 16px',
    fontFamily: typography.fontFamily,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',  // Add slight background for readability
    padding: '8px',
    borderRadius: '2px',
});
