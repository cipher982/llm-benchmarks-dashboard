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

# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a content-signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a content-signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a content signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via content signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.
`;
  
  // Send the response
  res.status(200).send(robotsTxt);
} 