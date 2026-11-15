import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/connectToMongoDB';
import mongoose from 'mongoose';

// Model schema for the models collection
const ModelSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model_id: { type: String, required: true },
  display_name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  imported_from: { type: String, default: 'api' }
});

// Create compound index to prevent duplicates
ModelSchema.index({ provider: 1, model_id: 1 }, { unique: true });

const Model = mongoose.models.Model || mongoose.model('Model', ModelSchema, 'models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    return await handleGet(req, res);
  } catch (error) {
    console.error('Models API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/models - List all models or filter by provider
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { provider, enabled } = req.query;
  
  const filter: Record<string, unknown> = {};
  if (typeof provider === 'string' && provider) filter.provider = provider;
  if (enabled !== undefined) filter.enabled = enabled === 'true';

  const models = await Model.find(filter).sort({ provider: 1, model_id: 1 });
  
  return res.status(200).json({
    models,
    count: models.length
  });
}