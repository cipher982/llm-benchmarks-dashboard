#!/usr/bin/env node
const baseUrl = process.env.MODEL_PAGES_BASE_URL || 'http://localhost:3000';
const smokeProvider = process.env.SMOKE_PROVIDER_SLUG;
const smokeModel = process.env.SMOKE_MODEL_SLUG;

async function checkEndpoint(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Expected 200 from ${url}, got ${response.status}`);
  }
  return response;
}

async function main() {
  console.log(`🔍 Running model/provider smoke checks against ${baseUrl}`);
  await checkEndpoint('/api/sitemap');
  console.log('✅ /api/sitemap responded with 200');

  if (smokeProvider) {
    await checkEndpoint(`/providers/${smokeProvider}`);
    console.log(`✅ /providers/${smokeProvider} responded with 200`);
  } else {
    console.log('ℹ️  Set SMOKE_PROVIDER_SLUG to verify a provider page');
  }

  if (smokeProvider && smokeModel) {
    await checkEndpoint(`/models/${smokeProvider}/${smokeModel}`);
    console.log(`✅ /models/${smokeProvider}/${smokeModel} responded with 200`);
  } else {
    console.log('ℹ️  Set SMOKE_MODEL_SLUG to verify a model detail page');
  }

  if (smokeProvider && smokeModel) {
    await checkEndpoint(`/api/model?provider=${smokeProvider}&model=${smokeModel}`);
    console.log('✅ /api/model responded with 200 for supplied slug');
  }

  console.log('🎉 Smoke checks completed');
}

main().catch((error) => {
  console.error('❌ Smoke check failed:', error.message);
  process.exitCode = 1;
});
