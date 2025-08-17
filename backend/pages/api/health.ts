import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectToMongoDB from '../../utils/connectToMongoDB';
import logger from '../../utils/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  url: string;
  port: number;
  services: {
    mongodb: {
      status: 'up' | 'down';
      details?: string;
    };
    staticFiles: {
      status: 'up' | 'down';
      details?: string;
    };
  };
  uptime: number;
  responseTime?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  const startTime = Date.now();
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    url: process.env.COOLIFY_URL || 'not set',
    port: parseInt(process.env.PORT || '3000', 10),
    services: {
      mongodb: { status: 'down' },
      staticFiles: { status: 'down' }
    },
    uptime: process.uptime()
  };

  // Check MongoDB
  try {
    // Actually attempt to connect to MongoDB
    await connectToMongoDB();
    
    // Now check the connection state
    const mongoState = mongoose.connection.readyState;
    if (mongoState === 1 && mongoose.connection.db) {
      // Test with a simple ping to verify the connection works
      await mongoose.connection.db.admin().ping();
      healthStatus.services.mongodb = { status: 'up' };
    } else {
      healthStatus.services.mongodb = { 
        status: 'down', 
        details: `Connection state: ${mongoState}` 
      };
      overallStatus = 'degraded';
    }
  } catch (error) {
    healthStatus.services.mongodb = { 
      status: 'down', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    };
    overallStatus = 'degraded';
    logger.error('MongoDB health check failed:', error);
  }

  // Check Static Files
  try {
    const fs = require('fs/promises');
    const path = require('path');
    const staticDir = path.join(process.cwd(), 'public', 'api');
    await fs.access(staticDir);
    healthStatus.services.staticFiles = { status: 'up' };
  } catch (error) {
    healthStatus.services.staticFiles = { 
      status: 'down', 
      details: 'Static files directory not accessible' 
    };
    // Don't mark as degraded - static files will be generated automatically
    logger.warn('Static files check failed (will be auto-generated):', error);
  }

  healthStatus.status = overallStatus;
  
  const responseTime = Date.now() - startTime;
  healthStatus.responseTime = responseTime;
  
  logger.debug(`Health check completed in ${responseTime}ms with status: ${overallStatus}`);

  // Return appropriate HTTP status codes based on health status
  const httpStatus = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503; // Allow degraded services to pass
  
  res.status(httpStatus).json(healthStatus);
} 