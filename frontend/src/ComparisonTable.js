// ComparisonTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const ComparisonTable = ({ comparisonData }) => {
    const columns = [
        { field: 'model_name', headerName: 'Model Name', width: 250 },
        {
            field: 'model_size',
            headerName: 'Params (M)',
            renderCell: (params) => params.row.formatted_model_size
        },
        { field: 'quantization_bits', headerName: 'Quant Bits', width: 120 },
        { field: 'comparison', headerName: 'Tokens/Second', width: 400 },
        { field: 'fastest_framework', headerName: 'Winner', width: 120 }
    ];

    const rows = comparisonData.map((row, index) => ({
        id: index,
        ...row,
        comparison: JSON.stringify(row.comparison),

    }));

    return (
        <div style={{ height: 500, width: '100%' }}>
            <DataGrid rows={rows} columns={columns} pageSize={10} />
        </div>
    );
};

export default ComparisonTable;