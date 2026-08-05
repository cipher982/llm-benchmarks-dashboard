import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import TanStackTable from '../TanStackTable';
import { colors, typography } from '../../design-system';

interface ComparisonResult {
    model_name: string;
    quantization_bits: string;
    model_size?: number;
    formatted_model_size?: string;
    comparison: { [framework: string]: number };
    fastest_framework: string;
}

interface ComparisonTableProps {
    comparisonData: ComparisonResult[];
}

// Custom cell component to render comparison data in a readable format
const ComparisonCell: React.FC<{ comparison: { [framework: string]: number } }> = ({ comparison }) => {
    const sortedEntries = Object.entries(comparison)
        .sort(([, a], [, b]) => b - a) // Sort by tokens per second descending
        .slice(0, 4); // Show top 4 frameworks

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '2px',
            fontSize: typography.sizes.micro,
            lineHeight: '1.3'
        }}>
            {sortedEntries.map(([framework, tokens], index) => (
                <div key={framework} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontWeight: index === 0 ? typography.weights.medium : typography.weights.normal,
                    color: index === 0 ? colors.accent : colors.textMute
                }}>
                    <span>{framework}:</span>
                    <span>{tokens.toFixed(0)}</span>
                </div>
            ))}
        </div>
    );
};

const ComparisonTable: React.FC<ComparisonTableProps> = ({ comparisonData }) => {
    const columns = useMemo<ColumnDef<ComparisonResult>[]>(() => [
        {
            accessorKey: 'model_name',
            header: 'Model Name',
            size: 250,
        },
        {
            accessorKey: 'formatted_model_size',
            header: 'Params (M)',
            size: 120,
        },
        {
            accessorKey: 'quantization_bits',
            header: 'Quant Bits',
            size: 120,
        },
        {
            accessorKey: 'comparison',
            header: 'Tokens/Second',
            size: 280,
            cell: ({ getValue }) => {
                const comparison = getValue() as { [framework: string]: number };
                return <ComparisonCell comparison={comparison} />;
            },
        },
        {
            accessorKey: 'fastest_framework',
            header: 'Winner',
            size: 120,
            cell: ({ getValue }) => (
                <span style={{ fontWeight: typography.weights.medium, color: colors.accent }}>
                    {getValue() as string}
                </span>
            ),
        }
    ], []);

    return (
        <TanStackTable
            data={comparisonData}
            columns={columns}
            height={550}
            virtualized={comparisonData.length > 100}
            sortable={true}
            initialSorting={[{ id: 'model_name', desc: false }]}
        />
    );
};

export default ComparisonTable;