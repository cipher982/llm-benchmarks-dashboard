// ComparisonTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const ComparisonTable = ({ comparisonData }) => {
    const frameworks = [...new Set(comparisonData.map(item => Object.keys(item.comparison)))];

    const columns = [
        { field: 'model_name', headerName: 'Model Name', width: 250 },
        {
            field: 'model_size',
            headerName: 'Params (M)',
            renderCell: (params) => params.row.formatted_model_size
        },
        { field: 'quantization_bits', headerName: 'Quantization Bits', width: 120 },
        { field: 'comparison', headerName: 'Tokens/Second', width: 500 },
    ];

    const rows = comparisonData.map((row, index) => ({
        id: index,
        ...row,
        comparison: JSON.stringify(row.comparison),

    }));

    return (
        <div style={{ height: 400, width: '100%' }}>
            <DataGrid rows={rows} columns={columns} pageSize={5} />
        </div>
    );
};

export default ComparisonTable;