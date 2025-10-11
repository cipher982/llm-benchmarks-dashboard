import React from "react";
import { Card, CardContent, Grid, Typography } from "@mui/material";

export interface MetricSummaryItem {
    label: string;
    value: string;
    helperText?: string;
}

interface MetricSummaryGridProps {
    items: MetricSummaryItem[];
}

const MetricSummaryGrid: React.FC<MetricSummaryGridProps> = ({ items }) => {
    return (
        <Grid container spacing={3}>
            {items.map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item.label}>
                    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}>
                        <CardContent>
                            <Typography variant="overline" sx={{ color: "text.secondary" }}>
                                {item.label}
                            </Typography>
                            <Typography variant="h5" component="p" sx={{ fontWeight: 600, mt: 1 }}>
                                {item.value}
                            </Typography>
                            {item.helperText && (
                                <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                                    {item.helperText}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};

export default MetricSummaryGrid;
