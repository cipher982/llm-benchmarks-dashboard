import React from "react";
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

interface ModelMetricTableProps {
    rows: Array<{
        provider: string;
        modelName: string;
        tokensPerSecondMean: number;
        tokensPerSecondMin: number;
        tokensPerSecondMax: number;
        timeToFirstTokenMean: number;
        modelCanonical?: string;
        transportProvider?: string;
        lifecycleStatus?: string;
        samples?: number;
    }>;
}

const RETIRED = new Set(['disabled', 'deprecated', 'likely_deprecated', 'failing', 'stale', 'never_succeeded']);

/** How the request reached the provider, and whether this lane is still collected. */
const laneLabel = (row: ModelMetricTableProps['rows'][number]): string => {
    const transport = row.transportProvider === 'openrouter' ? 'via OpenRouter' : 'direct';
    const state = row.lifecycleStatus && RETIRED.has(row.lifecycleStatus) ? ` · ${row.lifecycleStatus.replace('_', ' ')}` : '';
    return `${transport}${state}`;
};

const formatNumber = (value: number | null | undefined, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "--";
    }
    return Number(value).toFixed(digits);
};

const ModelMetricTable: React.FC<ModelMetricTableProps> = ({ rows }) => {
    if (!rows.length) {
        return <Typography variant="body2">No recent benchmark samples were recorded for this timeframe.</Typography>;
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <Table size="small" aria-label="model metrics table">
                <TableHead>
                    <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell>Lane</TableCell>
                        <TableCell align="right">Avg Toks/Sec</TableCell>
                        <TableCell align="right">Min</TableCell>
                        <TableCell align="right">Max</TableCell>
                        <TableCell align="right">Avg TTF (ms)</TableCell>
                        <TableCell align="right">n</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        const retired = Boolean(row.lifecycleStatus && RETIRED.has(row.lifecycleStatus));
                        return (
                            <TableRow
                                key={`${row.provider}-${row.modelCanonical ?? row.modelName}-${row.transportProvider ?? 'direct'}`}
                                sx={retired ? { '& td': { color: 'text.disabled' } } : undefined}
                            >
                                <TableCell>{row.provider}</TableCell>
                                <TableCell title={row.modelCanonical}>{laneLabel(row)}</TableCell>
                                <TableCell align="right">{formatNumber(row.tokensPerSecondMean)}</TableCell>
                                <TableCell align="right">{formatNumber(row.tokensPerSecondMin)}</TableCell>
                                <TableCell align="right">{formatNumber(row.tokensPerSecondMax)}</TableCell>
                                <TableCell align="right">{formatNumber(row.timeToFirstTokenMean)}</TableCell>
                                <TableCell align="right">{row.samples ?? '--'}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ModelMetricTable;
