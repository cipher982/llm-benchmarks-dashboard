// RawCloudTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

// Table columns and their properties
const columns = [
    { field: "provider", headerName: "Provider", width: 150 },
    { field: "model_name", headerName: "Model Name", width: 200 },
    {
        field: "tokens_per_second",
        headerName: "Tokens/Second",
        type: "number",
        width: 150,
        valueFormatter: (params) => {
            const value = parseFloat(params.value);
            return isNaN(value) ? params.value : value.toFixed(2);
        },
    }
];


const RawCloudTable = ({ benchmarks }) => {
    const rows = benchmarks.map((row, index) => ({ id: index, ...row }));
    return (
        <DataGrid
            rows={rows}
            columns={columns}
            pageSize={100}
            checkboxSelection
        />
    );
};

export default RawCloudTable;
