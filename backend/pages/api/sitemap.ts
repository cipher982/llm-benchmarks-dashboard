import { NextApiRequest, NextApiResponse } from "next";
import { corsMiddleware } from "../../utils/apiMiddleware";
import { getProviderModelInventory, SEO_MIN_DATA_SPAN_DAYS } from "../../utils/modelService";
import { FLAGGED_STATUSES } from "../../utils/lifecycleSummary";

const RECENCY_WINDOW_DAYS = 30; // Models must have data within this window to avoid 404

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

  // Filter to only include models with meaningful content:
  // - At least MIN_DATA_SPAN_DAYS days of data span
  // - Has recent data (within RECENCY_WINDOW_DAYS) to avoid 404 from getModelPageData
  // - Not flagged (stale, failing, etc.) unless deprecated (which has historical value)
  const recencyCutoff = new Date();
  recencyCutoff.setDate(recencyCutoff.getDate() - RECENCY_WINDOW_DAYS);

  const indexableInventory = inventory.filter((entry) => {
    const dataSpan = entry.dataSpanDays ?? 0;
    const hasEnoughData = Number.isFinite(dataSpan) && dataSpan >= SEO_MIN_DATA_SPAN_DAYS;

    // Check recency - model must have data within the window getModelPageData uses
    const latestDate = entry.latestRunAt ? new Date(entry.latestRunAt) : null;
    const hasRecentData = latestDate && latestDate >= recencyCutoff;

    // Flagged check (excludes deprecated since we want to keep those)
    const isFlaggedNotDeprecated = entry.lifecycleStatus &&
      FLAGGED_STATUSES.has(entry.lifecycleStatus) &&
      entry.lifecycleStatus !== 'deprecated';

    // Include if: has enough data span AND has recent data AND not flagged (or is deprecated with recent data)
    // Note: Even deprecated models need recent data to avoid 404s from getModelPageData
    if (!hasEnoughData) return false;
    if (!hasRecentData) return false; // All models need recent data to render
    if (isFlaggedNotDeprecated) return false;
    return true;
  });

  console.log(`[Sitemap] Total inventory: ${inventory.length}, Indexable: ${indexableInventory.length}, Filtered out: ${inventory.length - indexableInventory.length}`);

  const providerEntriesMap = new Map<string, SitemapEntry>();
  const modelEntries: SitemapEntry[] = [];

  indexableInventory.forEach((entry) => {
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

    // Deprecated models get slightly lower priority
    const priority = entry.lifecycleStatus === 'deprecated' ? "0.6" : "0.8";
    modelEntries.push({
      loc: `${hostname}/models/${entry.providerSlug}/${entry.modelSlug}`,
      changefreq: entry.lifecycleStatus === 'deprecated' ? "monthly" : "daily",
      priority,
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
