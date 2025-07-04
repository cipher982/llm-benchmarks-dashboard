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
  try {
    await connectToMongoDB();

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Models API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/models - List all models or filter by provider
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { provider, enabled } = req.query;
  
  const filter: any = {};
  if (provider) filter.provider = provider;
  if (enabled !== undefined) filter.enabled = enabled === 'true';

  const models = await Model.find(filter).sort({ provider: 1, model_id: 1 });
  
  return res.status(200).json({
    models,
    count: models.length
  });
}

// POST /api/models - Add a new model
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { provider, model_id, display_name, enabled = true } = req.body;

  if (!provider || !model_id || !display_name) {
    return res.status(400).json({ 
      error: 'Missing required fields: provider, model_id, display_name' 
    });
  }

  try {
    const model = new Model({
      provider,
      model_id,
      display_name,
      enabled,
      created_at: new Date(),
      imported_from: 'api'
    });

    await model.save();
    
    return res.status(201).json({
      message: 'Model added successfully',
      model
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Model already exists for this provider' 
      });
    }
    throw error;
  }
}

// PUT /api/models - Update a model (enable/disable or change display name)
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { provider, model_id, display_name, enabled } = req.body;

  if (!provider || !model_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: provider, model_id' 
    });
  }

  const updateFields: any = {};
  if (display_name !== undefined) updateFields.display_name = display_name;
  if (enabled !== undefined) updateFields.enabled = enabled;

  const model = await Model.findOneAndUpdate(
    { provider, model_id },
    updateFields,
    { new: true }
  );

  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  return res.status(200).json({
    message: 'Model updated successfully',
    model
  });
}

// DELETE /api/models - Remove a model
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { provider, model_id } = req.body;

  if (!provider || !model_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: provider, model_id' 
    });
  }

  const model = await Model.findOneAndDelete({ provider, model_id });

  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  return res.status(200).json({
    message: 'Model deleted successfully',
    model
  });
}