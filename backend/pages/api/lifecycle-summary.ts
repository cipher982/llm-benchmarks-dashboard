import type { NextApiRequest, NextApiResponse } from 'next';
import { corsMiddleware } from '../../utils/apiMiddleware';
import { fetchLifecycleSummary, LifecycleSummaryOptions } from '../../utils/lifecycleSummary';
import logger from '../../utils/logger';

const parseProviders = (param: string | string[] | undefined): string[] | undefined => {
    if (!param) {
        return undefined;
    }
    const parts = Array.isArray(param) ? param : param.split(',');
    const providers = parts
        .map(part => part.trim())
        .filter(Boolean);
    return providers.length ? providers : undefined;
};

const parseBoolParam = (value: string | string[] | undefined): boolean => {
    if (Array.isArray(value)) {
        return value.some(parseBoolParam);
    }
    if (!value) return false;
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const providers = parseProviders(req.query.provider || req.query.providers);
        const includeActive = parseBoolParam(req.query.includeActive);

        const options: LifecycleSummaryOptions = {
            providers,
            includeActive,
        };

        const summary = await fetchLifecycleSummary(options);

        return res.status(200).json({
            generatedAt: new Date().toISOString(),
            ...summary,
        });
    } catch (error) {
        logger.error(`Error fetching lifecycle summary: ${error}`);
        return res.status(500).json({ error: 'Failed to fetch lifecycle summary' });
    }
}

export default async function lifecycleSummaryHandler(req: NextApiRequest, res: NextApiResponse) {
    const corsHandled = await corsMiddleware(req, res);
    if (corsHandled) return;
    return handler(req, res);
}

