import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { LocalBenchmark } from '../../../types/LocalData';
import TanStackTable from '../TanStackTable';

interface RawLocalTableProps {
    benchmarks: LocalBenchmark[];
}

const RawLocalTable: React.FC<RawLocalTableProps> = ({ benchmarks }) => {
    const columns = useMemo<ColumnDef<LocalBenchmark>[]>(() => [
        {
            accessorKey: 'framework',
            header: 'Framework',
            size: 120,
        },
        {
            accessorKey: 'model_name',
            header: 'Model Name',
            size: 270,
        },
        {
            accessorKey: 'formatted_model_size',
            header: 'Params (M)',
            size: 120,
        },
        {
            accessorKey: 'tokens_per_second',
            header: 'Tokens/Second',
            size: 120,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                return typeof value === 'number' ? value.toFixed(2) : value;
            },
        },
        {
            accessorKey: 'gpu_mem_usage',
            header: 'VRAM (GB)',
            size: 120,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                return typeof value === 'number' ? value.toFixed(1) : value;
            },
        },
        {
            accessorKey: 'quantization_method',
            header: 'Quant Method',
            size: 120,
        },
        {
            accessorKey: 'quantization_bits',
            header: 'Quant Bits',
            size: 120,
        },
    ], []);

    return (
        <TanStackTable
            data={benchmarks}
            columns={columns}
            height={800}
            virtualized={benchmarks.length > 100}
            sortable={true}
            initialSorting={[{ id: 'tokens_per_second', desc: true }]}
        />
    );
};

export default RawLocalTable;