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
        width: 100,
    },
    {
        field: "tokens_per_second_max",
        headerName: "Max",
        type: "number",
        width: 100,
    },
];


const RawCloudTable = ({ benchmarks }) => {
    const rows = benchmarks.map((row, index) => ({ id: index, ...row }));
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
