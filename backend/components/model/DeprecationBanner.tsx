import React from "react";
import { Alert, AlertTitle, Box, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface DeprecationBannerProps {
    modelName: string;
    status: string;
    lastUpdated?: string;
}

const statusMessages: Record<string, { title: string; description: string }> = {
    deprecated: {
        title: "Deprecated Model",
        description: "This model has been deprecated by the provider. Historical benchmark data is preserved for reference, but no new measurements are being collected.",
    },
    stale: {
        title: "Stale Data",
        description: "This model has not returned successful benchmark results recently. The data shown may be outdated.",
    },
    failing: {
        title: "Benchmark Failures",
        description: "Recent benchmark attempts for this model have been failing. The data shown reflects the last successful runs.",
    },
    likely_deprecated: {
        title: "Possibly Deprecated",
        description: "This model may have been deprecated or discontinued. No recent benchmark data is available.",
    },
    disabled: {
        title: "Benchmarking Disabled",
        description: "Benchmarking has been disabled for this model. Historical data is preserved for reference.",
    },
    never_succeeded: {
        title: "No Successful Benchmarks",
        description: "This model has never returned successful benchmark results. It may be misconfigured or unavailable.",
    },
};

const DeprecationBanner: React.FC<DeprecationBannerProps> = ({ modelName, status, lastUpdated }) => {
    const message = statusMessages[status] || {
        title: "Limited Data",
        description: "This model has limited benchmark data available.",
    };

    return (
        <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{
                mb: 3,
                "& .MuiAlert-message": { width: "100%" },
            }}
        >
            <AlertTitle sx={{ fontWeight: 600 }}>{message.title}</AlertTitle>
            <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    {message.description}
                </Typography>
                {lastUpdated && (
                    <Typography variant="caption" color="text.secondary">
                        Last benchmark: {new Date(lastUpdated).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </Typography>
                )}
            </Box>
        </Alert>
    );
};

export default DeprecationBanner;
