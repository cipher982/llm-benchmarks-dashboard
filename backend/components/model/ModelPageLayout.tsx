import React from "react";
import { Box, Container, Typography, Divider } from "@mui/material";

interface ModelPageLayoutProps {
    title: string;
    subtitle?: string;
    intro?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
}

const ModelPageLayout: React.FC<ModelPageLayoutProps> = ({
    title,
    subtitle,
    intro,
    breadcrumbs,
    children,
}) => {
    return (
        <Box sx={{ bgcolor: "background.default", color: "text.primary", minHeight: "100vh" }}>
            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                {breadcrumbs && (
                    <Box sx={{ mb: 2 }}>
                        {breadcrumbs}
                    </Box>
                )}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="subtitle1" sx={{ mt: 1, color: "text.secondary" }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {intro && (
                    <Box sx={{ mb: 5 }}>
                        {intro}
                    </Box>
                )}
                <Divider sx={{ mb: 4 }} />
                <Box component="main" sx={{ display: "grid", gap: { xs: 4, md: 6 } }}>
                    {children}
                </Box>
            </Container>
        </Box>
    );
};

export default ModelPageLayout;
