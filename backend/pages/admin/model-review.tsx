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
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
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

type DecisionItem = {
  provider?: string;
  model_id?: string;
  openrouter_id?: string;
  reason?: string;
  review_flags?: string[];
  source?: string;
  decision?: string;
  confidence?: number;
  first_seen_at?: string;
  next_review_at?: string;
  seen_count?: number;
  raw_item?: any;
};

type DecisionsResponse = {
  items: DecisionItem[];
  count: number;
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
  const [decisionsData, setDecisionsData] = useState<DecisionsResponse | null>(null);
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

  const fetchDecisions = useCallback(async () => {
    if (!adminKey) return;

    try {
      const response = await fetch('/api/admin/decisions-review', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDecisionsData(await response.json());
    } catch (err: any) {
      // Decisions fetch is best-effort; don't disturb the main page for failures
      console.error('Failed to load decisions:', err.message);
    }
  }, [adminKey]);

  const promoteDecision = async (item: DecisionItem) => {
    if (!adminKey) return;

    const label = item.provider && item.model_id
      ? `${item.provider}:${item.model_id}`
      : item.openrouter_id || 'unknown';
    setActingKey(`promote:${label}`);
    try {
      const body: any = {};
      if (item.provider && item.model_id) {
        body.provider = item.provider;
        body.model_id = item.model_id;
      } else if (item.openrouter_id) {
        body.openrouter_id = item.openrouter_id;
      }
      const response = await fetch('/api/admin/decisions-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);

      setSuccess(`${label} promoted to candidate`);
      await fetchQueue();
      await fetchDecisions();
    } catch (err: any) {
      setError(`Failed to promote ${label}: ${err.message}`);
    } finally {
      setActingKey(null);
    }
  };

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
      fetchDecisions();
    }
  }, [adminKey, fetchQueue, fetchDecisions]);

  const refreshAll = () => {
    fetchQueue();
    fetchDecisions();
  };

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
          onClick={refreshAll}
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
          Review Items (Snoozed)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Agent-flagged items that need human judgment before staging.
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="review items table">
            <TableHead>
              <TableRow>
                <TableCell>Actions</TableCell>
                <TableCell>Identifier</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Flags</TableCell>
                <TableCell>Seen</TableCell>
                <TableCell>Next Review</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!decisionsData || decisionsData.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary">No snoozed items awaiting review.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {(decisionsData?.items || []).map((item) => {
                const label = item.provider && item.model_id
                  ? `${item.provider}:${item.model_id}`
                  : item.openrouter_id || item.raw_item?.openrouter_id || 'unknown';
                return (
                  <TableRow key={label} hover>
                    <TableCell>
                      <Tooltip title="Promote to candidate for review">
                        <span>
                          <ActionButton
                            aria-label={`Promote ${label}`}
                            color="primary"
                            variant="contained"
                            onClick={() => promoteDecision(item)}
                            disabled={actingKey !== null}
                          >
                            <UnfoldMoreIcon fontSize="small" />
                          </ActionButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} fontSize="13px" fontFamily="monospace">
                        {label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.source || 'unknown'} />
                    </TableCell>
                    <TableCell>{item.reason || 'None'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {(item.review_flags || []).map((flag) => (
                          <Chip key={flag} size="small" variant="outlined" label={flag} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{item.seen_count ?? 0}</TableCell>
                    <TableCell>{displayDate(item.next_review_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

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
