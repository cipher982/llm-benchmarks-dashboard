import type { NextApiRequest, NextApiResponse } from "next";
import createEndpoint from "../../utils/createEndpoint";
import { mapModelNames } from "../../utils/modelMapping";
import { CloudBenchmark } from "../../types/CloudData";

async function fetchRawData(): Promise<CloudBenchmark[]> {
    const response = await fetch("https://llm-benchmarks-backend.vercel.app/api/cloud");
    const data = await response.json();
    return data.map((item: any) => ({
        ...item,
        run_ts: new Date(item.run_ts || Date.now())
    }));
}

const dataModel = {
    find: function(query?: any) {
        return {
            select: function(projection?: string) {
                return {
                    exec: async function() {
                        const rawData = await fetchRawData();
                        const processedData = mapModelNames(rawData);
                        
                        if (query?.run_ts?.$gte) {
                            return processedData.filter(item => 
                                item.run_ts && item.run_ts >= query.run_ts.$gte
                            );
                        }
                        return processedData;
                    }
                };
            }
        };
    }
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