import React, { useState, useEffect, useCallback } from "react";
import { lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { useMediaQuery, Typography, Box, Button, Breadcrumbs, Link } from "@mui/material";
import { MainContainer, DescriptionSection, ChartContainer, TableContainer } from "../styles";
import { SpeedDistributionPoint, TimeSeriesData, TableRow } from "../types/ProcessedData";
import { 
    generateModelMetadata, 
    updateDocumentMetadata, 
    generateStructuredData, 
    addStructuredData 
} from "../utils/seoUtils";

const TimeSeriesChart = lazy(() => import("../charts/cloud/TimeSeries"));
const SpeedDistChart = lazy(() => import("../charts/cloud/SpeedDistChart"));

interface ModelDetailData {
    speedDistribution: SpeedDistributionPoint[];
    timeSeries: TimeSeriesData;
    table: TableRow[];
    model: {
        provider: string;
        model_name: string;
        display_name: string;
    };
}

const ModelDetail: React.FC = () => {
    const { provider, model } = useParams<{provider: string; model: string}>();
    const navigate = useNavigate();
    const [modelData, setModelData] = useState<ModelDetailData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedDays, setSelectedDays] = useState<number>(14);
    const isMobile = useMediaQuery("(max-width:500px)");

    // Update SEO metadata when model data loads
    useEffect(() => {
        if (provider && model) {
            // Set initial metadata based on URL parameters
            const metadata = generateModelMetadata(provider, model);
            updateDocumentMetadata(metadata);
        }
    }, [provider, model]);
    
    // Update metadata with display name once data is loaded
    useEffect(() => {
        if (modelData?.model && modelData.table.length > 0) {
            const { provider, model_name, display_name } = modelData.model;
            const metadata = generateModelMetadata(provider, model_name, display_name);
            updateDocumentMetadata(metadata);
            
            // Add structured data
            const tableRow = modelData.table[0];
            const structuredData = generateStructuredData(
                provider,
                model_name,
                display_name,
                tableRow.tokens_per_second_mean,
                tableRow.time_to_first_token_mean
            );
            addStructuredData(structuredData);
        }
    }, [modelData]);

    const fetchModelData = useCallback(async (days?: number) => {
        if (!provider || !model) {
            setError("Provider and model parameters are required");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const apiUrl = process.env.REACT_APP_API_URL || 'https://llm-benchmarks-backend.vercel.app';
            const queryParams = days ? `&days=${days}` : '';
            const res = await fetch(`${apiUrl}/api/model?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}${queryParams}`);
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            
            if (!data) {
                throw new Error('Model data not found');
            }

            setModelData(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching model data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [provider, model]);

    useEffect(() => {
        fetchModelData(selectedDays);
    }, [fetchModelData, selectedDays]);

    const handleDaysChange = (days: number) => {
        setSelectedDays(days);
    };

    if (loading) {
        return (
            <MainContainer className="MainContainer" isMobile={isMobile}>
                <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                    <CircularProgress />
                </Box>
            </MainContainer>
        );
    }

    if (error || !modelData) {
        return (
            <MainContainer className="MainContainer" isMobile={isMobile}>
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="80vh">
                    <Typography variant="h5" color="error" gutterBottom>
                        {error || "No data available for this model"}
                    </Typography>
                    <Typography variant="body1" align="center" sx={{ mb: 3, maxWidth: "600px" }}>
                        {!error && `We couldn&apos;t find data for ${provider}/${model}. This might be because:`}
                        {!error && (
                            <ul style={{ textAlign: "left", marginTop: "10px" }}>
                                <li>The model hasn&apos;t been benchmarked yet</li>
                                <li>The model might be known by a different name in our system</li>
                                <li>The provider name might be different (e.g., &quot;amazon&quot; instead of &quot;bedrock&quot;)</li>
                            </ul>
                        )}
                    </Typography>
                    <Box display="flex" justifyContent="center" gap={2}>
                        <Button variant="contained" onClick={() => navigate("/cloud")}>
                            Return to Benchmarks
                        </Button>
                        <Button 
                            variant="outlined" 
                            onClick={() => fetchModelData(selectedDays)}
                        >
                            Try Again
                        </Button>
                    </Box>
                </Box>
            </MainContainer>
        );
    }

    const { model: modelInfo } = modelData;
    const title = `${modelInfo.display_name} by ${modelInfo.provider}`;
    
    return (
        <MainContainer className="MainContainer" isMobile={isMobile}>
            <Box mb={3}>
                <Breadcrumbs aria-label="breadcrumb">
                    <Link color="inherit" href="/">
                        Home
                    </Link>
                    <Link color="inherit" href="/cloud">
                        Cloud Benchmarks
                    </Link>
                    <Typography color="textPrimary">{title}</Typography>
                </Breadcrumbs>
            </Box>

            <Typography variant="h4" component="h1" gutterBottom>
                {title} Performance Benchmarks
            </Typography>

            <DescriptionSection isMobile={isMobile}>
                <Typography variant="body1">
                    Detailed performance metrics for {title}. These benchmarks measure tokens per second, 
                    time to first token, and performance stability over time.
                </Typography>
            </DescriptionSection>

            <ChartContainer isMobile={isMobile}>
                <Typography variant="h5" gutterBottom>Speed Distribution</Typography>
                <Suspense fallback={<CircularProgress />}>
                    <SpeedDistChart 
                        data={modelData.speedDistribution.filter(m => 
                            m.provider.toLowerCase() === modelInfo.provider.toLowerCase() && 
                            m.model_name.toLowerCase() === modelInfo.model_name.toLowerCase()
                        )} 
                    />
                </Suspense>
            </ChartContainer>

            <ChartContainer isMobile={isMobile}>
                <Typography variant="h5" gutterBottom>Performance Over Time</Typography>
                <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Button 
                        variant={selectedDays === 7 ? "contained" : "outlined"} 
                        onClick={() => handleDaysChange(7)}
                        size="small"
                        style={{ marginRight: 8 }}
                    >
                        7 Days
                    </Button>
                    <Button 
                        variant={selectedDays === 14 ? "contained" : "outlined"} 
                        onClick={() => handleDaysChange(14)}
                        size="small"
                        style={{ marginRight: 8 }}
                    >
                        14 Days
                    </Button>
                    <Button 
                        variant={selectedDays === 30 ? "contained" : "outlined"} 
                        onClick={() => handleDaysChange(30)}
                        size="small"
                    >
                        30 Days
                    </Button>
                </Box>
                <Suspense fallback={<CircularProgress />}>
                    <TimeSeriesChart 
                        data={{
                            timestamps: modelData.timeSeries.timestamps,
                            models: modelData.timeSeries.models.filter(m => 
                                m.model_name.toLowerCase() === modelInfo.model_name.toLowerCase()
                            )
                        }}
                        selectedDays={selectedDays}
                    />
                </Suspense>
            </ChartContainer>

            <TableContainer isMobile={isMobile}>
                <Typography variant="h5" gutterBottom>Performance Summary</Typography>
                <Box sx={{ 
                    padding: 2, 
                    border: "1px solid rgba(255,255,255,0.2)", 
                    borderRadius: 1, 
                    backgroundColor: "#663399", 
                    color: "#ffffff" 
                }}>
                    <Typography variant="h6" color="white">{title}</Typography>
                    {modelData.table.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography color="white">
                                <strong>Average Speed:</strong> {modelData.table[0].tokens_per_second_mean.toFixed(2)} tokens/sec
                            </Typography>
                            <Typography color="white">
                                <strong>Min Speed:</strong> {modelData.table[0].tokens_per_second_min.toFixed(2)} tokens/sec
                            </Typography>
                            <Typography color="white">
                                <strong>Max Speed:</strong> {modelData.table[0].tokens_per_second_max.toFixed(2)} tokens/sec
                            </Typography>
                            <Typography color="white">
                                <strong>Average Time to First Token:</strong> {modelData.table[0].time_to_first_token_mean.toFixed(2)} ms
                            </Typography>
                        </Box>
                    )}
                </Box>
            </TableContainer>
        </MainContainer>
    );
};

export default ModelDetail; 