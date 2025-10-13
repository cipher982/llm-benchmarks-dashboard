import React from "react";
import NextLink from "next/link";
import { Breadcrumbs, Typography, Link as MuiLink } from "@mui/material";
import { styled } from "@mui/material/styles";
import type { LinkProps as MuiLinkProps } from "@mui/material/Link";

const BreadcrumbLink = styled((props: MuiLinkProps) => (
    <MuiLink {...props} />
))(({ theme }) => ({
    textDecoration: "none",
    color: theme.palette.text.primary,
    fontSize: 14,
    "&:hover": {
        textDecoration: "underline",
        color: theme.designSystem.colors.link,
    },
    "&:focus-visible": {
        outline: `2px solid ${theme.designSystem.colors.primary}`,
        outlineOffset: 2,
    },
}));

interface PageBreadcrumbsProps {
    items: Array<{ label: string; href?: string }>;
}

const PageBreadcrumbs: React.FC<PageBreadcrumbsProps> = ({ items }) => {
    return (
        <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: 14 }}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                if (isLast || !item.href) {
                    return (
                        <Typography key={item.label} color="text.primary" sx={{ fontSize: 14 }}>
                            {item.label}
                        </Typography>
                    );
                }
                return (
                    <BreadcrumbLink
                        key={item.label}
                        component={NextLink}
                        href={item.href}
                        underline="none"
                    >
                        {item.label}
                    </BreadcrumbLink>
                );
            })}
        </Breadcrumbs>
    );
};

export default PageBreadcrumbs;
