import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req, res) {
  // Set the content type to plain text
  res.setHeader('Content-Type', 'text/plain');
  
  // Set caching headers
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  
  // Generate the robots.txt content
  const robotsTxt = `# Allow all web crawlers
User-agent: *
Allow: /

# Sitemap location
Sitemap: ${process.env.FRONTEND_URL || 'https://llm-benchmarks.com'}/api/sitemap
`;
  
  // Send the response
  res.status(200).send(robotsTxt);
} 