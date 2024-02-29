import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

interface Benchmark {
    framework: string;
    model_name: string;
    model_size?: number;
    formatted_model_size?: string;
    tokens_per_second: number;
    gpu_mem_usage: number;
    quantization_method: string;
    quantization_bits: number;
}

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
    benchmarks: Benchmark[];
}

const RawLocalTable: React.FC<RawLocalTableProps> = ({ benchmarks }) => (
    <DataGrid
        rows={benchmarks}
        columns={columns}
        pageSize={100}
        checkboxSelection
    />
);

export default RawLocalTable;