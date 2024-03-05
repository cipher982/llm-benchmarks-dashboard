import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

interface ComparisonDataRow {
    model_name: string;
    formatted_model_size: string;
    quantization_bits: number;
    comparison: Record<string, any>; // Assuming a key-value pair structure. Adjust the `any` to a more specific type if possible.
    fastest_framework: string;
}

interface ComparisonTableProps {
    comparisonData: ComparisonDataRow[];
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ comparisonData }) => {
    const columns: GridColDef[] = [
        { field: 'model_name', headerName: 'Model Name', width: 300 },
        {
            field: 'model_size',
            headerName: 'Params (M)',
            width: 150,
            renderCell: ({ row }: { row: ComparisonDataRow }) => row.formatted_model_size
        },
        { field: 'quantization_bits', headerName: 'Quant Bits', width: 120 },
        { field: 'comparison', headerName: 'Tokens/Second', width: 320 },
        { field: 'fastest_framework', headerName: 'Winner', width: 120 }
    ];

    const rows = comparisonData.map((row, index) => ({
        id: index,
        ...row,
        comparison: JSON.stringify(row.comparison),
    }));

    return (
        <div style={{ height: 550, width: '100%' }}>
            <Box sx={{ height: 500, border: "1px solid white" }}>
                <DataGrid rows={rows} columns={columns}
                    sx={{
                        "& .MuiDataGrid-columnHeaders": {
                            color: "white",
                            borderColor: "white",
                            fontWeight: "bold",
                        },
                        "& .MuiDataGrid-columnHeaderTitle": {
                            fontWeight: "bold !important",
                        },
                        "& .MuiDataGrid-cell": {
                            color: "white",
                            borderColor: "white",
                        },
                    }} />
            </Box>
        </div>
    );
};

export default ComparisonTable;