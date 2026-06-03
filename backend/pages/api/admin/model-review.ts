import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectToMongoDB from '../../../utils/connectToMongoDB';
import { buildManualBenchmarkJob, type ManualBenchmarkJob } from '../../../utils/modelReview/jobs';

type ReviewAction = 'approve' | 'reject';

const PENDING_STATUSES = ['candidate', 'pending_review'];

function checkAuth(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return process.env.NODE_ENV === 'development';
  }
  return req.headers['x-admin-key'] === adminKey;
}

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function modelProjection() {
  return {
    _id: 0,
    provider: 1,
    model_id: 1,
    display_name: 1,
    enabled: 1,
    deprecated: 1,
    created_at: 1,
    imported_from: 1,
    promotion_status: 1,
    promotion_source: 1,
    promotion_confidence: 1,
    promotion_reasoning: 1,
    promotion_detected_at: 1,
    promotion_context_length: 1,
    promotion_owned_by: 1,
    approved_at: 1,
    rejected_at: 1,
    rejection_reason: 1,
  };
}

function sortNewest(a: any, b: any): number {
  const aDate = new Date(a.promotion_detected_at || a.created_at || 0).getTime();
  const bDate = new Date(b.promotion_detected_at || b.created_at || 0).getTime();
  return bDate - aDate || String(a.provider).localeCompare(String(b.provider));
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const hours = Math.max(1, Math.min(24 * 30, Number(req.query.hours || 24)));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ error: 'MongoDB connection unavailable' });
  }

  const models = db.collection('models');
  const projection = modelProjection();

  const [pending, recentApproved, recentRejected] = await Promise.all([
    models
      .find(
        {
          deprecated: { $ne: true },
          promotion_status: { $in: PENDING_STATUSES },
        },
        { projection },
      )
      .sort({ promotion_detected_at: -1, created_at: -1 })
      .limit(200)
      .toArray(),
    models
      .find(
        {
          promotion_status: 'approved',
          approved_at: { $gte: since },
        },
        { projection },
      )
      .sort({ approved_at: -1 })
      .limit(100)
      .toArray(),
    models
      .find(
        {
          promotion_status: 'rejected',
          rejected_at: { $gte: since },
        },
        { projection },
      )
      .sort({ rejected_at: -1 })
      .limit(100)
      .toArray(),
  ]);

  const newPending = pending.filter((model) => {
    const detectedAt = new Date(model.promotion_detected_at || model.created_at || 0);
    return detectedAt >= since;
  });

  return res.status(200).json({
    generated_at: new Date().toISOString(),
    window_hours: hours,
    counts: {
      new_pending: newPending.length,
      pending: pending.length,
      approved_recent: recentApproved.length,
      rejected_recent: recentRejected.length,
    },
    new_pending: newPending.sort(sortNewest),
    pending: pending.sort(sortNewest),
    approved_recent: recentApproved,
    rejected_recent: recentRejected,
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { provider, model_id: modelId, action, reason } = req.body || {};

  if (!provider || !modelId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      error: 'Missing required body fields: provider, model_id, action=approve|reject',
    });
  }

  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ error: 'MongoDB connection unavailable' });
  }

  const now = new Date();
  const models = db.collection('models');
  const existing = await models.findOne({ provider, model_id: modelId }, { projection: modelProjection() });
  if (!existing) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const actor = clientIp(req);

  if ((action as ReviewAction) === 'approve') {
    const update = {
      $set: {
        enabled: true,
        deprecated: false,
        promotion_status: 'approved',
        promotion_decision: 'approved',
        promotion_review_required: false,
        approved_at: now,
        approved_by: actor,
        updated_at: now,
      },
      $unset: {
        rejection_reason: '',
        rejected_at: '',
        rejected_by: '',
      },
    };
    const updated = await models.findOneAndUpdate(
      { provider, model_id: modelId },
      update,
      { returnDocument: 'after', projection: modelProjection() },
    );

    const job = buildManualBenchmarkJob({
      provider,
      modelId,
      now,
      requestedBy: actor,
    });
    await db.collection<ManualBenchmarkJob>('bench_jobs').insertOne(job);

    return res.status(200).json({
      message: 'Model approved and benchmark job queued',
      model: updated,
      job,
    });
  }

  const updated = await models.findOneAndUpdate(
    { provider, model_id: modelId },
    {
      $set: {
        enabled: false,
        deprecated: false,
        promotion_status: 'rejected',
        promotion_decision: 'rejected',
        promotion_review_required: false,
        rejected_at: now,
        rejected_by: actor,
        rejection_reason: reason || 'Rejected from dashboard review',
        updated_at: now,
      },
    },
    { returnDocument: 'after', projection: modelProjection() },
  );

  return res.status(200).json({
    message: 'Model rejected and kept tracked without benchmark traffic',
    model: updated,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!checkAuth(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    await connectToMongoDB();

    if (req.method === 'GET') {
      return handleGet(req, res);
    }
    if (req.method === 'POST') {
      return handlePost(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Model review API error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
