import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/connectToMongoDB';
import mongoose from 'mongoose';

// Simple auth middleware
function checkAuth(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.error('ADMIN_API_KEY not set');
    return false;
  }
  // Only accept header to avoid leaking secrets in URLs
  const providedKey = req.headers['x-admin-key'];
  return providedKey === adminKey;
}

// Model schema (reuse existing)
const ModelSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  model_id: { type: String, required: true },
  display_name: { type: String, required: true },
  canonical_id: { type: String }, // New field for grouping
  enabled: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  imported_from: { type: String, default: 'api' }
});

const Model = mongoose.models.AdminModel || mongoose.model('AdminModel', ModelSchema, 'models');

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10; // 10 attempts per window
const RATE_LIMIT_BLOCK_TIME = 60 * 60 * 1000; // 1 hour block

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW, blocked: false });
    return true;
  }
  
  // Check if blocked
  if (record.blocked && now < record.resetTime) {
    return false;
  }
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    record.blocked = false;
    return true;
  }
  
  // Increment count
  record.count++;
  
  // Block if exceeded
  if (record.count > RATE_LIMIT_MAX_ATTEMPTS) {
    record.blocked = true;
    record.resetTime = now + RATE_LIMIT_BLOCK_TIME;
    console.warn(`🚨 Admin API: IP ${ip} blocked for excessive attempts`);
    return false;
  }
  
  return true;
}

function checkIPWhitelist(req: NextApiRequest): boolean {
  // Get client IP
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  
  // Allow localhost for development
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  
  // Check whitelist from env
  const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',').map(ip => ip.trim()) || [];
  if (whitelist.length > 0 && !whitelist.includes(ip || '')) {
    console.warn(`🚨 Admin API: Blocked IP ${ip} not in whitelist`);
    return false;
  }
  
  return true;
}

function logAdminAction(req: NextApiRequest, action: string, details?: any) {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  const timestamp = new Date().toISOString();
  
  console.log(`🔐 ADMIN ACTION: ${timestamp} | IP: ${ip} | Action: ${action} | Details: ${JSON.stringify(details || {})}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get client IP for rate limiting
  const forwarded = req.headers['x-forwarded-for'] as string;
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
  
  // IP whitelist check
  if (!checkIPWhitelist(req)) {
    logAdminAction(req, 'IP_BLOCKED');
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    logAdminAction(req, 'RATE_LIMITED');
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  
  // CORS headers - restrict to known origins in production
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ADMIN_ALLOWED_ORIGINS?.split(',') || ['http://localhost:15001'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow any origin in development
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Auth check
  if (!checkAuth(req)) {
    logAdminAction(req, 'AUTH_FAILED', { method: req.method, url: req.url });
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Log successful auth
  logAdminAction(req, 'AUTH_SUCCESS', { method: req.method });

  try {
    await connectToMongoDB();

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - List all models grouped by canonical_id
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const models = await Model.find({}).sort({ display_name: 1, provider: 1 });
  
  // Group by canonical_id (or display_name if no canonical_id)
  const grouped: { [key: string]: any } = {};
  
  models.forEach(model => {
    const groupKey = model.canonical_id || model.display_name;
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        canonical_id: groupKey,
        display_name: model.display_name,
        variants: []
      };
    }
    
    grouped[groupKey].variants.push({
      _id: model._id,
      provider: model.provider,
      model_id: model.model_id,
      enabled: model.enabled,
      created_at: model.created_at
    });
  });
  
  const result = Object.values(grouped).sort((a, b) => 
    a.display_name.localeCompare(b.display_name)
  );
  
  return res.status(200).json({ models: result });
}

// PUT - Update canonical model (friendly name)
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { canonical_id } = req.query;
  const { display_name } = req.body;
  
  if (!canonical_id || !display_name) {
    return res.status(400).json({ error: 'Missing canonical_id or display_name' });
  }
  
  // Update all models with this canonical_id
  const result = await Model.updateMany(
    { 
      $or: [
        { canonical_id: canonical_id },
        { canonical_id: { $exists: false }, display_name: canonical_id }
      ]
    },
    { 
      $set: { 
        display_name: display_name,
        canonical_id: canonical_id
      }
    }
  );
  
  // Log the action
  logAdminAction(req, 'MODEL_UPDATE', { 
    canonical_id, 
    new_display_name: display_name, 
    models_affected: result.modifiedCount 
  });
  
  return res.status(200).json({ 
    message: `Updated ${result.modifiedCount} models`,
    canonical_id,
    display_name
  });
}

// POST - Add new provider variant to canonical model
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { canonical_id } = req.query;
  const { provider, model_id } = req.body;
  
  if (!canonical_id || !provider || !model_id) {
    return res.status(400).json({ 
      error: 'Missing canonical_id, provider, or model_id' 
    });
  }
  
  // Get display_name from existing canonical model
  const existingModel = await Model.findOne({
    $or: [
      { canonical_id: canonical_id },
      { canonical_id: { $exists: false }, display_name: canonical_id }
    ]
  });
  
  if (!existingModel) {
    return res.status(404).json({ error: 'Canonical model not found' });
  }
  
  // Check if this provider/model_id already exists
  const duplicate = await Model.findOne({ provider, model_id });
  if (duplicate) {
    return res.status(409).json({ error: 'Model already exists' });
  }
  
  // Create new variant
  const newModel = new Model({
    provider,
    model_id,
    display_name: existingModel.display_name,
    canonical_id: canonical_id,
    enabled: true,
    imported_from: 'admin'
  });
  
  await newModel.save();
  
  return res.status(201).json({
    message: 'Variant added successfully',
    model: newModel
  });
}
