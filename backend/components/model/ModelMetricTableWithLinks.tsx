import React from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
} from "@mui/material";

/**
 * `hideProvider` for the provider page, where every row is that provider and
 * the column repeats the same word down the whole table.
 */
interface ModelMetricTableWithLinksProps {
    hideProvider?: boolean;
    rows: Array<{
        provider: string;
        modelName: string;
        providerSlug?: string;
        modelSlug?: string;
        tokensPerSecondMean: number;
        tokensPerSecondMin: number;
        tokensPerSecondMax: number;
        timeToFirstTokenMean: number;
    }>;
}

const formatNumber = (value: number | null | undefined, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "--";
    }
    return Number(value).toFixed(digits);
};

const ModelMetricTableWithLinks: React.FC<ModelMetricTableWithLinksProps> = ({ rows, hideProvider = false }) => {
    if (!rows.length) {
        return <Typography variant="body2">No recent benchmark samples were recorded for this timeframe.</Typography>;
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <Table size="small" aria-label="model metrics table">
                <TableHead>
                    <TableRow>
                        {!hideProvider && <TableCell>Provider</TableCell>}
                        <TableCell>Model</TableCell>
                        <TableCell align="right">Avg Toks/Sec</TableCell>
                        <TableCell align="right">Min</TableCell>
                        <TableCell align="right">Max</TableCell>
                        <TableCell align="right">Avg TTF (ms)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        const hasLink = row.providerSlug && row.modelSlug;
                        const modelLink = hasLink ? `/models/${row.providerSlug}/${row.modelSlug}` : null;

                        return (
                            <TableRow
                                key={`${row.provider}-${row.modelName}`}
                                hover={!!hasLink}
                                sx={hasLink ? { cursor: "pointer" } : {}}
                            >
                                {!hideProvider && <TableCell>{row.provider}</TableCell>}
                                <TableCell>
                                    {modelLink ? (
                                        <Link
                                            href={modelLink}
                                            style={{
                                                color: "inherit",
                                                textDecoration: "underline",
                                                textDecorationColor: "rgba(255, 255, 255, 0.3)"
                                            }}
                                        >
                                            {row.modelName}
                                        </Link>
                                    ) : (
                                        row.modelName
                                    )}
                                </TableCell>
                                <TableCell align="right">{formatNumber(row.tokensPerSecondMean)}</TableCell>
                                <TableCell align="right">{formatNumber(row.tokensPerSecondMin)}</TableCell>
                                <TableCell align="right">{formatNumber(row.tokensPerSecondMax)}</TableCell>
                                <TableCell align="right">{formatNumber(row.timeToFirstTokenMean)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ModelMetricTableWithLinks;
