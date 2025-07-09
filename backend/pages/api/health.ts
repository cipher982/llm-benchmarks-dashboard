import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import redisClient from '../../utils/redisClient';
import connectToMongoDB from '../../utils/connectToMongoDB';
import logger from '../../utils/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  url: string;
  services: {
    mongodb: {
      status: 'up' | 'down';
      details?: string;
    };
    redis: {
      status: 'up' | 'down';
      details?: string;
    };
  };
  uptime: number;
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
    services: {
      mongodb: { status: 'down' },
      redis: { status: 'down' }
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

  // Check Redis
  try {
    await redisClient.ping();
    healthStatus.services.redis = { status: 'up' };
  } catch (error) {
    healthStatus.services.redis = { 
      status: 'down', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    };
    overallStatus = 'degraded';
    logger.error('Redis health check failed:', error);
  }

  healthStatus.status = overallStatus;
  
  const responseTime = Date.now() - startTime;
  logger.debug(`Health check completed in ${responseTime}ms with status: ${overallStatus}`);

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 503 : 503;
  
  res.status(httpStatus).json(healthStatus);
} 