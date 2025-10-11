import React from "react";
import { Box, Typography } from "@mui/material";

interface SectionProps {
    title: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, eyebrow, actions, children }) => {
    return (
        <Box component="section" sx={{ display: "grid", gap: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: { xs: "flex-start", md: "center" } }}>
                {eyebrow && (
                    <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                        {eyebrow}
                    </Typography>
                )}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 2, flexWrap: "wrap" }}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                        {title}
                    </Typography>
                    {actions}
                </Box>
            </Box>
            <Box>
                {children}
            </Box>
        </Box>
    );
};

export default Section;
