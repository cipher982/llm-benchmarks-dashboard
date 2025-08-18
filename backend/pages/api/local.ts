import { NextApiRequest, NextApiResponse } from 'next';
import { LocalMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformLocal } from '../../utils/processLocal';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';
import { getComparisonAndFastestFrameworks } from '../../utils/transformations';
import fs from 'fs/promises';
import path from 'path';
import logger from '../../utils/logger';

export const daysAgo = 1000;

// Static file serving for local data
async function tryServeStaticFile(res: NextApiResponse): Promise<boolean> {
    const filename = 'local.json';
    const filepath = path.join(process.cwd(), 'public', 'api', filename);
    
    // Add debug header with file path attempt
    res.setHeader('X-Static-Path-Attempted', filepath);
    
    try {
        // Check if file exists and get its stats
        const stats = await fs.stat(filepath);
        const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
        
        // Add debug headers
        res.setHeader('X-Static-File-Found', 'true');
        res.setHeader('X-Static-File-Age-Minutes', Math.floor(ageMinutes).toString());
        
        // Serve file if it's less than 24 hours old (local data changes less frequently)
        if (ageMinutes < 1440) {
            const data = await fs.readFile(filepath, 'utf8');
            const parsedData = JSON.parse(data);
            
            // Add headers to indicate static file serving
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Cache-Status', 'STATIC-FILE');
            res.setHeader('X-Processing-Time', '1ms'); // Static files are instant
            
            logger.info(`📄 Served static local file: ${filename} (${Math.floor(ageMinutes)}min old)`);
            res.status(200).json(parsedData);
            return true;
        } else {
            res.setHeader('X-Static-File-Status', 'STALE');
            logger.info(`⏰ Static local file ${filename} is stale (${Math.floor(ageMinutes)}min old), using dynamic`);
        }
    } catch (error: any) {
        // File doesn't exist or other error - fall back to dynamic
        res.setHeader('X-Static-File-Found', 'false');
        res.setHeader('X-Static-File-Error', error.code || 'UNKNOWN');
        logger.info(`📄 Static local file error: ${error.message}`);
    }
    
    return false;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestStartTime = Date.now();

  try {
    // Check if static file serving should be bypassed
    const useStatic = req.query.bypass_static !== "true"; // Static enabled by default
    
    // First priority: Try to serve static file (unless bypassed)
    if (useStatic) {
        const staticServed = await tryServeStaticFile(res);
        if (staticServed) {
            return; // Response already sent
        }
    }
    
    // If we reach here, static file was not available - generate dynamically
    logger.info('Static local file not available, generating dynamically');

    // Fetch raw local data
    const rawData = await fetchAndProcessMetrics(
      LocalMetrics,
      daysAgo,
      cleanTransformLocal
    );

    // Process data to add comparison and fastest frameworks
    const rawMetrics = Array.isArray(rawData) ? rawData : (rawData.raw || []);
    const { comparisonResults, fastestFrameworks } = getComparisonAndFastestFrameworks(rawMetrics);

    const processedData = {
      raw: rawMetrics,
      comparison: comparisonResults,
      fastestFrameworks: fastestFrameworks
    };

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 minute cache
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Data-Source', 'MONGODB-LOCAL');
    res.setHeader('X-Cache-Status', 'DYNAMIC-GENERATION');
    res.setHeader('X-Processing-Time', `${Date.now() - requestStartTime}ms`);
    
    return res.status(200).json(processedData);
  } catch (error) {
    console.error('Error fetching local data:', error);
    return res.status(500).json({ error: 'Failed to fetch local data' });
  }
}

export default async function localHandler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  const corsHandled = await corsMiddleware(req, res);
  if (corsHandled) return;

  // Handle the actual request
  return handler(req, res);
}