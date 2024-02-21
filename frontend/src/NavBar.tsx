import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link as RouterLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

interface StyledButtonProps extends Omit<React.ComponentProps<typeof MuiButton>, 'darkMode'> {
    darkMode: boolean;
    component?: React.ElementType;
    href?: string;
    target?: string;
    rel?: string;
}

interface StyledLinkProps {
    darkMode: boolean;
    to: string;
    children?: React.ReactNode;
}

interface NavbarProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const NavBarContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.palette.secondary.main,
    padding: '10px 20px',
    [`@media (max-width:700px)`]: {
        flexDirection: 'column',
        alignItems: 'center',
    },
}));

const LinksContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    order: 1,
    [`@media (max-width:700px)`]: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: theme.spacing(0),
        order: 2,
    },
}));

const ButtonsContainer = styled('div')(({ theme }) => ({
    order: 2,
    [`@media (max-width:700px)`]: {
        marginBottom: theme.spacing(2),
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-end',
        order: 1,
    },
}));

const StyledButton = styled(({ darkMode, component: Component = MuiButton, ...otherProps }: StyledButtonProps & { component?: React.ElementType }) => (
    <Component {...otherProps} />
))(({ theme, darkMode }) => ({
    color: theme.palette.background.default,
    backgroundColor: theme.palette.primary.main,
    marginRight: theme.spacing(2),
    "&:hover": {
        backgroundColor: darkMode ? theme.palette.secondary.dark : theme.palette.primary.light,
    },
    [`@media (max-width:700px)`]: {
        margin: theme.spacing(0.5),
        padding: theme.spacing(0.5),
    },
}));

const StyledLink = styled(({ darkMode, ...otherProps }: StyledLinkProps & Omit<React.ComponentProps<typeof RouterLink>, 'darkMode'>) => <RouterLink {...otherProps} />)(({ theme, to, ...props }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    const color = props.darkMode ? "white" : "black";
    const boxShadowColor = 'rgba(255,255,255,0.5)';

    return {
        textDecoration: 'none',
        marginRight: theme.spacing(2),
        padding: theme.spacing(1),
        color: color,
        backgroundColor: theme.palette.primary.main,
        borderRadius: '4px',
        boxShadow: isActive ? `0px 0px 5px 5px ${boxShadowColor}` : 'none',
        [`@media (max-width:700px)`]: {
            display: 'block',
            margin: theme.spacing(1),
            textAlign: 'center',
        },
    };
});

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode }) => {
    return (
        <NavBarContainer>
            <ButtonsContainer>
                <StyledButton
                    variant="contained"
                    onClick={toggleDarkMode}
                    size="small"
                    darkMode={darkMode}
                >
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </StyledButton>
                <StyledButton
                    variant="contained"
                    size="small"
                    darkMode={darkMode}
                    component="a"
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <GitHubIcon />
                </StyledButton>
            </ButtonsContainer>
            <LinksContainer>
                <StyledLink to="/" darkMode={darkMode}>
                    Home
                </StyledLink>
                <StyledLink to="/about" darkMode={darkMode}>
                    About
                </StyledLink>
                <StyledLink to="/profile" darkMode={darkMode}>
                    <PersonOutlineIcon />
                </StyledLink>
            </LinksContainer>
        </NavBarContainer>
    );
};

export default Navbar;