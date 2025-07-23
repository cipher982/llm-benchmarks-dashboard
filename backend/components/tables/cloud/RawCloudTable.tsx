import React, { useState } from 'react';
import { GridColDef, GridSortModel, GridRenderCellParams } from '@mui/x-data-grid';
import { TableRow } from '../../../types/ProcessedData';
import Link from 'next/link';
import { RefinedTable } from '../../design-system/refined-table';

interface RawCloudTableProps {
    data: TableRow[];
    modelLinkFn?: (provider: string, modelName: string) => string;
}

const RawCloudTable: React.FC<RawCloudTableProps> = ({ data, modelLinkFn }) => {
    const [sortModel, setSortModel] = useState<GridSortModel>([
        {
            field: 'tokens_per_second_mean',
            sort: 'desc',
        },
    ]);

    const columns: GridColDef[] = [
        { 
            field: "provider", 
            headerName: "Provider", 
            width: 150 
        },
        { 
            field: "model_name", 
            headerName: "Model Name", 
            width: 200,
            renderCell: modelLinkFn ? (params: GridRenderCellParams) => (
                <Link 
                    href={modelLinkFn(params.row.provider, params.row.model_name)}
                    style={{ 
                        color: '#2962FF',  // Using our refined primary color
                        textDecoration: 'none',
                        borderBottom: '1px solid transparent',
                        transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderBottomColor = '#2962FF';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderBottomColor = 'transparent';
                    }}
                >
                    {params.value}
                </Link>
            ) : undefined
        },
        {
            field: "tokens_per_second_mean",
            headerName: "Toks/Sec (Mean)",
            type: "number",
            width: 150,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.tokens_per_second_mean === undefined) return 0;
                return Number(params.row.tokens_per_second_mean);
            },
            valueFormatter: (params: any) => {
                return params.value != null ? params.value.toFixed(2) : '0.00';
            }
        },
        {
            field: "tokens_per_second_min",
            headerName: "Min",
            type: "number",
            width: 80,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.tokens_per_second_min === undefined) return 0;
                return params.row.tokens_per_second_min;
            },
            valueFormatter: (params: any) => {
                return params.value != null ? Math.floor(params.value).toString() : '0';
            }
        },
        {
            field: "tokens_per_second_max",
            headerName: "Max",
            type: "number",
            width: 80,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.tokens_per_second_max === undefined) return 0;
                return params.row.tokens_per_second_max;
            },
            valueFormatter: (params: any) => {
                return params.value != null ? Math.ceil(params.value).toString() : '0';
            }
        },
        {
            field: "time_to_first_token_mean",
            headerName: "First Token",
            type: "number",
            width: 120,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.time_to_first_token_mean === undefined) return 0;
                return Number(params.row.time_to_first_token_mean);
            },
            valueFormatter: (params: any) => {
                return params.value != null ? params.value.toFixed(2) : '0.00';
            }
        }
    ];

    const rows = data.map((row, index) => ({
        id: index,
        ...row
    }));

    // Look how clean this is now! 🎉
    return (
        <RefinedTable
            rows={rows}
            columns={columns}
            sortModel={sortModel}
            onSortModelChange={(model) => setSortModel(model)}
            height={500}
        />
    );
};

export default RawCloudTable;