import React, { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { GridSortModel } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';


interface Benchmark {
    provider: string;
    model_name: string;
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    time_to_first_token_mean: number;
}

interface RawCloudTableProps {
    benchmarks: Benchmark[];
}

// Table columns and their properties
const columns = [
    { field: "provider", headerName: "Provider", width: 150 },
    { field: "model_name", headerName: "Model Name", width: 200 },
    {
        field: "tokens_per_second_mean",
        headerName: "Toks/Sec (Mean)",
        type: "number",
        width: 150,
    },
    {
        field: "tokens_per_second_min",
        headerName: "Min",
        type: "number",
        width: 80,
    },
    {
        field: "tokens_per_second_max",
        headerName: "Max",
        type: "number",
        width: 80,
    },
    {
        field: "time_to_first_token_mean",
        headerName: "First Token",
        type: "number",
        width: 120,
    },
];


const RawCloudTable: React.FC<RawCloudTableProps> = ({ benchmarks }) => {
    const theme = useTheme();

    const [sortModel, setSortModel] = useState<GridSortModel>([
        {
            field: 'tokens_per_second_mean',
            sort: 'desc',
        },
    ]);

    const rows = benchmarks.map((row, index) => ({
        id: index,
        provider: row.provider,
        model_name: row.model_name,
        tokens_per_second_mean: row.tokens_per_second_mean,
        tokens_per_second_min: Math.floor(row.tokens_per_second_min),
        tokens_per_second_max: Math.ceil(row.tokens_per_second_max),
        time_to_first_token_mean: row.time_to_first_token_mean,
    }));
    return (
        <Box sx={{ height: 800, width: '100%', border: "1px solid white" }}>
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