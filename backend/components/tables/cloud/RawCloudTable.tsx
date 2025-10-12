import React, { useMemo } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { TableRow } from '../../../types/ProcessedData';
import Link from 'next/link';
import TanStackTable from '../TanStackTable';
import { colors } from '../../../components/design-system';

interface RawCloudTableProps {
    data: TableRow[];
}

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
            header: 'First Token',
            size: 120,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                if (value === undefined || value === null) return '0.00';
                return Number(value).toFixed(2);
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
