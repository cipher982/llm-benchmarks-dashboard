import React, { useState } from 'react';
import { DataGrid, GridColDef, GridSortModel } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { TableRow } from '../../types/ProcessedData';

interface RawCloudTableProps {
    data: TableRow[];
}

const columns: GridColDef[] = [
    { field: "provider", headerName: "Provider", width: 150 },
    { field: "model_name", headerName: "Model Name", width: 200 },
    {
        field: "tokens_per_second_mean",
        headerName: "Toks/Sec (Mean)",
        type: "number",
        width: 150,
        valueGetter: (params: { row: TableRow }) => Number(params.row.tokens_per_second_mean).toFixed(2)
    },
    {
        field: "tokens_per_second_min",
        headerName: "Min",
        type: "number",
        width: 80,
        valueGetter: (params: { row: TableRow }) => Math.floor(params.row.tokens_per_second_min)
    },
    {
        field: "tokens_per_second_max",
        headerName: "Max",
        type: "number",
        width: 80,
        valueGetter: (params: { row: TableRow }) => Math.ceil(params.row.tokens_per_second_max)
    },
    {
        field: "time_to_first_token_mean",
        headerName: "First Token",
        type: "number",
        width: 120,
        valueGetter: (params: { row: TableRow }) => Number(params.row.time_to_first_token_mean).toFixed(2)
    }
];

const RawCloudTable: React.FC<RawCloudTableProps> = ({ data }) => {
    const theme = useTheme();
    // console.log('RawCloudTable received data:', data);

    const [sortModel, setSortModel] = useState<GridSortModel>([
        {
            field: 'tokens_per_second_mean',
            sort: 'desc',
        },
    ]);

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