import { NextApiRequest, NextApiResponse } from 'next';
import { CloudMetrics } from '../../models/BenchmarkMetrics';
import { cleanTransformCloud } from '../../utils/processCloud';
import { mapModelNames } from '../../utils/modelMappingDB';
import { corsMiddleware, fetchAndProcessMetrics } from '../../utils/apiMiddleware';

export default async function debugPipeline(req: NextApiRequest, res: NextApiResponse) {
    // Handle CORS
    const corsHandled = await corsMiddleware(req, res);
    if (corsHandled) return;

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const steps: any[] = [];
        
        // Step 1: Fetch raw data
        steps.push("🔄 Step 1: Fetching raw metrics from MongoDB...");
        const days = req.query.days ? parseInt(req.query.days as string) : 3;
        steps.push(`🔧 Using ${days} days of data`);
        
        const rawData = await fetchAndProcessMetrics(
            CloudMetrics,
            days,
            (data: any[]) => data
        );
        const metricsArray = Array.isArray(rawData) ? rawData : (rawData.raw || []);
        steps.push(`✅ Step 1: Got ${metricsArray.length} raw metrics`);
        
        // Step 2: Find sample ugly models
        const uglyModels = metricsArray.filter((m: any) => 
            m.model_name && m.model_name.includes('meta-llama/meta-llama')
        ).slice(0, 3);
        steps.push(`🔍 Step 2: Found ${uglyModels.length} ugly model samples:`);
        uglyModels.forEach((m: any) => {
            steps.push(`   - Provider: ${m.provider}, Model: ${m.model_name}`);
        });
        
        // Step 3: Transform data
        steps.push("🔄 Step 3: Running cleanTransformCloud...");
        const transformedData = cleanTransformCloud(metricsArray);
        steps.push(`✅ Step 3: Transformed to ${transformedData.length} processed items`);
        
        // Step 4: Find transformed ugly models
        const transformedUgly = transformedData.filter((m: any) => 
            m.model_name && m.model_name.includes('meta-llama/meta-llama')
        ).slice(0, 3);
        steps.push(`🔍 Step 4: After transform, ${transformedUgly.length} ugly models remain:`);
        transformedUgly.forEach((m: any) => {
            steps.push(`   - Provider: ${m.provider}, Model: ${m.model_name}, Display: ${m.display_name || 'none'}`);
        });
        
        // Step 5: Apply model mapping
        steps.push("🔄 Step 5: Applying model mapping with USE_DATABASE_MODELS=true...");
        const useDbModels = process.env.USE_DATABASE_MODELS === 'true';
        steps.push(`   - USE_DATABASE_MODELS flag: ${useDbModels}`);
        
        const mappedData = await mapModelNames(transformedData, useDbModels);
        steps.push(`✅ Step 5: Model mapping complete, got ${mappedData.length} items`);
        
        // Step 6: Check if ugly models were fixed
        const stillUgly = mappedData.filter((m: any) => 
            m.model_name && m.model_name.includes('meta-llama/meta-llama')
        ).slice(0, 3);
        steps.push(`🔍 Step 6: After mapping, ${stillUgly.length} ugly models remain:`);
        stillUgly.forEach((m: any) => {
            steps.push(`   - Provider: ${m.provider}, Model: ${m.model_name}, Display: ${m.display_name || 'none'}`);
        });
        
        // Step 7: Show what should be clean
        const shouldBeClean = mappedData.filter((m: any) => 
            m.model_name && !m.model_name.includes('/') && m.model_name.includes('llama')
        ).slice(0, 3);
        steps.push(`✅ Step 7: Clean llama models found: ${shouldBeClean.length}`);
        shouldBeClean.forEach((m: any) => {
            steps.push(`   - Provider: ${m.provider}, Model: ${m.model_name}, Display: ${m.display_name || 'none'}`);
        });
        
        return res.status(200).json({
            message: "Debug pipeline complete",
            steps,
            summary: {
                totalRawMetrics: metricsArray.length,
                totalTransformed: transformedData.length,
                totalMapped: mappedData.length,
                uglyModelsRemaining: stillUgly.length,
                cleanModelsFound: shouldBeClean.length,
                useDatabaseModels: useDbModels
            }
        });
        
    } catch (error) {
        return res.status(500).json({ 
            error: 'Debug pipeline failed', 
            details: error instanceof Error ? error.message : String(error)
        });
    }
}