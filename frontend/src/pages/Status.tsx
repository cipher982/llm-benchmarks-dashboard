import React, { useEffect, useState } from 'react';
import { CSSObject, styled, useTheme } from '@mui/system';
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

const ProviderGroup = styled('div')(() => {
    const theme = useTheme();
    return {
        marginBottom: '10px',
    };
});

const ModelItem = styled('div')(() => {
    const theme = useTheme();
    return {
        fontSize: '14px',
        lineHeight: '1.4',
        marginBottom: '5px',
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

const StatusPage: React.FC = () => {
    const [data, setData] = useState<Record<string, ModelData>>({});
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        // Example logic to determine if the device is mobile
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
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('https://llm-benchmarks-backend.vercel.app/api/status');
            const data = await response.json();
            setData(data);
        } catch (error) {
            console.error('Error fetching model status data:', error);
        }
    };

    const groupedData = Object.entries(data).reduce((acc, [key, model]) => {
        if (!acc[model.provider]) {
            acc[model.provider] = [];
        }
        acc[model.provider].push({ key, ...model });
        return acc;
    }, {} as Record<string, Array<{ key: string } & ModelData>>);

    return (
        <MainContainer isMobile={isMobile}>
            <StatusPageContainer style={{ borderRadius: "10px" }}>
                <h1>Model Benchmarking Status</h1>
                {Object.entries(groupedData).map(([provider, models]) => (
                    <ProviderGroup key={provider}>
                        <h2>{provider}</h2>
                        {models.map((model) => (
                            <ModelItem key={model.key}>
                                <span>{model.model}</span>
                                <span> - Last Run: {new Date(model.last_run_timestamp).toLocaleString()}</span>
                                <span> - Status: </span>
                                {model.runs.map((status, index) => (
                                    <StatusIndicator key={index} status={status}>
                                        {status === 'success' ? '✓' : '✗'}
                                    </StatusIndicator>
                                ))}
                            </ModelItem>
                        ))}
                    </ProviderGroup>
                ))}
            </StatusPageContainer>
        </MainContainer>
    );
};

export default StatusPage;