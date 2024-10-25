import React, { useEffect, useState, useCallback } from 'react';
import { styled, useTheme } from '@mui/system';
import { MainContainer } from '../styles';

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

const ProviderGroup = styled('div')(() => ({
    marginBottom: "10px",
}));

const ModelItem = styled('div')<{ deprecated?: boolean }>(({ deprecated }) => {
    return {
        fontSize: '14px',
        lineHeight: '1.4',
        marginBottom: '5px',
        opacity: deprecated ? 0.6 : 1,
        fontStyle: deprecated ? 'italic' : 'normal',
    };
});

const StatusIndicator = styled('span')<{ status: string }>(({ status }) => {
    const theme = useTheme();
    const color = status === 'success' ? theme.palette.success.main : theme.palette.error.main;
    return {
        color,
        marginRight: '5px',
    };
});

const LastRunInfo = styled('div')(() => {
    const theme = useTheme();
    return {
        marginBottom: "20px",
        fontSize: "18px",
        fontWeight: "bold",
        color: theme.palette.text.primary,
    };
});

const StatusPage: React.FC = () => {
    const [data, setData] = useState<Record<string, ModelData>>({});
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [lastRunInfo, setLastRunInfo] = useState<string>('');

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch("https://llm-benchmarks-backend.vercel.app/api/status");
            const data = await response.json();
            setData(data);
            updateLastRunInfo(data);
        } catch (error) {
            console.error("Error fetching model status data:", error);
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

        handleResize(); // Set initial value
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

    return (
        <MainContainer isMobile={isMobile}>
            <StatusPageContainer style={{ borderRadius: "10px" }}>
                <h1>Model Benchmarking Status</h1>
                <LastRunInfo>{lastRunInfo}</LastRunInfo>

                <h2>Active Models</h2>
                {Object.entries(activeModels).map(([provider, models]) => (
                    <ProviderGroup key={provider}>
                        <h3>{provider}</h3>
                        {models.map((model) => {
                            const recentStatuses = getRecentNonDidNotRunStatuses(model.runs);
                            const localLastRunTimestamp = formatTimestamp(model.last_run_timestamp);

                            return (
                                <ModelItem key={model.key}>
                                    <span>{model.model}</span>
                                    <span> - Last Run: {localLastRunTimestamp}</span>
                                    <span> - Status: </span>
                                    {recentStatuses.map((status, index) => (
                                        <StatusIndicator key={index} status={status}>
                                            {status === 'success' ? '✓' : '✗'}
                                        </StatusIndicator>
                                    ))}
                                </ModelItem>
                            );
                        })}
                    </ProviderGroup>
                ))}

                <h2>Deprecated Models</h2>
                {Object.entries(deprecatedModels).map(([provider, models]) => (
                    <ProviderGroup key={provider}>
                        <h3>{provider}</h3>
                        {models.map((model) => {
                            const recentStatuses = getRecentNonDidNotRunStatuses(model.runs);
                            const localLastRunTimestamp = formatTimestamp(model.last_run_timestamp);

                            return (
                                <ModelItem key={model.key} deprecated>
                                    <span>{model.model}</span>
                                    <span> - Last Run: {localLastRunTimestamp}</span>
                                    <span> - Status: </span>
                                    {recentStatuses.map((status, index) => (
                                        <StatusIndicator key={index} status={status}>
                                            {status === 'success' ? '✓' : '✗'}
                                        </StatusIndicator>
                                    ))}
                                </ModelItem>
                            );
                        })}
                    </ProviderGroup>
                ))}
            </StatusPageContainer>
        </MainContainer>
    );
};

export default StatusPage;
