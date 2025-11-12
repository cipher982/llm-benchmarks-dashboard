import { styled } from '@mui/material/styles';
import { typography } from '../design-system';

export const StatusIndicator = styled('span')<{ status: string }>(({ status }) => {
    const color = status === 'success' ? '#008000' : '#800000';
    return {
        color,
        marginRight: '6px',  // Increased from 2px for better spacing
        display: 'inline-block',
        width: '20px',  // Increased from 16px for better visibility
        textAlign: 'center',
        fontSize: typography.sizes.md,  // Slightly larger emojis
        fontWeight: typography.weights.normal,
    };
});
