import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GitHubIcon from '@mui/icons-material/GitHub';
// import 'font-awesome/css/font-awesome.min.css';


const NavBarContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: theme.palette.secondary.main,
    padding: '10px 20px',
}));

const StyledButton = styled(MuiButton)(({ theme, darkMode }) => ({
    color: theme.palette.background.default,
    backgroundColor: theme.palette.primary.main,
    marginRight: theme.spacing(2),

}));

const Navbar = ({ darkMode, toggleDarkMode }) => {
    return (
        <NavBarContainer>
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
        </NavBarContainer>
    );
}

export default Navbar;
