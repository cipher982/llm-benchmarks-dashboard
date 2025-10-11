import React from "react";
import Link from "next/link";
import { Breadcrumbs, Typography } from "@mui/material";

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
                    <Link key={item.label} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
                        {item.label}
                    </Link>
                );
            })}
        </Breadcrumbs>
    );
};

export default PageBreadcrumbs;
