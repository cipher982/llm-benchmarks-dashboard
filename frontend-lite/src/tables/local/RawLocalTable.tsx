import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { LocalBenchmark } from '../../types/LocalData';
import Box from '@mui/material/Box';


const columns = [
    { field: "framework", headerName: "Framework", width: 120 },
    { field: "model_name", headerName: "Model Name", width: 270 },
    {
        field: 'model_size',
        headerName: 'Params (M)',
        renderCell: (params: any) => params.row.formatted_model_size
    },
    { field: "tokens_per_second", headerName: "Tokens/Second", type: "number", width: 120 },
    { field: "gpu_mem_usage", headerName: "VRAM (GB)", type: "number", width: 120 },
    { field: "quantization_method", headerName: "Quant Method", width: 120 },
    { field: "quantization_bits", headerName: "Quant Bits", width: 120 },
];

interface RawLocalTableProps {
    benchmarks: LocalBenchmark[];
}

const RawLocalTable: React.FC<RawLocalTableProps> = ({ benchmarks }) => (
    <Box sx={{ height: 800, width: '100%', border: "1px solid white" }}>
        <DataGrid
            rows={benchmarks}
            columns={columns}
            // pageSize={100}
            checkboxSelection
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

export default RawLocalTable;