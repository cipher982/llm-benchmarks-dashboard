import React from "react";
import { Box, Typography, Divider } from "@mui/material";
import { styled } from "@mui/material/styles";
import { DesktopShell, DesktopWindow } from "../design-system/components";

interface ModelPageLayoutProps {
    title: string;
    subtitle?: string;
    intro?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
}

const PageHeading = styled(Typography)(({ theme }) => ({
    fontFamily: theme.designSystem.typography.fontFamily,
    fontWeight: theme.designSystem.typography.weights.semibold,
    color: theme.designSystem.colors.textPrimary,
}));

const PageSubtitle = styled(Typography)(({ theme }) => ({
    fontFamily: theme.designSystem.typography.fontFamily,
    fontWeight: theme.designSystem.typography.weights.normal,
    color: theme.designSystem.colors.textSecondary,
}));

const ModelPageLayout: React.FC<ModelPageLayoutProps> = ({
    title,
    subtitle,
    intro,
    breadcrumbs,
    children,
}) => {
    return (
        <DesktopShell>
            <DesktopWindow>
                {breadcrumbs && (
                    <Box sx={{ mb: { xs: 1, md: 2 } }}>
                        {breadcrumbs}
                    </Box>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: { xs: 2, md: 3 } }}>
                    <PageHeading variant="h3" component="h1">
                        {title}
                    </PageHeading>
                    {subtitle && (
                        <PageSubtitle variant="subtitle1">
                            {subtitle}
                        </PageSubtitle>
                    )}
                </Box>
                {intro && (
                    <Box sx={{ mb: { xs: 3, md: 4 }, display: "grid", gap: 2 }}>
                        {intro}
                    </Box>
                )}
                <Divider sx={{ borderColor: "divider", mb: { xs: 3, md: 4 } }} />
                <Box component="main" sx={{ display: "grid", gap: { xs: 3, md: 5 } }}>
                    {children}
                </Box>
            </DesktopWindow>
        </DesktopShell>
    );
};

export default ModelPageLayout;
