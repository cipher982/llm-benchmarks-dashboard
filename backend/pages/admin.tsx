import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Card,
    CardContent,
} from '@mui/material';
import { styled } from '@mui/system';

interface ModelMapping {
    _id?: string;
    provider: string;
    model_name: string;
    display_name: string;
    created_at?: string;
    updated_at?: string;
}

const AdminContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    maxWidth: '1200px',
    margin: '0 auto',
}));

const StyledCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
}));

const Admin: React.FC = () => {
    const searchParams = useSearchParams();
    const adminKey = searchParams ? searchParams.get('key') : null;
    
    const [models, setModels] = useState<ModelMapping[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelMapping | null>(null);
    const [formData, setFormData] = useState<Partial<ModelMapping>>({});

    const fetchModels = async () => {
        if (!adminKey) {
            setError('Admin key is required');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/admin-models?key=${adminKey}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            setModels(data);
            setError(null);
        } catch (err: any) {
            setError(`Failed to fetch models: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!adminKey) return;
        
        try {
            const url = editingModel 
                ? `/api/admin-models/${editingModel._id}?key=${adminKey}`
                : `/api/admin-models?key=${adminKey}`;
                
            const method = editingModel ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: formData.provider?.trim(),
                    model_name: formData.model_name?.trim(),
                    display_name: formData.display_name?.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            setSuccess(editingModel ? 'Model updated successfully' : 'Model created successfully');
            setOpenDialog(false);
            setEditingModel(null);
            setFormData({});
            fetchModels();
        } catch (err: any) {
            setError(`Failed to save model: ${err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!adminKey || !confirm('Are you sure you want to delete this model?')) return;
        
        try {
            const response = await fetch(`/api/admin-models/${id}?key=${adminKey}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            setSuccess('Model deleted successfully');
            fetchModels();
        } catch (err: any) {
            setError(`Failed to delete model: ${err.message}`);
        }
    };

    const openEditDialog = (model?: ModelMapping) => {
        setEditingModel(model || null);
        setFormData(model ? { ...model } : {});
        setOpenDialog(true);
    };

    useEffect(() => {
        if (adminKey) {
            fetchModels();
        }
    }, [adminKey]);

    if (!adminKey) {
        return (
            <AdminContainer>
                <Typography variant="h4" gutterBottom>
                    Admin Panel - Access Denied
                </Typography>
                <Typography variant="body1">
                    Please provide a valid admin key in the URL: ?key=your_admin_key
                </Typography>
            </AdminContainer>
        );
    }

    return (
        <AdminContainer>
            <Typography variant="h4" gutterBottom>
                🔧 Model Management Admin Panel 🔧
            </Typography>

            <StyledCard>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Model Mappings</Typography>
                        <Button 
                            variant="contained" 
                            onClick={() => openEditDialog()}
                            disabled={loading}
                        >
                            Add New Model
                        </Button>
                    </Box>

                    <Button 
                        variant="outlined" 
                        onClick={fetchModels} 
                        disabled={loading}
                        sx={{ mb: 2 }}
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </Button>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Provider</TableCell>
                                    <TableCell>Model Name</TableCell>
                                    <TableCell>Display Name</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {models.map((model) => (
                                    <TableRow key={model._id}>
                                        <TableCell>{model.provider}</TableCell>
                                        <TableCell>{model.model_name}</TableCell>
                                        <TableCell>{model.display_name}</TableCell>
                                        <TableCell>
                                            {model.created_at 
                                                ? new Date(model.created_at).toLocaleDateString()
                                                : 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                size="small" 
                                                onClick={() => openEditDialog(model)}
                                                sx={{ mr: 1 }}
                                            >
                                                Edit
                                            </Button>
                                            <Button 
                                                size="small" 
                                                color="error"
                                                onClick={() => model._id && handleDelete(model._id)}
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </StyledCard>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingModel ? 'Edit Model' : 'Add New Model'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Provider"
                        value={formData.provider || ''}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Model Name"
                        value={formData.model_name || ''}
                        onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Display Name"
                        value={formData.display_name || ''}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        margin="normal"
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingModel ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={!!error} 
                autoHideDuration={6000} 
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>

            <Snackbar 
                open={!!success} 
                autoHideDuration={4000} 
                onClose={() => setSuccess(null)}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>
        </AdminContainer>
    );
};

export default Admin;