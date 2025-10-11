import React from "react";
import Link from "next/link";
import { Card, CardContent, Typography, Grid } from "@mui/material";

export interface RelatedLinkItem {
    title: string;
    description?: string;
    href: string;
}

interface RelatedLinksProps {
    items: RelatedLinkItem[];
}

const RelatedLinks: React.FC<RelatedLinksProps> = ({ items }) => {
    if (!items.length) {
        return null;
    }

    return (
        <Grid container spacing={3}>
            {items.map((item) => (
                <Grid size={{ xs: 12, md: 6 }} key={item.href}>
                    <Link href={item.href} style={{ textDecoration: "none" }}>
                        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}>
                            <CardContent>
                                <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
                                    {item.title}
                                </Typography>
                                {item.description && (
                                    <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                                        {item.description}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Link>
                </Grid>
            ))}
        </Grid>
    );
};

export default RelatedLinks;
