import type { NextApiRequest, NextApiResponse } from "next";
import createEndpoint from "../../utils/createEndpoint";
import { CloudBenchmark } from "../../../frontend/src/types/CloudData";
import { mapModelNames } from "../../../frontend/src/utils/modelMapping";

async function fetchRawData() {
    const response = await fetch("https://llm-benchmarks-backend.vercel.app/api/cloud");
    return response.json();
}

const processData = async (data: CloudBenchmark[]) => {
    return mapModelNames(data);
};

const mockModel = {
    find: async () => processData(await fetchRawData())
};

export default async function handler(
    req: NextApiRequest & { method: string },
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        return createEndpoint(req, res, mockModel);
    } catch (error) {
        console.error("Error processing data:", error);
        res.status(500).json({ error: "Failed to process data" });
    }
}