// src/ComparisonTable.js
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const ComparisonTable = ({ comparisonData }) => {
    // Extract unique frameworks from comparisonData
    const frameworks = [...new Set(comparisonData.map(item => Object.keys(item.comparison)))];

    // Define the columns for the DataGrid
    const columns = [
        { field: 'model_name', headerName: 'Model Name', width: 200 },
        { field: 'quantization_bits', headerName: 'Quantization Bits', width: 200 },
        { field: 'comparison', headerName: 'Comparison', width: 500 },
    ];

    // Define the rows for the DataGrid
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