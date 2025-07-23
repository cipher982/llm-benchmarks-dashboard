import React from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { LocalBenchmark } from '../../../types/LocalData';
import { RefinedTable } from '../../design-system/refined-table';

const columns: GridColDef<LocalBenchmark>[] = [
    { field: "framework", headerName: "Framework", width: 120 },
    { field: "model_name", headerName: "Model Name", width: 270 },
    {
        field: 'model_size',
        headerName: 'Params (M)',
        width: 120,
        renderCell: (params: any) => params.row.formatted_model_size
    },
    { field: "tokens_per_second", headerName: "Tokens/Second", width: 120 },
    { field: "gpu_mem_usage", headerName: "VRAM (GB)", width: 120 },
    { field: "quantization_method", headerName: "Quant Method", width: 120 },
    { field: "quantization_bits", headerName: "Quant Bits", width: 120 },
];

interface RawLocalTableProps {
    benchmarks: LocalBenchmark[];
}

const RawLocalTable: React.FC<RawLocalTableProps> = ({ benchmarks }) => (
    <RefinedTable
        rows={benchmarks}
        columns={columns}
        height={800}
        enableCheckboxSelection
    />
);

export default RawLocalTable;