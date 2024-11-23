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
    runs: string[];
    provider: string;
    model: string;
    last_run_timestamp: string;
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

const ProviderHeader = styled('div')(({ theme }) => ({
    padding: "4px 8px",
    fontSize: "1rem",
    fontWeight: "bold",
    borderBottom: `1px solid ${theme.palette.divider}`,
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
            const response = await fetch("https://llm-benchmarks-backend.vercel.app/api/status");
            const data = await response.json();
            setData(data);
            updateLastRunInfo(data);
        } catch (error) {
            console.error("Error fetching model status data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const isModelDeprecated = (lastRunTimestamp: string): boolean => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(lastRunTimestamp + 'Z') < oneWeekAgo;
    };

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

    const { activeModels, deprecatedModels } = Object.entries(data).reduce((acc, [key, model]) => {
        if (!model.provider.includes('_todo')) {
            const group = isModelDeprecated(model.last_run_timestamp)
                ? acc.deprecatedModels
                : acc.activeModels;
        
            if (!group[model.provider]) {
                group[model.provider] = [];
            }
            group[model.provider].push({ key, ...model });
        }
        return acc;
    }, {
        activeModels: {} as Record<string, Array<{ key: string } & ModelData>>,
        deprecatedModels: {} as Record<string, Array<{ key: string } & ModelData>>
    });

    const getRecentNonDidNotRunStatuses = (runs: string[]) => {
        const filteredRuns = runs.filter((status) => status !== 'did-not-run');
        return filteredRuns.slice(-10);
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
                        <StyledTableCell className="header" style={{ width: '30%' }}>Status History</StyledTableCell>
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
                                        <StatusIndicator key={index} status={status}>
                                            {status === 'success' ? '✓' : '✗'}
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
                                <ProviderHeader>{provider}</ProviderHeader>
                                {renderModelTable(models)}
                            </ProviderSection>
                        ))}

                        <h2 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '1.2rem' }}>Deprecated Models</h2>
                        {Object.entries(deprecatedModels).map(([provider, models]) => (
                            <ProviderSection key={provider}>
                                <ProviderHeader>{provider}</ProviderHeader>
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
