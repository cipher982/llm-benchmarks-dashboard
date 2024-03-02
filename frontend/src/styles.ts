import { CSSObject, styled } from '@mui/system';

interface MainContainerProps {
    isMobile: boolean;
}

// Styles
const MainContainer = styled('div')<MainContainerProps>(({ isMobile }): CSSObject => ({
    paddingTop: isMobile ? '70px' : '30px',
    margin: isMobile ? '2px' : '10px',
}));

const DescriptionSection = styled('section')<MainContainerProps>(({ isMobile }): CSSObject => ({
    textAlign: 'center',
    padding: '20px',
    backgroundColor: isMobile ? '#fff' : '#fff', // Example of conditional styling based on isMobile
}));

const ChartContainer = styled('section')<MainContainerProps>(({ isMobile }): CSSObject => ({
    textAlign: 'center',
    border: '1px solid #f9f9f9',
    borderRadius: '4px',
    padding: '20px',
    marginTop: '20px',
    backgroundColor: isMobile ? '#fff' : '#fff', // Adjusted for demonstration
}));

const TableContainer = styled('section')<MainContainerProps>(({ isMobile }): CSSObject => ({
    textAlign: 'center',
    border: '1px solid #f9f9f9',
    marginTop: '20px',
    width: '100%',
    backgroundColor: isMobile ? '#fff' : '#fff', // Adjusted for demonstration
}));

export { MainContainer, DescriptionSection, ChartContainer, TableContainer };