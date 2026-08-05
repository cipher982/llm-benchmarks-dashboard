/**
 * Full results.
 *
 * Every model the site measured in the window, with the distribution carried
 * inside the row: a min·mean·max strip on a scale shared down the column, and a
 * trend sparkline. That is the point of the Console layout — the table is not a
 * fallback beneath the charts, it is the densest chart on the page.
 *
 * Numeric columns are right-aligned mono with tabular figures. Lifecycle state
 * is a dot plus a word, with the reasoning behind it in a tooltip rather than
 * spent on screen.
 */

import React, { useMemo } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import Link from 'next/link';
import { Tooltip } from '@mui/material';
import { TableRow } from '../../../types/ProcessedData';
import TanStackTable from '../TanStackTable';
import { colors, typography } from '../../design-system';
import { Sparkline, RangeStrip, StateDot } from '../../charts/marks';
import { spreadPercent, stabilityOf, fmt } from '../../../utils/chartMath';
import { trackUmamiEvent } from '../../../utils/analytics';

interface RawCloudTableProps {
    data: TableRow[];
    /**
     * Throughput history keyed by `provider/model`, for the trend column. The
     * page holds the time series; the table only draws it.
     */
    trends?: Map<string, (number | null)[]>;
}

/**
 * Lifecycle vocabulary. Three semantic colours and no others — the previous
 * table used eight hand-picked hex values chosen for contrast against a beige
 * surface that no longer exists.
 */
const STATUS_DISPLAY: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
    active: { label: 'active', tone: 'ok' },
    monitor: { label: 'monitor', tone: 'warn' },
    failing: { label: 'failing', tone: 'bad' },
    stale: { label: 'stale', tone: 'warn' },
    likely_deprecated: { label: 'likely dep.', tone: 'bad' },
    deprecated: { label: 'deprecated', tone: 'bad' },
    disabled: { label: 'disabled', tone: 'warn' },
    never_succeeded: { label: 'never ran', tone: 'bad' },
};

const linkStyle: React.CSSProperties = {
    color: 'inherit',
    textDecoration: 'none',
    borderBottom: `1px solid ${colors.rule}`,
};

const modelStyle: React.CSSProperties = {
    ...linkStyle,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
};

const providerStyle: React.CSSProperties = {
    ...linkStyle,
    color: colors.textDim,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
};

const dim: React.CSSProperties = { color: colors.textMute };

const RawCloudTable: React.FC<RawCloudTableProps> = ({ data, trends }) => {
    // Shared ceiling for the range strips. Computed once so a row's strip means
    // the same thing as the row above it.
    const scaleMax = useMemo(
        () => Math.max(...data.map((r) => r.tokens_per_second_max || 0), 1),
        [data],
    );

    const columns = useMemo<ColumnDef<TableRow>[]>(() => [
        // No rank column. The mock carried one because it rendered a fixed
        // sorted list; here every column sorts, so a rank would either show the
        // pre-sort index (wrong) or renumber under the reader (useless).
        {
            accessorKey: 'model_name',
            header: 'Model',
            size: 210,
            cell: ({ row, getValue }) => {
                const modelName = getValue() as string;
                const label =
                    modelName || row.original.modelCanonical || row.original.modelSlug || 'unknown-model';
                const { providerSlug, modelSlug } = row.original;

                if (!providerSlug || !modelSlug) {
                    return <span style={{ fontFamily: typography.fontFamily }}>{label}</span>;
                }

                return (
                    <Link
                        href={`/models/${providerSlug}/${modelSlug}`}
                        style={modelStyle}
                        onClick={() =>
                            trackUmamiEvent('model_click', {
                                source: 'cloud_table',
                                provider: row.original.providerCanonical,
                                providerSlug,
                                model: row.original.modelCanonical,
                                modelSlug,
                            })
                        }
                    >
                        {label}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'provider',
            header: 'Provider',
            size: 110,
            cell: ({ row, getValue }) => {
                const providerName = getValue() as string;
                const { providerSlug } = row.original;

                if (!providerSlug) return <span style={providerStyle}>{providerName}</span>;

                return (
                    <Link
                        href={`/providers/${providerSlug}`}
                        style={providerStyle}
                        onClick={() =>
                            trackUmamiEvent('provider_click', {
                                source: 'cloud_table',
                                provider: row.original.providerCanonical,
                                providerSlug,
                            })
                        }
                    >
                        {providerName}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'lifecycle_status',
            header: 'State',
            size: 120,
            enableSorting: false,
            cell: ({ row }) => {
                const {
                    lifecycle_status,
                    lifecycle_confidence,
                    lifecycle_reasons,
                    lifecycle_recommended_actions,
                    lifecycle_computed_at,
                    lifecycle_catalog_state,
                    deprecated,
                } = row.original;

                const effectiveStatus = lifecycle_status || (deprecated ? 'deprecated' : 'active');
                const meta = STATUS_DISPLAY[effectiveStatus] || STATUS_DISPLAY.active;

                const label = (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            color: colors.textDim,
                            fontSize: typography.sizes.micro,
                            letterSpacing: typography.tracking.tag,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <StateDot state={meta.tone} />
                        {meta.label}
                    </span>
                );

                // The reasoning behind a lifecycle verdict is worth keeping but
                // not worth a column; it goes in a tooltip.
                const detail: React.ReactNode[] = [];
                if (lifecycle_confidence && effectiveStatus !== 'active') {
                    detail.push(<div key="c"><strong>Confidence:</strong> {lifecycle_confidence}</div>);
                }
                if (lifecycle_catalog_state) {
                    detail.push(<div key="k"><strong>Catalog:</strong> {lifecycle_catalog_state}</div>);
                }
                if (lifecycle_computed_at) {
                    detail.push(
                        <div key="t">
                            <strong>Evaluated:</strong> {new Date(lifecycle_computed_at).toLocaleString()}
                        </div>,
                    );
                }
                const reasons = (lifecycle_reasons || []).filter(Boolean).slice(0, 5);
                if (reasons.length) {
                    detail.push(
                        <div key="r">
                            <strong>Reasons</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                {reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                            </ul>
                        </div>,
                    );
                }
                const actions = (lifecycle_recommended_actions || []).filter(Boolean).slice(0, 5);
                if (actions.length) {
                    detail.push(
                        <div key="a">
                            <strong>Recommended</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                {actions.map((action, i) => <li key={i}>{action}</li>)}
                            </ul>
                        </div>,
                    );
                }

                if (!detail.length) return label;

                return (
                    <Tooltip arrow title={<div style={{ maxWidth: 280 }}>{detail}</div>}>
                        {label}
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'last_benchmark_date',
            header: 'Age',
            size: 74,
            meta: { align: 'right' },
            cell: ({ getValue }) => {
                const last = getValue() as string | undefined;
                if (!last) return <span style={dim}>—</span>;

                const date = new Date(last);
                const hours = (Date.now() - date.getTime()) / 3_600_000;

                const text =
                    hours < 1 ? `${Math.max(Math.floor(hours * 60), 0)}m`
                        : hours < 24 ? `${Math.floor(hours)}h`
                            : `${Math.floor(hours / 24)}d`;

                return (
                    <Tooltip arrow title={date.toLocaleString()}>
                        <span style={hours > 48 ? { color: colors.warn } : dim}>{text}</span>
                    </Tooltip>
                );
            },
        },
        {
            id: 'range',
            header: 'min·mean·max',
            size: 132,
            enableSorting: false,
            cell: ({ row }) => (
                <RangeStrip
                    min={row.original.tokens_per_second_min}
                    mean={row.original.tokens_per_second_mean}
                    max={row.original.tokens_per_second_max}
                    scaleMax={scaleMax}
                />
            ),
        },
        {
            accessorKey: 'tokens_per_second_mean',
            header: 'Mean',
            size: 78,
            meta: { align: 'right' },
            cell: ({ row, getValue }) => {
                const value = getValue() as number;
                const basis = row.original.throughput_basis;
                const title =
                    basis === 'visible'
                        ? 'Every recent sample carries visible-token throughput.'
                        : basis === 'mixed'
                            ? 'Recent samples mix visible-token throughput with legacy generated throughput.'
                            : 'Visible-token throughput is unavailable, so this uses generated throughput.';

                return (
                    <Tooltip arrow title={title}>
                        <span style={{ cursor: 'help' }}>{fmt.int(value)}</span>
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'generated_tokens_per_second_mean',
            header: 'Gen',
            size: 70,
            meta: { align: 'right' },
            cell: ({ getValue }) => {
                const value = getValue() as number | undefined;
                return (
                    <Tooltip arrow title="Generated throughput, including hidden reasoning tokens where providers report them.">
                        <span style={{ ...dim, cursor: 'help' }}>{fmt.int(value)}</span>
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'tokens_per_second_min',
            header: 'Min',
            size: 64,
            meta: { align: 'right' },
            cell: ({ getValue }) => <span style={dim}>{fmt.int(getValue() as number)}</span>,
        },
        {
            accessorKey: 'tokens_per_second_max',
            header: 'Max',
            size: 64,
            meta: { align: 'right' },
            cell: ({ getValue }) => <span style={dim}>{fmt.int(getValue() as number)}</span>,
        },
        {
            id: 'spread',
            header: 'Spread',
            size: 76,
            meta: { align: 'right' },
            accessorFn: (row) =>
                spreadPercent(row.tokens_per_second_min, row.tokens_per_second_mean, row.tokens_per_second_max) ?? -1,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (value < 0) return <span style={dim}>—</span>;
                const state = stabilityOf(value);
                return (
                    <span style={{ color: state === 'unstable' ? colors.bad : state === 'variable' ? colors.warn : colors.text }}>
                        {fmt.pct(value)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'time_to_first_token_mean',
            header: 'TTFT',
            size: 72,
            meta: { align: 'right' },
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (!value) return <span style={dim}>—</span>;
                return <span>{value.toFixed(2)}</span>;
            },
        },
        {
            accessorKey: 'samples',
            header: 'n',
            size: 56,
            meta: { align: 'right' },
            cell: ({ getValue }) => <span style={dim}>{fmt.int(getValue() as number | undefined)}</span>,
        },
        {
            id: 'trend',
            header: 'Trend',
            size: 72,
            enableSorting: false,
            cell: ({ row }) => {
                const key = `${row.original.providerCanonical}/${row.original.model_name}`;
                const values = trends?.get(key);
                if (!values) return <span style={dim}>—</span>;
                return <Sparkline values={values} />;
            },
        },
    ], [scaleMax, trends]);

    const tableData = useMemo(() => data.map((row, index) => ({ id: index, ...row })), [data]);

    const initialSorting: SortingState = [{ id: 'tokens_per_second_mean', desc: true }];

    return (
        <TanStackTable
            data={tableData}
            columns={columns}
            height={620}
            virtualized={data.length > 100}
            sortable={true}
            initialSorting={initialSorting}
        />
    );
};

export default RawCloudTable;
