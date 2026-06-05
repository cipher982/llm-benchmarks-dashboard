import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectToMongoDB from '../../../utils/connectToMongoDB';

function checkAuth(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return process.env.NODE_ENV === 'development';
  }
  return req.headers['x-admin-key'] === adminKey;
}

const DECISION_PROJECTION = {
  _id: 0,
  provider: 1,
  model_id: 1,
  openrouter_id: 1,
  reason: 1,
  review_flags: 1,
  source: 1,
  decision: 1,
  confidence: 1,
  first_seen_at: 1,
  next_review_at: 1,
  seen_count: 1,
  raw_item: 1,
};

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ error: 'MongoDB connection unavailable' });
  }

  const collection = db.collection('model_maintenance_decisions');

  const items = await collection
    .find(
      {
        decision: 'snoozed',
        next_review_at: { $gt: new Date() },
      },
      { projection: DECISION_PROJECTION },
    )
    .sort({ next_review_at: 1 })
    .toArray();

  return res.status(200).json({
    items,
    count: items.length,
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { provider, model_id: modelId, openrouter_id: openrouterId } = req.body || {};

  if (!provider && !openrouterId) {
    return res.status(400).json({
      error: 'Missing required body fields: provider (and model_id) or openrouter_id',
    });
  }

  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ error: 'MongoDB connection unavailable' });
  }

  const decisions = db.collection('model_maintenance_decisions');

  const query: Record<string, unknown> = {};
  if (provider && modelId) {
    query.provider = provider;
    query.model_id = modelId;
  } else if (openrouterId) {
    query.openrouter_id = openrouterId;
  } else {
    return res.status(400).json({ error: 'Provide provider+model_id or openrouter_id' });
  }

  const decision = await decisions.findOne(query);
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  const now = new Date();
  await decisions.updateOne(
    { _id: decision._id },
    { $set: { decision: 'promoted', promoted_at: now } },
  );

  let modelProvider = provider;
  let modelModelId = modelId;

  if (!modelProvider || !modelModelId) {
    const raw = decision.raw_item;
    if (raw && raw.provider) {
      modelProvider = raw.provider;
    } else {
      modelProvider = decision.provider || 'unknown';
    }
    if (raw && raw.id) {
      modelModelId = raw.id;
    } else if (decision.model_id) {
      modelModelId = decision.model_id;
    } else {
      modelModelId = decision.openrouter_id || openrouterId || 'unknown';
    }
  }

  const models = db.collection('models');
  await models.updateOne(
    { provider: modelProvider, model_id: modelModelId },
    {
      $set: {
        promotion_status: 'candidate',
        promotion_review_required: true,
        enabled: false,
        promotion_detected_at: now,
        updated_at: now,
      },
      $setOnInsert: {
        provider: modelProvider,
        model_id: modelModelId,
        created_at: now,
      },
    },
    { upsert: true },
  );

  const updatedDecision = await decisions.findOne(
    { _id: decision._id },
    { projection: DECISION_PROJECTION },
  );

  const updatedModel = await models.findOne(
    { provider: modelProvider, model_id: modelModelId },
    {
      projection: {
        _id: 0,
        provider: 1,
        model_id: 1,
        display_name: 1,
        enabled: 1,
        promotion_status: 1,
        promotion_review_required: 1,
        promotion_detected_at: 1,
      },
    },
  );

  return res.status(200).json({
    message: 'Decision promoted to candidate',
    decision: updatedDecision,
    model: updatedModel,
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
    console.error('Decisions review API error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
