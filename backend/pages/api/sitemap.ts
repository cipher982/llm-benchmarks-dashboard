import { NextApiRequest, NextApiResponse } from "next";
import { corsMiddleware } from "../../utils/apiMiddleware";
import { getProviderModelInventory } from "../../utils/modelService";

const DEFAULT_HOST = "https://llm-benchmarks.com";

interface SitemapEntry {
  loc: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

function buildUrl(entry: SitemapEntry): string {
  const lines = ["  <url>"];
  lines.push(`    <loc>${entry.loc}</loc>`);
  if (entry.lastmod) {
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  }
  if (entry.changefreq) {
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  }
  if (entry.priority) {
    lines.push(`    <priority>${entry.priority}</priority>`);
  }
  lines.push("  </url>");
  return lines.join("\n");
}

async function generateSitemap(): Promise<string> {
  const hostname = process.env.FRONTEND_URL || DEFAULT_HOST;

  const mainEntries: SitemapEntry[] = [
    { loc: `${hostname}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${hostname}/cloud`, changefreq: "daily", priority: "0.9" },
    { loc: `${hostname}/local`, changefreq: "weekly", priority: "0.6" },
    { loc: `${hostname}/status`, changefreq: "weekly", priority: "0.4" },
  ];

  const inventory = await getProviderModelInventory();

  const providerEntriesMap = new Map<string, SitemapEntry>();
  const modelEntries: SitemapEntry[] = [];

  inventory.forEach((entry) => {
    const providerUrl = `${hostname}/providers/${entry.providerSlug}`;
    if (!providerEntriesMap.has(providerUrl)) {
      providerEntriesMap.set(providerUrl, {
        loc: providerUrl,
        changefreq: "daily",
        priority: "0.7",
        lastmod: entry.latestRunAt,
      });
    } else if (entry.latestRunAt) {
      const current = providerEntriesMap.get(providerUrl)!;
      if (!current.lastmod || Date.parse(entry.latestRunAt) > Date.parse(current.lastmod)) {
        current.lastmod = entry.latestRunAt;
      }
    }

    modelEntries.push({
      loc: `${hostname}/models/${entry.providerSlug}/${entry.modelSlug}`,
      changefreq: "daily",
      priority: "0.8",
      lastmod: entry.latestRunAt,
    });
  });

  const xmlEntries = [
    ...mainEntries.map(buildUrl),
    ...Array.from(providerEntriesMap.values()).map(buildUrl),
    ...modelEntries.map(buildUrl),
  ].join("\n");

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    xmlEntries,
    "</urlset>",
  ].join("\n");
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sitemap = await generateSitemap();
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.status(200).send(sitemap);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
}

export default async function sitemapHandler(req: NextApiRequest, res: NextApiResponse) {
  const corsHandled = await corsMiddleware(req, res);
  if (corsHandled) return;
  return handler(req, res);
}
