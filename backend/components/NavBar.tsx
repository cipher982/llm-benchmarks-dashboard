import React from 'react';
import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

const StyledButton = styled(MuiButton)(({ theme }) => ({
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

interface NavLinkProps {
    href: string;
    children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} style={{ textDecoration: 'none', marginRight: '16px' }}>
            <div
                style={{
                    padding: '8px 16px',
                    color: '#000',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    boxShadow: isActive ? '0 0 0 2px #2196f3' : 'none',
                    border: isActive ? '2px solid #1976d2' : '2px solid transparent',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                {children}
            </div>
        </Link>
    );
};

const Navbar: React.FC = () => {
    return (
        <NavBarContainer>
            <LinksContainer>
                <NavLink href="/cloud">Cloud Benchmarks</NavLink>
                <NavLink href="/local">Local Benchmarks</NavLink>
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
                <Link href="/status" style={{ textDecoration: 'none' }}>
                    <StyledButton
                        variant="outlined"
                        size="small"
                    >
                        <CheckCircleOutlineIcon />
                        API Status
                    </StyledButton>
                </Link>
            </ButtonsContainer>
        </NavBarContainer>
    );
};

export default Navbar;