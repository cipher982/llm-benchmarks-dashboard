import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
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

const StyledButton = styled(({ component: Component = MuiButton, ...otherProps }: StyledButtonProps & { component?: React.ElementType }) => (
    <Component {...otherProps} />
))(({ theme }) => ({
    color: theme.palette.background.default,
    backgroundColor: theme.palette.secondary.main,
    marginRight: theme.spacing(2),
    "&:hover": {
        backgroundColor: theme.palette.secondary.main,
    },
    [`@media (max-width:700px)`]: {
        margin: theme.spacing(0.5),
        padding: theme.spacing(0.5),
    },
}));

const StyledLink = styled(({ ...otherProps }: StyledLinkProps & Omit<React.ComponentProps<typeof RouterLink>, 'to'>) => <RouterLink {...otherProps} />)(({ theme, to }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    const boxShadowColor = 'rgba(255,255,255,0.5)';

    return {
        textDecoration: 'none',
        marginRight: theme.spacing(2),
        padding: theme.spacing(1),
        color: "black",
        backgroundColor: theme.palette.secondary.main,
        borderRadius: '4px',
        boxShadow: isActive ? `0px 0px 5px 5px ${boxShadowColor}` : 'none',
        [`@media (max-width:700px)`]: {
            display: 'block',
            margin: theme.spacing(1),
            textAlign: 'center',
        },
    };
});

const Navbar: React.FC = () => {
    return (
        <NavBarContainer>
            <ButtonsContainer>
                <StyledButton
                    variant="contained"
                    size="small"
                    onClick={() => window.open("https://github.com/cipher982/llm-benchmarks", "_blank")}
                >
                    <GitHubIcon style={{ color: "black" }} />
                </StyledButton>
                <StyledButton
                    variant="contained"
                    size="small"
                    onClick={() => window.open("https://drose.io", "_blank")}
                >
                    <PersonOutlineIcon style={{ color: "black", marginRight: "5px" }} />
                    <span style={{ color: "black" }}>drose.io</span>
                </StyledButton>
            </ButtonsContainer>
            <LinksContainer>
                <StyledLink to="/local">Local Benchmarks</StyledLink>
                <StyledLink to="/cloud">Cloud Benchmarks</StyledLink>
            </LinksContainer>
        </NavBarContainer >
    );
};

export default Navbar;