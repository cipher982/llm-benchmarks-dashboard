import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Link as RouterLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

interface StyledButtonProps extends Omit<React.ComponentProps<typeof MuiButton>, 'component'> {
    component?: React.ElementType;
    href?: string;
    target?: string;
    rel?: string;
}

interface StyledLinkProps {
    to: string;
    children?: React.ReactNode;
}

const NavBarContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.palette.primary.main,
    padding: theme.spacing(2, 3),
    boxShadow: theme.shadows[2],
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: theme.spacing(2),
    },
}));

const LinksContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    order: 1,
    [theme.breakpoints.down('md')]: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: theme.spacing(2),
        order: 2,
    },
}));


const ButtonsContainer = styled('div')(({ theme }) => ({
    order: 2,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
        marginBottom: theme.spacing(2),
        width: '100%',
        justifyContent: 'space-between',
        order: 1,
    },
}));

const StyledButton = styled(({ component: Component = MuiButton, to, ...otherProps }: StyledButtonProps & { component?: React.ElementType, to?: string }) => (
    <Component {...otherProps} component={to ? RouterLink : undefined} to={to} />
))(({ theme }) => ({
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    minWidth: 'auto',
    padding: theme.spacing(1, 2),
    border: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1),
    '& .MuiSvgIcon-root': {
        color: theme.palette.text.primary,
        fontSize: '1.1rem',
    },
    '&:hover': {
        backgroundColor: theme.palette.grey[100],
        borderColor: theme.palette.primary.main,
    },
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(1),
    },
}));

const StyledIconButton = styled(StyledButton)(({ theme }) => ({
    minWidth: 'auto',
    padding: theme.spacing(1),
    '& .MuiSvgIcon-root': {
        color: theme.palette.text.primary,
        fontSize: '1.25rem',
    },
}));

const StyledLink = styled(({ ...otherProps }: StyledLinkProps & Omit<React.ComponentProps<typeof RouterLink>, 'to'>) => <RouterLink {...otherProps} />)(({ theme, to }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return {
        textDecoration: 'none',
        marginRight: theme.spacing(2),
        padding: theme.spacing(1, 2),
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        boxShadow: isActive ? `0 0 0 2px ${theme.palette.primary.light}` : 'none',
        border: isActive ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            backgroundColor: theme.palette.grey[100],
            transform: 'translateY(-1px)',
        },
        [theme.breakpoints.down('md')]: {
            display: 'block',
            margin: theme.spacing(1),
            textAlign: 'center',
        },
    };
});

const Navbar: React.FC = () => {
    return (
        <NavBarContainer>
            <LinksContainer>
                <StyledLink to="/cloud">Cloud Benchmarks</StyledLink>
                <StyledLink to="/local">Local Benchmarks</StyledLink>
            </LinksContainer>
            <ButtonsContainer>
                <StyledIconButton
                    variant="outlined"
                    size="small"
                    onClick={() => window.open("https://github.com/cipher982/llm-benchmarks", "_blank")}
                >
                    <GitHubIcon />
                </StyledIconButton>
                <StyledButton
                    variant="outlined"
                    size="small"
                    onClick={() => window.open("https://drose.io", "_blank")}
                >
                    <PersonOutlineIcon />
                    drose.io
                </StyledButton>
                <StyledButton
                    variant="outlined"
                    size="small"
                    to="/status"
                >
                    <CheckCircleOutlineIcon />
                    API Status
                </StyledButton>
            </ButtonsContainer>

        </NavBarContainer >
    );
};

export default Navbar;