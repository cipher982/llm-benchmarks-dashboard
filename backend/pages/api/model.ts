import { NextApiRequest, NextApiResponse } from "next";
import { corsMiddleware } from "../../utils/apiMiddleware";
import { getModelPageData } from "../../utils/modelService";

const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 90;

function parseTimeRange(req: NextApiRequest) {
    const value = req.query.days ? parseInt(req.query.days as string, 10) : DEFAULT_DAYS;
    const bounded = Math.min(Math.max(value || DEFAULT_DAYS, MIN_DAYS), MAX_DAYS);
    return { days: bounded };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { provider, model } = req.query;
    if (!provider || !model) {
        return res.status(400).json({ error: "Provider and model parameters are required" });
    }

    const providerSlug = Array.isArray(provider) ? provider[0] : provider;
    const modelSlug = Array.isArray(model) ? model[0] : model;
    const { days } = parseTimeRange(req);

    try {
        const data = await getModelPageData(providerSlug, modelSlug, days);
        if (!data) {
            return res.status(404).json({ error: `Model ${providerSlug}/${modelSlug} not found` });
        }

        res.setHeader("Cache-Control", "public, s-maxage=300");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("X-Data-Source", "MONGODB-MODEL-SPECIFIC");

        return res.status(200).json(data);
    } catch (error) {
        console.error("Error processing model metrics:", error);
        return res.status(500).json({ error: "Failed to process model metrics" });
    }
}

export default async function modelHandler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const corsHandled = await corsMiddleware(req, res);
        if (corsHandled) return;
        return handler(req, res);
    } catch (error) {
        console.error("Unexpected error in model API route:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
