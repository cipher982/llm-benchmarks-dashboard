/**
 * Utilities for SEO optimization and URL handling
 */

/**
 * Converts a string to a URL-friendly slug
 * @param text The text to convert to a slug
 * @returns URL-friendly slug
 */
export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "") // Remove special characters
    .replace(/ +/g, "-"); // Replace spaces with hyphens
};

/**
 * Creates a model-specific URL
 * @param provider The provider name (e.g., "openai")
 * @param modelName The model name (e.g., "gpt-4")
 * @returns Model-specific URL path
 */
export const createModelUrl = (provider: string, modelName: string): string => {
  return `/models/${createSlug(provider)}/${createSlug(modelName)}`;
};

/**
 * Generates SEO metadata for a specific model
 * @param provider The provider name
 * @param modelName The model name
 * @param displayName Optional display name
 * @returns SEO metadata object
 */
export const generateModelMetadata = (
  provider: string,
  modelName: string,
  displayName?: string
) => {
  const modelDisplayName = displayName || modelName;
  
  return {
    title: `${modelDisplayName} by ${provider} - LLM Benchmarks`,
    description: `Performance benchmarks for ${modelDisplayName} by ${provider}. Compare speed, latency, and reliability metrics.`,
    keywords: `${provider}, ${modelDisplayName}, ${modelName}, LLM, AI model, benchmark, performance, speed, tokens per second, latency, time to first token`,
    canonicalUrl: `/models/${createSlug(provider)}/${createSlug(modelName)}`,
  };
};

/**
 * Updates document metadata for SEO
 * @param metadata SEO metadata object
 */
export const updateDocumentMetadata = (metadata: {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
}): void => {
  // Update title
  document.title = metadata.title;
  
  // Update meta tags
  const metaTags = {
    description: metadata.description,
    keywords: metadata.keywords,
  };
  
  Object.entries(metaTags).forEach(([name, content]) => {
    let metaTag = document.querySelector(`meta[name="${name}"]`);
    
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("name", name);
      document.head.appendChild(metaTag);
    }
    
    metaTag.setAttribute("content", content);
  });
  
  // Update canonical URL
  let canonicalTag = document.querySelector('link[rel="canonical"]');
  
  if (!canonicalTag) {
    canonicalTag = document.createElement("link");
    canonicalTag.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalTag);
  }
  
  canonicalTag.setAttribute(
    "href",
    `${window.location.origin}${metadata.canonicalUrl}`
  );
  
  // Add Open Graph meta tags
  const ogTags = {
    "og:title": metadata.title,
    "og:description": metadata.description,
    "og:type": "website",
    "og:url": `${window.location.origin}${metadata.canonicalUrl}`,
  };
  
  Object.entries(ogTags).forEach(([property, content]) => {
    let ogTag = document.querySelector(`meta[property="${property}"]`);
    
    if (!ogTag) {
      ogTag = document.createElement("meta");
      ogTag.setAttribute("property", property);
      document.head.appendChild(ogTag);
    }
    
    ogTag.setAttribute("content", content);
  });
};

/**
 * Generates JSON-LD structured data for a model benchmarks page
 * @param provider The provider name
 * @param modelName The model name
 * @param displayName Optional display name
 * @param averageSpeed Average speed in tokens per second
 * @param timeToFirstToken Average time to first token in ms
 * @returns JSON-LD structured data as string
 */
export const generateStructuredData = (
  provider: string,
  modelName: string,
  displayName: string,
  averageSpeed: number,
  timeToFirstToken: number
): string => {
  const modelData = {
    "@context": "https://schema.org/",
    "@type": "TechArticle",
    "headline": `${displayName} by ${provider} - LLM Benchmarks`,
    "description": `Performance benchmarks for ${displayName} by ${provider}. Compare speed, latency, and reliability metrics.`,
    "keywords": `${provider}, ${displayName}, ${modelName}, LLM, AI model, benchmark, performance, speed, tokens per second, latency, time to first token`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://llm-benchmarks.com/models/${createSlug(provider)}/${createSlug(modelName)}`
    },
    "dateModified": new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": "LLM Benchmarks"
    },
    "publisher": {
      "@type": "Organization",
      "name": "LLM Benchmarks",
      "logo": {
        "@type": "ImageObject",
        "url": "https://llm-benchmarks.com/logo.png"
      }
    },
    "about": {
      "@type": "Thing",
      "name": `${displayName} AI Model`,
      "description": `A large language model by ${provider} with an average speed of ${averageSpeed.toFixed(2)} tokens/sec and average time to first token of ${timeToFirstToken.toFixed(2)} ms.`
    }
  };

  return JSON.stringify(modelData);
};

/**
 * Adds JSON-LD structured data to document head
 * @param structuredData JSON-LD structured data string
 */
export const addStructuredData = (structuredData: string): void => {
  // Remove any existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.textContent = structuredData;
  document.head.appendChild(script);
};

interface SeoBaseArgs {
  title: string;
  description: string;
  canonical: string;
  keywords: string;
  baseUrl?: string;
}

export interface SeoMetadata extends SeoBaseArgs {
  openGraph: {
    title: string;
    description: string;
    type: string;
    url: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
  };
  jsonLd?: Record<string, any>;
}

const DEFAULT_BASE_URL = "https://llm-benchmarks.com";

function formatNumber(value: number | null | undefined, digits = 2): string | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  return Number(value).toFixed(digits);
}

export interface ModelSeoArgs {
  baseUrl?: string;
  providerName: string;
  providerSlug: string;
  modelName: string;
  modelSlug: string;
  displayName: string;
  summary: {
    tokensPerSecondMean: number | null;
    timeToFirstTokenMean: number | null;
    runCount: number;
    latestRunAt?: string;
  };
}

export function buildModelSeoMetadata({
  baseUrl = DEFAULT_BASE_URL,
  providerName,
  providerSlug,
  modelName,
  modelSlug,
  displayName,
  summary,
}: ModelSeoArgs): SeoMetadata {
  const canonicalPath = `/models/${providerSlug}/${modelSlug}`;
  const canonical = `${baseUrl}${canonicalPath}`;
  const speed = formatNumber(summary.tokensPerSecondMean);
  // Convert TTFT from seconds to milliseconds
  const ttft = summary.timeToFirstTokenMean !== null && summary.timeToFirstTokenMean !== undefined
    ? formatNumber(summary.timeToFirstTokenMean * 1000)
    : undefined;
  const title = `${displayName} by ${providerName} Benchmarks – LLM Benchmarks`;
  const descriptionParts = [
    `Benchmarks for ${displayName} by ${providerName}.`,
  ];
  if (speed) {
    descriptionParts.push(`Average throughput ${speed} tokens/sec`);
  }
  if (ttft) {
    descriptionParts.push(`time to first token ${ttft} ms`);
  }
  descriptionParts.push(`based on ${summary.runCount} recent runs.`);
  const description = descriptionParts.join(" ");
  const keywords = `${providerName}, ${displayName}, ${modelName}, LLM benchmark, latency, tokens per second`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${displayName} Benchmarks`,
    description,
    keywords,
    dateModified: summary.latestRunAt ?? new Date().toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    author: {
      "@type": "Organization",
      name: "LLM Benchmarks",
    },
    publisher: {
      "@type": "Organization",
      name: "LLM Benchmarks",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
  };

  return {
    title,
    description,
    canonical,
    keywords,
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    jsonLd,
  };
}

export interface ProviderSeoArgs {
  baseUrl?: string;
  providerName: string;
  providerSlug: string;
  summary: {
    tokensPerSecondMean: number | null;
    timeToFirstTokenMean: number | null;
    modelCount: number;
    latestRunAt?: string;
  };
}

export function buildProviderSeoMetadata({
  baseUrl = DEFAULT_BASE_URL,
  providerName,
  providerSlug,
  summary,
}: ProviderSeoArgs): SeoMetadata {
  const canonicalPath = `/providers/${providerSlug}`;
  const canonical = `${baseUrl}${canonicalPath}`;
  const speed = formatNumber(summary.tokensPerSecondMean);
  // Convert TTFT from seconds to milliseconds
  const ttft = summary.timeToFirstTokenMean !== null && summary.timeToFirstTokenMean !== undefined
    ? formatNumber(summary.timeToFirstTokenMean * 1000)
    : undefined;
  const title = `${providerName} LLM Benchmarks – Performance & Latency`;
  const descriptionParts = [`Performance benchmarks covering ${summary.modelCount} ${providerName} models.`];
  if (speed) {
    descriptionParts.push(`Median throughput ${speed} tokens/sec`);
  }
  if (ttft) {
    descriptionParts.push(`time to first token ${ttft} ms.`);
  }
  const description = descriptionParts.join(" ");
  const keywords = `${providerName}, LLM provider benchmarks, model speed, latency, AI performance`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: providerName,
    description,
    url: canonical,
    dateModified: summary.latestRunAt ?? new Date().toISOString(),
  };

  return {
    title,
    description,
    canonical,
    keywords,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    jsonLd,
  };
}
