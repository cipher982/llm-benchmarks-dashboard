import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link as RouterLink } from 'react-router-dom';

const NavBarContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.palette.secondary.main,
    padding: '10px 20px',
}));

const StyledButton = styled(MuiButton)(({ theme, darkMode }) => ({
    color: theme.palette.background.default,
    backgroundColor: theme.palette.primary.main,
    marginRight: theme.spacing(2),
}));

const StyledLink = styled(RouterLink)(({ theme, darkMode }) => ({
    color: darkMode ? "white" : "black",
    textDecoration: 'none',
    marginRight: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    borderRadius: '4px',
}));

const Navbar = ({ darkMode, toggleDarkMode }) => {
    return (
        <NavBarContainer>
            <div>
                <StyledLink to="/" darkMode={darkMode}>Local Benchmarks</StyledLink>
                <StyledLink to="/cloud" darkMode={darkMode}>Cloud Benchmarks</StyledLink>
            </div>
            <div>
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
            </div>
        </NavBarContainer>
    );
}

export default Navbar;