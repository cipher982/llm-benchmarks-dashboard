import { styled } from '@mui/material/styles';
import { colors, typography } from '../design-system';

export const SectionTitle = styled('h2')<{ sectionType?: 'active' | 'deprecated' | 'disabled' }>(({ sectionType = 'active' }) => {
    const borderColors = {
        active: '#2d7a2d',
        deprecated: '#d97706',
        disabled: '#6b7280'
    };

    return {
        fontSize: typography.sizes['2xl'],
        fontWeight: typography.weights.semibold,
        color: colors.textPrimary,
        margin: '0',
        padding: '16px 20px',  // Increased padding for better spacing
        backgroundColor: colors.surfaceElevated,
        borderLeft: `6px solid ${borderColors[sectionType]}`,  // Thicker border for emphasis
        fontFamily: typography.fontFamily,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',  // Add gap for emoji spacing
    };
});
