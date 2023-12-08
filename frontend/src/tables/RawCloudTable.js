// RawCloudTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

// Table columns and their properties
const columns = [
    { field: "provider", headerName: "Provider", width: 120 },
    { field: "model_name", headerName: "Model Name", width: 270 },
    { field: "tokens_per_second", headerName: "Tokens/Second", type: "number", width: 120 },
];


const RawCloudTable = ({ benchmarks }) => (
    <DataGrid
        rows={benchmarks}
        columns={columns}
        pageSize={100}
        checkboxSelection

    />
);

export default RawCloudTable;
