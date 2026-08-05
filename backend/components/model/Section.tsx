/**
 * Section heading for the document templates.
 *
 * This is the shared heading for the provider page, the model page and all
 * three guides, and it used to render a 600-weight `h5` — which on a page whose
 * largest type is supposed to be a measured value made "Frequently Asked
 * Questions" the loudest thing on screen. It is the same rail the dashboard
 * pages use now: an all-caps micro label on a hairline, with room for controls
 * on the right.
 */

import React from "react";
import { Box } from "@mui/material";
import { colors, typography, spacing, sizing } from "../design-system";

interface SectionProps {
    title: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, eyebrow, actions, children }) => {
    return (
        <Box component="section" sx={{ display: "grid" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: `${spacing.scale[3]}px`,
                    flexWrap: "wrap",
                    minHeight: `${sizing.sectionHeaderHeight}px`,
                    padding: `${spacing.scale[2]}px 0`,
                    borderBottom: `1px solid ${colors.rule}`,
                    marginBottom: `${spacing.scale[3]}px`,
                }}
            >
                <Box
                    component="h2"
                    sx={{
                        margin: 0,
                        color: colors.textDim,
                        fontFamily: typography.monoFamily,
                        fontSize: typography.sizes.micro,
                        fontWeight: typography.weights.medium,
                        letterSpacing: typography.tracking.label,
                        textTransform: "uppercase",
                        lineHeight: typography.lineHeights.tight,
                    }}
                >
                    {title}
                </Box>
                {eyebrow && (
                    <Box
                        component="span"
                        sx={{
                            fontFamily: typography.monoFamily,
                            fontSize: typography.sizes.micro,
                            letterSpacing: typography.tracking.tag,
                            textTransform: "uppercase",
                            color: colors.textMute,
                        }}
                    >
                        {eyebrow}
                    </Box>
                )}
                {actions && <Box sx={{ marginLeft: "auto" }}>{actions}</Box>}
            </Box>
            <Box>{children}</Box>
        </Box>
    );
};

export default Section;
