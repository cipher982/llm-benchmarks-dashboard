import { styled } from '@mui/material/styles';
import { typography } from '../design-system';

export const WarningBadge = styled('span')<{ type: string }>(({ type }) => {
    const colors = {
        stale: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        infrequent: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        failures: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
        deprecated: { bg: '#ffedd5', text: '#9a3412', border: '#f97316' }
    };

    const style = type.startsWith('stale') ? colors.stale :
                  type.startsWith('infrequent') ? colors.infrequent :
                  type.startsWith('failures') ? colors.failures :
                  colors.deprecated;

    return {
        display: 'inline-block',
        padding: '2px 6px',
        marginLeft: '4px',
        fontSize: typography.sizes.xs,
        fontFamily: typography.fontFamily,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: '2px',
    };
});
