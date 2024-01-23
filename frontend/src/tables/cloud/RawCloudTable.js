// RawCloudTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

// Table columns and their properties
const columns = [
    { field: "provider", headerName: "Provider", width: 150 },
    { field: "model_name", headerName: "Model Name", width: 260 },
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
        width: 60,
    },
    {
        field: "tokens_per_second_max",
        headerName: "Max",
        type: "number",
        width: 60,
    },
    {
        field: "time_to_first_token_mean",
        headerName: "First Token",
        type: "number",
        width: 100,
    },
];


const RawCloudTable = ({ benchmarks }) => {
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
        <DataGrid
            rows={rows}
            columns={columns}
            pageSize={100}
            sortModel={[
                {
                    field: 'tokens_per_second_mean',
                    sort: 'desc',
                },
            ]} />
    );
};

export default RawCloudTable;
