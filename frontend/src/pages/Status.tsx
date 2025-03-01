import React, { useEffect, useState, useCallback } from 'react';
import { styled, useTheme } from '@mui/system';
import { MainContainer } from '../styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

interface ModelData {
    provider: string;
    model: string;
    last_run_timestamp: string;
    runs: boolean[];
    latest_status: string;
}

// Styles
const StatusPageContainer = styled('div')(() => {
    const theme = useTheme();
    return {
        backgroundColor: theme.palette.primary.main,
        padding: '20px',
        color: theme.palette.text.primary,
    };
});

const ProviderSection = styled(Paper)(({ theme }) => ({
    marginBottom: "8px",
    backgroundColor: 'transparent',
    color: theme.palette.text.primary,
}));

const ProviderHeader = styled('h3')(({ theme }) => ({
    fontSize: '1.0rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: '12px',
    textAlign: 'center',
    padding: '4px 0',
    borderBottom: `2px solid ${theme.palette.primary.main}`,
}));

const StatusIndicator = styled('span')<{ status: string }>(({ status, theme }) => {
    const color = status === 'success' ? theme.palette.success.main : theme.palette.error.main;
    return {
        color,
        marginRight: '2px',
        display: 'inline-block',
        width: '12px',
        textAlign: 'center',
        fontSize: '0.8rem'
    };
});

const LastRunInfo = styled('div')(() => ({
    marginBottom: "12px",
    fontSize: "1rem",
    fontWeight: "bold",
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    padding: '4px 8px',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    '&.header': {
        fontWeight: 'bold',
        backgroundColor: theme.palette.primary.dark,
        padding: '4px 8px',
        fontSize: '0.8rem',
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
    height: '24px',
}));

const StatusPage: React.FC = () => {
    const [data, setData] = useState<Record<string, ModelData>>({});
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [lastRunInfo, setLastRunInfo] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            if (!process.env.REACT_APP_API_URL) {
                throw new Error("REACT_APP_API_URL environment variable is not set");
            }
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/api/status`);
            const data = await response.json();
            setData(data);
            updateLastRunInfo(data);
        } catch (error) {
            console.error("Error fetching model status data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const updateLastRunInfo = (data: Record<string, ModelData>) => {
        const mostRecentRunTimestamp = Math.max(...Object.values(data).map((model) => {
            return new Date(model.last_run_timestamp + 'Z').getTime();
        }));
        const currentTime = new Date().getTime();
        const timeDifference = currentTime - mostRecentRunTimestamp;
        const hours = Math.floor(timeDifference / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

        setLastRunInfo(`⏰ Last model run: ${hours}h ${minutes}m ago`);
    };

    const { activeModels } = Object.entries(data).reduce((acc, [key, model]) => {
        // Skip if model or provider is undefined
        if (!model || !model.provider) {
            return acc;
        }

        // Skip todo models
        if (model.provider.includes('_todo')) {
            return acc;
        }

        if (!acc.activeModels[model.provider]) {
            acc.activeModels[model.provider] = [];
        }
        acc.activeModels[model.provider].push({ key, ...model });
        
        return acc;
    }, {
        activeModels: {} as Record<string, Array<{ key: string } & ModelData>>,
    });

    const getRecentNonDidNotRunStatuses = (runs: boolean[]) => {
        return runs;
    };

    const formatTimestamp = (timestamp: string) => {
        const localTimestamp = new Date(timestamp);
        return localTimestamp.toUTCString();
    };

    const renderModelTable = (models: Array<{ key: string } & ModelData>) => (
        <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
            <Table size="small" sx={{ '& .MuiTable-root': { borderCollapse: 'collapse' } }}>
                <TableHead>
                    <TableRow>
                        <StyledTableCell className="header" style={{ width: '25%' }}>Model Name</StyledTableCell>
                        <StyledTableCell className="header" style={{ width: '45%' }}>Last Run</StyledTableCell>
                        <StyledTableCell className="header" style={{ width: '30%' }}>Status</StyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {models.map((model) => {
                        const recentStatuses = getRecentNonDidNotRunStatuses(model.runs);
                        const localLastRunTimestamp = formatTimestamp(model.last_run_timestamp);

                        return (
                            <StyledTableRow key={model.key}>
                                <StyledTableCell>{model.model}</StyledTableCell>
                                <StyledTableCell>{localLastRunTimestamp}</StyledTableCell>
                                <StyledTableCell>
                                    {recentStatuses.map((status, index) => (
                                        <StatusIndicator key={index} status={status ? 'success' : 'error'}>
                                            {status ? '✓' : '✗'}
                                        </StatusIndicator>
                                    ))}
                                </StyledTableCell>
                            </StyledTableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <MainContainer isMobile={isMobile}>
            <StatusPageContainer>
                <h1 style={{ marginBottom: '8px', fontSize: '1.5rem' }}>Model Benchmarking Status</h1>
                {isLoading ? (
                    <div>Loading model status...</div>
                ) : (
                    <>
                        <LastRunInfo>{lastRunInfo}</LastRunInfo>
                        
                        <h2 style={{ marginBottom: '8px', fontSize: '1.2rem' }}>Active Models</h2>
                        {Object.entries(activeModels).map(([provider, models]) => (
                            <ProviderSection key={provider}>
                                <ProviderHeader>{provider.toUpperCase()}</ProviderHeader>
                                {renderModelTable(models)}
                            </ProviderSection>
                        ))}
                    </>
                )}
            </StatusPageContainer>
        </MainContainer>
    );
};

export default StatusPage;
