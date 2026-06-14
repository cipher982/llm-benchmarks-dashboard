import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { styled } from '@mui/system';

type ReviewModel = {
  provider: string;
  model_id: string;
  display_name?: string;
  enabled?: boolean;
  deprecated?: boolean;
  created_at?: string;
  imported_from?: string;
  promotion_status?: string;
  promotion_source?: string;
  promotion_confidence?: number;
  promotion_reasoning?: string;
  promotion_detected_at?: string;
  promotion_context_length?: number;
  promotion_owned_by?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
};

type ReviewResponse = {
  generated_at: string;
  window_hours: number;
  counts: {
    new_pending: number;
    pending: number;
    approved_recent: number;
    rejected_recent: number;
  };
  new_pending: ReviewModel[];
  pending: ReviewModel[];
  approved_recent: ReviewModel[];
  rejected_recent: ReviewModel[];
};

const Page = styled(Box)(({ theme }) => ({
  maxWidth: 1320,
  margin: '0 auto',
  padding: theme.spacing(13, 3, 3),
}));

const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
}));

const SummaryGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
}));

const SummaryTile = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: 6,
  border: `1px solid ${theme.palette.divider}`,
}));

const ActionButton = styled(Button)({
  minWidth: 40,
  width: 40,
  height: 36,
  padding: 0,
  boxShadow: 'none',
});

function displayDate(value?: string): string {
  if (!value) return 'None';
  return new Date(value).toLocaleString();
}

function confidenceLabel(value?: number): string {
  if (typeof value !== 'number') return 'None';
  return `${Math.round(value * 100)}%`;
}

function uniquePending(data: ReviewResponse | null): ReviewModel[] {
  if (!data) return [];
  const seen = new Set<string>();
  const rows: ReviewModel[] = [];
  for (const model of [...data.new_pending, ...data.pending]) {
    const key = `${model.provider}:${model.model_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(model);
  }
  return rows;
}

const ModelReviewPage: React.FC = () => {
  const searchParams = useSearchParams();
  const adminKey = searchParams ? searchParams.get('key') : null;
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!adminKey) {
      setError('Admin key is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/model-review?hours=24', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      setData(await response.json());
      setError(null);
    } catch (err: any) {
      setError(`Failed to load model review queue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const reviewModel = async (model: ReviewModel, action: 'approve' | 'reject') => {
    if (!adminKey) return;

    const key = `${model.provider}:${model.model_id}`;
    setActingKey(`${action}:${key}`);
    try {
      const response = await fetch('/api/admin/model-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          provider: model.provider,
          model_id: model.model_id,
          action,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setSuccess(action === 'approve'
        ? `${model.model_id} approved and queued`
        : `${model.model_id} rejected`);
      await fetchQueue();
    } catch (err: any) {
      setError(`Failed to ${action} ${model.model_id}: ${err.message}`);
    } finally {
      setActingKey(null);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchQueue();
    }
  }, [adminKey, fetchQueue]);

  const pending = uniquePending(data);

  if (!adminKey) {
    return (
      <Page>
        <Typography variant="h4" component="h1" gutterBottom>
          Model Review
        </Typography>
        <Alert severity="error">Open this page with `?key=your_admin_key`.</Alert>
      </Page>
    );
  }

  return (
    <Page>
      <Toolbar>
        <Box>
          <Typography variant="h4" component="h1">
            Model Review
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Approve once to start benchmarking. Reject once to keep tracked without daily runs.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchQueue}
          disabled={loading}
        >
          Refresh
        </Button>
      </Toolbar>

      <SummaryGrid>
        <SummaryTile>
          <Typography variant="caption" color="text.secondary">New 24h</Typography>
          <Typography variant="h5">{data?.counts.new_pending ?? 0}</Typography>
        </SummaryTile>
        <SummaryTile>
          <Typography variant="caption" color="text.secondary">Pending</Typography>
          <Typography variant="h5">{data?.counts.pending ?? 0}</Typography>
        </SummaryTile>
        <SummaryTile>
          <Typography variant="caption" color="text.secondary">Approved 24h</Typography>
          <Typography variant="h5">{data?.counts.approved_recent ?? 0}</Typography>
        </SummaryTile>
        <SummaryTile>
          <Typography variant="caption" color="text.secondary">Rejected 24h</Typography>
          <Typography variant="h5">{data?.counts.rejected_recent ?? 0}</Typography>
        </SummaryTile>
      </SummaryGrid>

      <Typography variant="h6" component="h2" gutterBottom>
        Pending Review
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="pending model review table">
          <TableHead>
            <TableRow>
              <TableCell>Actions</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Detected</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">No models waiting for review.</Typography>
                </TableCell>
              </TableRow>
            )}
            {pending.map((model) => {
              const key = `${model.provider}:${model.model_id}`;
              return (
                <TableRow key={key} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Approve and queue benchmark">
                        <span>
                          <ActionButton
                            aria-label={`Approve ${model.provider} ${model.model_id}`}
                            color="success"
                            variant="contained"
                            onClick={() => reviewModel(model, 'approve')}
                            disabled={actingKey !== null}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </ActionButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Reject and keep tracked">
                        <span>
                          <ActionButton
                            aria-label={`Reject ${model.provider} ${model.model_id}`}
                            color="error"
                            variant="contained"
                            onClick={() => reviewModel(model, 'reject')}
                            disabled={actingKey !== null}
                          >
                            <CancelIcon fontSize="small" />
                          </ActionButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell>{model.provider}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{model.display_name || model.model_id}</Typography>
                    <Typography variant="caption" color="text.secondary">{model.model_id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={model.promotion_source || model.imported_from || 'unknown'} />
                  </TableCell>
                  <TableCell>{confidenceLabel(model.promotion_confidence)}</TableCell>
                  <TableCell>{displayDate(model.promotion_detected_at || model.created_at)}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="body2" color="text.secondary">
                      {model.promotion_reasoning || model.promotion_owned_by || 'None'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={3}>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Decisions
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="recent model decisions table">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>When</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...(data?.approved_recent || []), ...(data?.rejected_recent || [])].length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary">No decisions in the last 24 hours.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {[...(data?.approved_recent || []), ...(data?.rejected_recent || [])].map((model) => (
                <TableRow key={`${model.promotion_status}:${model.provider}:${model.model_id}`}>
                  <TableCell>
                    <Chip
                      size="small"
                      color={model.promotion_status === 'approved' ? 'success' : 'default'}
                      label={model.promotion_status || 'unknown'}
                    />
                  </TableCell>
                  <TableCell>{model.provider}</TableCell>
                  <TableCell>{model.model_id}</TableCell>
                  <TableCell>{displayDate(model.approved_at || model.rejected_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Snackbar open={!!error} autoHideDuration={7000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Page>
  );
};

export default ModelReviewPage;
