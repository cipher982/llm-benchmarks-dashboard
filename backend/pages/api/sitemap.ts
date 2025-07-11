import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { corsMiddleware } from '../../utils/apiMiddleware';

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

async function generateSitemap(req: NextApiRequest): Promise<string> {
  // Get the base URL for the website
  const hostname = process.env.FRONTEND_URL || 'https://llm-benchmarks.com';
  
  // Get all unique model and provider combinations
  const metrics = await CloudMetrics.find().sort({ model_name: 1 }).lean();
  
  // Create a unique set of provider/model combinations
  const modelEntries = new Map();
  
  metrics.forEach((metric: any) => {
    const key = `${metric.provider}|${metric.model_name}`;
    if (!modelEntries.has(key)) {
      modelEntries.set(key, {
        provider: metric.provider,
        model_name: metric.model_name
      });
    }
  });
  
  // Build the sitemap XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add main pages
  const mainPages = [
    '/',
    '/cloud',
    '/local',
    '/status'
  ];
  
  mainPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${hostname}${page}</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';
  });
  
  // Add model-specific pages
  for (const [_, model] of modelEntries) {
    const providerSlug = createSlug(model.provider);
    const modelSlug = createSlug(model.model_name);
    const modelUrl = `/models/${providerSlug}/${modelSlug}`;
    
    xml += '  <url>\n';
    xml += `    <loc>${hostname}${modelUrl}</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  return xml;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const sitemap = await generateSitemap(req);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    
    // Send the sitemap
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}

// Wrap the handler with CORS middleware
export default async function sitemapHandler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  const corsHandled = await corsMiddleware(req, res);
  if (corsHandled) return;
  
  // Handle the actual request
  return handler(req, res);
} 