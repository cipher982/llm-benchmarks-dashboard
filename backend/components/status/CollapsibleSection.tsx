import { styled } from '@mui/material/styles';

export const CollapsibleSection = styled('div')<{ isOpen: boolean }>(({ isOpen }) => ({
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s ease',
    opacity: isOpen ? 1 : 0.7,
    '&:hover': {
        opacity: 1,
    },
}));
