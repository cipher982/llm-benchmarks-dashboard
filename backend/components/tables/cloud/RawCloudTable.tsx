import React, { useMemo } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { TableRow } from '../../../types/ProcessedData';
import Link from 'next/link';
import TanStackTable from '../TanStackTable';
import { colors } from '../../../components/design-system';
import { Tooltip } from '@mui/material';

interface RawCloudTableProps {
    data: TableRow[];
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon?: string }> = {
    active: { label: 'Active', color: '#1b5e20', icon: '✓' },         // 6.45:1 contrast ✅
    monitor: { label: 'Monitor', color: '#6b4700', icon: '👀' },      // Very dark amber for 4.5:1+
    failing: { label: 'Failing', color: '#b71c1c', icon: '⚠' },       // 5.39:1 contrast ✅
    stale: { label: 'Stale', color: '#6b2900', icon: '⌛' },           // Very dark orange for 4.5:1+
    likely_deprecated: { label: 'Likely Deprecated', color: '#b71c1c', icon: '⚠' },
    deprecated: { label: 'Deprecated', color: '#b71c1c', icon: '⚠' },
    disabled: { label: 'Disabled', color: '#424242', icon: '⏸' },     // 8.24:1 contrast ✅
    never_succeeded: { label: 'Never Succeeded', color: '#fb8c00', icon: '⚠' },
};

const RawCloudTable: React.FC<RawCloudTableProps> = ({ data }) => {
    const columns = useMemo<ColumnDef<TableRow>[]>(() => [
        {
            accessorKey: 'provider',
            header: 'Provider',
            size: 150,
            cell: ({ row, getValue }) => {
                const providerName = getValue() as string;
                const providerSlug = row.original.providerSlug;

                if (!providerSlug) {
                    return providerName;
                }

                return (
                    <Link
                        href={`/providers/${providerSlug}`}
                        style={{ color: colors.link, textDecoration: 'underline' }}
                    >
                        {providerName}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'model_name',
            header: 'Model Name',
            size: 200,
            cell: ({ row, getValue }) => {
                const modelName = getValue() as string;
                const providerSlug = row.original.providerSlug;
                const modelSlug = row.original.modelSlug;

                if (providerSlug && modelSlug) {
                    return (
                        <Link
                            href={`/models/${providerSlug}/${modelSlug}`}
                            style={{ color: colors.link, textDecoration: 'underline' }}
                        >
                            {modelName}
                        </Link>
                    );
                }
                return modelName;
            },
        },
        {
            accessorKey: 'lifecycle_status',
            header: 'Status',
            size: 170,
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
                const confidenceLabel = lifecycle_confidence
                    ? lifecycle_confidence.charAt(0).toUpperCase() + lifecycle_confidence.slice(1)
                    : undefined;

                const formattedComputedAt = lifecycle_computed_at
                    ? new Date(lifecycle_computed_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    })
                    : undefined;

                const reasons = (lifecycle_reasons || []).filter(Boolean).slice(0, 5);
                const actions = (lifecycle_recommended_actions || []).filter(Boolean).slice(0, 5);

                const tooltipSections: React.ReactNode[] = [];

                if (confidenceLabel && effectiveStatus !== 'active') {
                    tooltipSections.push(<div key="confidence"><strong>Confidence:</strong> {confidenceLabel}</div>);
                }

                if (formattedComputedAt) {
                    tooltipSections.push(<div key="computed"><strong>Last evaluated:</strong> {formattedComputedAt}</div>);
                }

                if (lifecycle_catalog_state) {
                    tooltipSections.push(<div key="catalog"><strong>Catalog:</strong> {lifecycle_catalog_state}</div>);
                }

                if (reasons.length) {
                    tooltipSections.push(
                        <div key="reasons">
                            <strong>Reasons</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                {reasons.map((reason, idx) => (
                                    <li key={idx} style={{ fontSize: '0.85em' }}>{reason}</li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (actions.length) {
                    tooltipSections.push(
                        <div key="actions">
                            <strong>Recommended actions</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                {actions.map((action, idx) => (
                                    <li key={idx} style={{ fontSize: '0.85em' }}>{action}</li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                const labelNode = (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: meta.color,
                            fontSize: '0.9em',
                            fontWeight: effectiveStatus === 'active' ? 500 : 600,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {meta.icon && <span aria-hidden>{meta.icon}</span>}
                        <span>{meta.label}</span>
                        {confidenceLabel && effectiveStatus !== 'active' && (
                            <span style={{ fontSize: '0.75em' }}>({confidenceLabel})</span>
                        )}
                    </span>
                );

                if (!tooltipSections.length) {
                    return labelNode;
                }

                return (
                    <Tooltip
                        arrow
                        title={(
                            <div style={{ maxWidth: 280 }}>
                                {tooltipSections.map((section, idx) => (
                                    <div key={idx} style={{ marginBottom: idx === tooltipSections.length - 1 ? 0 : 6 }}>
                                        {section}
                                    </div>
                                ))}
                            </div>
                        )}
                    >
                        {labelNode}
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'last_benchmark_date',
            header: 'Last Updated',
            size: 150,
            cell: ({ row, getValue }) => {
                const lastDate = getValue() as string | undefined;
                const deprecated = row.original.deprecated;

                if (!lastDate) {
                    return <span style={{ color: '#666', fontStyle: 'italic' }}>Unknown</span>;
                }

                const date = new Date(lastDate);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                // Full ISO date for tooltip
                const fullDate = date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                });

                let displayText: string;
                let textColor: string;

                if (deprecated) {
                    // Show absolute date for deprecated models
                    displayText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    textColor = '#666';
                } else {
                    // Show relative time for active models
                    if (diffHours < 1) {
                        const diffMinutes = Math.floor(diffMs / (1000 * 60));
                        displayText = `${diffMinutes}m ago`;
                        textColor = '#1b5e20'; // WCAG AA compliant: 6.45:1 contrast
                    } else if (diffHours < 24) {
                        displayText = `${Math.floor(diffHours)}h ago`;
                        textColor = '#1b5e20'; // WCAG AA compliant: 6.45:1 contrast
                    } else {
                        const diffDays = Math.floor(diffHours / 24);
                        displayText = `${diffDays}d ago`;
                        textColor = diffDays > 2 ? '#6b2900' : '#1b5e20'; // WCAG AA compliant colors
                    }
                }

                return (
                    <Tooltip title={fullDate} arrow>
                        <span style={{ color: textColor, fontStyle: deprecated ? 'italic' : 'normal', cursor: 'help' }}>
                            {displayText}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'tokens_per_second_mean',
            header: 'Toks/Sec (Mean)',
            size: 150,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (value === undefined || value === null) return '0.00';
                return Number(value).toFixed(2);
            },
        },
        {
            accessorKey: 'tokens_per_second_min',
            header: 'Min',
            size: 80,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (value === undefined || value === null) return '0';
                return Math.floor(value).toString();
            },
        },
        {
            accessorKey: 'tokens_per_second_max',
            header: 'Max',
            size: 80,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (value === undefined || value === null) return '0';
                return Math.ceil(value).toString();
            },
        },
        {
            accessorKey: 'time_to_first_token_mean',
            header: 'First Token (ms)',
            size: 120,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (value === undefined || value === null) return '0.00';
                // Convert from seconds to milliseconds
                return Number(value * 1000).toFixed(2);
            },
        },
    ], []);

    const tableData = useMemo(() => 
        data.map((row, index) => ({
            id: index,
            ...row
        }))
    , [data]);

    const initialSorting: SortingState = [{
        id: 'tokens_per_second_mean',
        desc: true
    }];

    return (
        <TanStackTable
            data={tableData}
            columns={columns}
            height={500}
            virtualized={data.length > 100}
            sortable={true}
            initialSorting={initialSorting}
        />
    );
};

export default RawCloudTable;
