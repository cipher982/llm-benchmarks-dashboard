import React, { useState } from 'react';
import { DataGrid, GridColDef, GridSortModel, GridRenderCellParams } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import { TableRow } from '../../../types/ProcessedData';
import Link from 'next/link';

interface RawCloudTableProps {
    data: TableRow[];
    modelLinkFn?: (provider: string, modelName: string) => string;
}

const RawCloudTable: React.FC<RawCloudTableProps> = ({ data, modelLinkFn }) => {
    // console.log('RawCloudTable received data:', data);

    const [sortModel, setSortModel] = useState<GridSortModel>([
        {
            field: 'tokens_per_second_mean',
            sort: 'desc',
        },
    ]);

    const columns: GridColDef[] = [
        { field: "provider", headerName: "Provider", width: 150 },
        { 
            field: "model_name", 
            headerName: "Model Name", 
            width: 200,
            renderCell: modelLinkFn ? (params: GridRenderCellParams) => (
                <Link 
                    href={modelLinkFn(params.row.provider, params.row.model_name)}
                    style={{ color: '#316AC5', textDecoration: 'underline' }}
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
                if (!params.row || params.row.tokens_per_second_mean === undefined) return '0.00';
                return Number(params.row.tokens_per_second_mean).toFixed(2);
            }
        },
        {
            field: "tokens_per_second_min",
            headerName: "Min",
            type: "number",
            width: 80,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.tokens_per_second_min === undefined) return 0;
                return Math.floor(params.row.tokens_per_second_min);
            }
        },
        {
            field: "tokens_per_second_max",
            headerName: "Max",
            type: "number",
            width: 80,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.tokens_per_second_max === undefined) return 0;
                return Math.ceil(params.row.tokens_per_second_max);
            }
        },
        {
            field: "time_to_first_token_mean",
            headerName: "First Token",
            type: "number",
            width: 120,
            valueGetter: (params: { row: TableRow }) => {
                if (!params.row || params.row.time_to_first_token_mean === undefined) return '0.00';
                return Number(params.row.time_to_first_token_mean).toFixed(2);
            }
        }
    ];

    const rows = data.map((row, index) => ({
        id: index,
        ...row
    }));

    return (
        <Box sx={{ height: 500, width: '100%', border: "1px solid white" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                sortModel={sortModel}
                onSortModelChange={(model) => setSortModel(model)}
                sx={{
                    "& .MuiDataGrid-columnHeaders": {
                        color: "white",
                        borderColor: "white",
                    },
                    "& .MuiDataGrid-columnHeaderTitle": {
                        fontWeight: "bold !important",
                    },
                    "& .MuiDataGrid-cell": {
                        color: "white",
                        borderColor: "white",
                    },
                }}
            />
        </Box>
    );
};

export default RawCloudTable;