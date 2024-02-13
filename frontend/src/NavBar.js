import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link as RouterLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';


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

const StyledButton = styled(({ darkMode, ...otherProps }) => <MuiButton {...otherProps} />)(({ theme, darkMode }) => ({
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

const StyledLink = styled(({ darkMode, ...otherProps }) => <RouterLink {...otherProps} />)(({ theme, to, ...props }) => {
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

const Navbar = ({ darkMode, toggleDarkMode }) => {
    return (
        <NavBarContainer>
            <ButtonsContainer>
                <StyledButton
                    variant="contained"
                    onClick={toggleDarkMode}
                    size="small"
                    darkMode={darkMode}
                >
                    {darkMode ? <LightModeIcon style={{ color: "white" }} /> : <DarkModeIcon style={{ color: "black" }} />}
                </StyledButton>
                <StyledButton
                    variant="contained"
                    onClick={() => window.open("https://github.com/cipher982/llm-benchmarks", "_blank")}
                    size="small"
                    darkMode={darkMode}
                >
                    <GitHubIcon style={{ color: darkMode ? "white" : "black" }} />
                </StyledButton>
                <StyledButton
                    variant="contained"
                    onClick={() => window.open("https://drose.io", "_blank")}
                    size="small"
                    darkMode={darkMode}
                >
                    <PersonOutlineIcon style={{ color: darkMode ? "white" : "black", marginRight: "5px" }} />
                    <span style={{ color: darkMode ? "white" : "black" }}>drose.io</span>
                </StyledButton>
            </ButtonsContainer>
            <LinksContainer>
                <StyledLink to="/" darkMode={darkMode}>Local Benchmarks</StyledLink>
                <StyledLink to="/cloud" darkMode={darkMode}>Cloud Benchmarks</StyledLink>
            </LinksContainer>
        </NavBarContainer>
    );
}

export default Navbar;