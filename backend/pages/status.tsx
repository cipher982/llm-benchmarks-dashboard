import React, { useEffect, useState, useCallback } from 'react';
import { styled, useTheme } from '@mui/system';
import { MainContainer } from '../components/design-system/components';
import { PageTitle, SectionHeader } from '../components/design-system/components';
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
    fontSize: '0.9rem',
    textAlign: 'center'
}));

const StatusPage: React.FC = () => {
    const [statusData, setStatusData] = useState<ModelData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatusData = useCallback(async () => {
        try {
            const response = await fetch(`/api/status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Status API returned:', data, 'Type:', typeof data, 'IsArray:', Array.isArray(data));
            
            // Convert object to array if needed
            const statusArray = Array.isArray(data) ? data : Object.values(data);
            
            // Add latest_status field based on last run result
            const processedStatusArray = statusArray.map((model: any) => ({
                ...model,
                latest_status: model.runs && model.runs.length > 0 
                    ? (model.runs[model.runs.length - 1] ? 'success' : 'error')
                    : 'unknown'
            }));
            
            console.log('Converted to array:', processedStatusArray.length, 'items');
            setStatusData(processedStatusArray);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatusData();
        const interval = setInterval(fetchStatusData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchStatusData]);

    if (loading) {
        return (
            <StatusPageContainer>
                <PageTitle>🔄 API Status 🔄</PageTitle>
                <div>Loading status data...</div>
            </StatusPageContainer>
        );
    }

    if (error) {
        return (
            <StatusPageContainer>
                <PageTitle>❌ API Status - Error ❌</PageTitle>
                <div>Error: {error}</div>
            </StatusPageContainer>
        );
    }

    const groupedByProvider = statusData.reduce((acc, model) => {
        if (!acc[model.provider]) {
            acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
    }, {} as Record<string, ModelData[]>);

    return (
        <MainContainer isMobile={false}>
            <StatusPageContainer>
                <PageTitle>📊 API Status Dashboard 📊</PageTitle>
                <p style={{ textAlign: 'center', marginBottom: '24px' }}>
                    Real-time status of all cloud LLM providers and models. 
                    ✅ = Success, ❌ = Failure. Updates every 30 seconds.
                </p>

                {Object.entries(groupedByProvider).map(([provider, models]) => (
                    <ProviderSection key={provider}>
                        <ProviderHeader>{provider.toUpperCase()}</ProviderHeader>
                        <TableContainer component={Paper} style={{ backgroundColor: 'transparent' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Model</TableCell>
                                        <TableCell>Last Run</TableCell>
                                        <TableCell>Status History (Last 10 runs)</TableCell>
                                        <TableCell>Latest Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {models.map((model) => (
                                        <TableRow key={`${model.provider}-${model.model}`}>
                                            <TableCell>{model.model}</TableCell>
                                            <TableCell>
                                                {new Date(model.last_run_timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {model.runs.map((success, index) => (
                                                    <StatusIndicator 
                                                        key={index} 
                                                        status={success ? 'success' : 'error'}
                                                    >
                                                        {success ? '✅' : '❌'}
                                                    </StatusIndicator>
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                <StatusIndicator status={model.latest_status}>
                                                    {model.latest_status === 'success' ? '✅' : '❌'}
                                                </StatusIndicator>
                                                {model.latest_status}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </ProviderSection>
                ))}
            </StatusPageContainer>
        </MainContainer>
    );
};

export default StatusPage;