/**
 * One table for a whole status section.
 *
 * The previous layout gave every provider its own bordered container with its
 * own header and its own table — nineteen of them per section, three sections,
 * which is most of how `/status` reached 26,376px. Provider is a column here, so
 * a section is one table however many providers it spans, and the page can be
 * read by scrolling one axis instead of hunting section headers.
 */

import React from 'react';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { colors, typography, spacing } from '../design-system';
import { ModelData, formatWarningLabel } from '../../utils/status/statusHelpers';
import { createSlug } from '../../utils/seoUtils';

interface StatusTableProps {
    models: ModelData[];
    /** Adds the deprecation date and successor column. */
    showDeprecation?: boolean;
}

const Table = styled('table')({
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: typography.monoFamily,
    fontVariantNumeric: 'tabular-nums',

    '& thead th': {
        textAlign: 'left',
        fontSize: typography.sizes.micro,
        fontWeight: typography.weights.medium,
        letterSpacing: typography.tracking.label,
        textTransform: 'uppercase',
        color: colors.textMute,
        padding: `${spacing.scale[2]}px ${spacing.scale[3]}px`,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.rule}`,
        whiteSpace: 'nowrap',
    },

    '& tbody td': {
        padding: `${spacing.scale[1]}px ${spacing.scale[3]}px`,
        borderBottom: `1px solid ${colors.ruleSoft}`,
        fontSize: typography.sizes.sm,
        color: colors.text,
        whiteSpace: 'nowrap',
        height: '26px',
    },
    '& tbody tr:nth-of-type(even) td': { backgroundColor: colors.zebra },
    '& tbody tr:hover td': { backgroundColor: colors.raised },
});

const ProviderTag = styled('td')({
    color: colors.textDim,
    fontSize: `${typography.sizes.micro} !important`,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',

    '& a': {
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: `1px solid ${colors.rule}`,
    },
    '& a:hover': { color: colors.text, borderBottomColor: colors.accent },
});

const ModelName = styled('td')({
    fontFamily: typography.fontFamily,
    fontSize: `${typography.sizes.md} !important`,
});

const Dim = styled('td')({
    color: colors.textMute,
    fontSize: `${typography.sizes.micro} !important`,
});

/**
 * The run history strip: ten cells, most recent last. A run is a 7px block, not
 * an emoji — at ten per row the emoji were doing the work of a bar chart while
 * looking like decoration, and they set the row height.
 */
const History = styled('td')({
    lineHeight: 0,

    '& span': {
        display: 'inline-block',
        width: '7px',
        height: '12px',
        marginRight: '2px',
        verticalAlign: 'middle',
    },
    '& span[data-ok="true"]': { background: colors.ok },
    '& span[data-ok="false"]': { background: colors.bad },
});

const Warnings = styled('td')({
    '& b': {
        display: 'inline-block',
        marginRight: `${spacing.scale[2]}px`,
        color: colors.warn,
        fontWeight: typography.weights.normal,
        fontSize: typography.sizes.micro,
        letterSpacing: typography.tracking.tag,
        textTransform: 'uppercase',
    },
});

/** Warning labels without the emoji the old formatter prefixed them with. */
const plainWarning = (warning: string): string =>
    formatWarningLabel(warning).replace(/^[^\w]+/, '').trim();

const StatusTable: React.FC<StatusTableProps> = ({ models, showDeprecation = false }) => {
    if (!models.length) return null;

    const sorted = [...models].sort(
        (a, b) => a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model),
    );

    return (
        <Table>
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Provider</th>
                    <th>Last run</th>
                    <th>Last 10 runs</th>
                    <th>Warnings</th>
                    {showDeprecation && <th>Deprecated</th>}
                </tr>
            </thead>
            <tbody>
                {sorted.map((model) => {
                    const latest = model.runs.length ? model.runs[model.runs.length - 1] : null;
                    return (
                        <tr key={`${model.provider}-${model.model}`}>
                            <ModelName>{model.model}</ModelName>
                            {/* Provider only. The status payload carries the raw
                                model id, not `modelCanonical`, so a model URL
                                derived from it would 404 for anything the
                                catalogue renames — a broken link is worse than
                                no link. The provider field is the canonical
                                provider, which is exactly what the slug is
                                built from. */}
                            <ProviderTag>
                                <Link href={`/providers/${createSlug(model.provider)}`}>{model.provider}</Link>
                            </ProviderTag>
                            <Dim>{model.last_run_relative}</Dim>
                            <History>
                                {model.runs.length ? (
                                    model.runs.map((success, i) => (
                                        <span
                                            key={i}
                                            data-ok={String(success)}
                                            title={success ? 'success' : 'failure'}
                                        />
                                    ))
                                ) : (
                                    <span style={{ background: colors.rule }} title="no data" />
                                )}
                                <span
                                    className="sr-only"
                                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                                >
                                    {model.runs.length
                                        ? `${model.runs.filter(Boolean).length} of ${model.runs.length} recent runs succeeded, most recent ${latest ? 'succeeded' : 'failed'}`
                                        : 'no recent runs'}
                                </span>
                            </History>
                            <Warnings>
                                {model.warnings.length
                                    ? model.warnings.map((warning, i) => <b key={i}>{plainWarning(warning)}</b>)
                                    : <span style={{ color: colors.textMute }}>—</span>}
                            </Warnings>
                            {showDeprecation && (
                                <Dim>
                                    {model.deprecation_date
                                        ? new Date(model.deprecation_date).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                        })
                                        : '—'}
                                    {model.successor_model ? ` → ${model.successor_model}` : ''}
                                </Dim>
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};

export default React.memo(StatusTable);
