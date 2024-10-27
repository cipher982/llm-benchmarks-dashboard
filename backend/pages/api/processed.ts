import type { NextApiRequest, NextApiResponse } from "next";
import createEndpoint from "../../utils/createEndpoint";
import { mapModelNames } from "../../utils/modelMapping";

async function fetchRawData() {
    const response = await fetch("https://llm-benchmarks-backend.vercel.app/api/cloud");
    return response.json();
}

const dataModel = {
    find: async () => ({
        select: () => ({
            exec: async () => {
                const rawData = await fetchRawData();
                const processedData = mapModelNames(rawData);
                return processedData.map(item => ({
                    ...item,
                    toObject: () => item
                }));
            }
        })
    })
};


export default async function handler(
    req: NextApiRequest & { method: string },
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        return createEndpoint(req, res, dataModel);
    } catch (error) {
        console.error("Error processing data:", error);
        res.status(500).json({ error: "Failed to process data" });
    }
}