import { styled } from '@mui/material/styles';
import { colors, typography } from '../design-system';

export const SectionDescription = styled('p')({
    fontSize: typography.sizes.base,
    color: colors.primaryText,  // White text for contrast on elevated surface
    margin: '8px 16px',
    fontFamily: typography.fontFamily,
});
