// BenchmarksTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

// Table columns and their properties
const columns = [
    { field: "framework", headerName: "Framework", width: 120 },
    { field: "model_name", headerName: "Model Name", width: 250 },
    {
        field: 'model_size',
        headerName: 'Params (M)',
        renderCell: (params) => params.row.formatted_model_size
    },
    { field: "tokens_per_second", headerName: "Tokens/Second", type: "number", width: 120 },
    { field: "gpu_mem_usage", headerName: "VRAM (GB)", type: "number", width: 120 },
    { field: "quantization_bits", headerName: "Quantization", width: 120 },
    { field: "model_dtype", headerName: "Model Dtype", width: 150 }
];


const BenchmarksTable = ({ benchmarks }) => (
    <DataGrid
        rows={benchmarks}
        columns={columns}
        pageSizeOptions={[10, 25]}
        checkboxSelection
        initialState={{
            pagination: {
                paginationModel: { page: 0, pageSize: 10 },
            },
        }}
    />
);

export default BenchmarksTable;
