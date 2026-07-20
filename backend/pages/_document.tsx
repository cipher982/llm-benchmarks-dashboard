import { Html, Head, Main, NextScript } from 'next/document';

const visitorContextScript = `
(function() {
  function getVisitorId() {
    try {
      var key = "drose.visitor_id";
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var random = crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      var id = "dv_" + random.replace(/[^a-zA-Z0-9]/g, "").slice(0, 47);
      localStorage.setItem(key, id);
      return id;
    } catch(e) { return undefined; }
  }
  function bucketViewport() {
    var w = window.innerWidth || 0;
    if (w >= 1440) return "desktop_wide";
    if (w >= 1024) return "desktop";
    if (w >= 768) return "tablet";
    return "mobile";
  }
  function bucketSource() {
    var ref = document.referrer || "";
    var params = new URLSearchParams(location.search);
    var source = (params.get("utm_source") || "").toLowerCase();
    if (source) return source;
    if (!ref) return "direct";
    var host = "";
    try { host = new URL(ref).hostname.toLowerCase(); } catch(e) {}
    if (/chatgpt|perplexity|claude|gemini|copilot|doubao/.test(host)) return "ai";
    if (/google|bing|duckduckgo|brave|yahoo|yandex|ecosia|kagi/.test(host)) return "search";
    if (/x\\.com|twitter|facebook|instagram|linkedin|reddit|threads|tiktok|bsky/.test(host)) return "social";
    if (/localhost|127\\.0\\.0\\.1|\\.local$|ts\\.net/.test(host)) return "dev";
    return "other";
  }
  function trafficQuality() {
    var ua = navigator.userAgent || "";
    if (/HeadlessChrome|Playwright|Puppeteer|Selenium/i.test(ua)) return "headless_hint";
    if (/UptimeRobot|Pingdom|BetterStack|StatusCake|Healthchecks/i.test(ua)) return "monitor_hint";
    if (/localhost|127\\.0\\.0\\.1|\\.local$/.test(location.hostname)) return "dev";
    return "human";
  }
  try {
    if (!sessionStorage.getItem("drose.landing_path")) {
      sessionStorage.setItem("drose.landing_path", location.pathname);
    }
  } catch(e) {}
  window.sendUmamiVisitorContext = function() {
    try {
      if (!window.umami || !window.umami.identify) return;
      var nav = navigator;
      var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      var data = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
        timezone_offset: new Date().getTimezoneOffset(),
        viewport: bucketViewport(),
        pixel_ratio: Math.round((window.devicePixelRatio || 1) * 100) / 100,
        touch: (nav.maxTouchPoints || 0) > 0,
        connection: conn && conn.effectiveType ? conn.effectiveType : "unknown",
        source_bucket: bucketSource(),
        traffic_quality: trafficQuality(),
        landing_path: sessionStorage.getItem("drose.landing_path") || location.pathname
      };
      var visitorId = getVisitorId();
      if (visitorId) {
        window.umami.identify(visitorId, data);
      } else {
        window.umami.identify(data);
      }
    } catch(e) {}
  };
})();
`;

const siteIdentity = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://llm-benchmarks.com/#website',
  name: 'LLM Benchmarks',
  url: 'https://llm-benchmarks.com',
  description: 'Independent, continuously updated measurements of LLM API throughput, latency, and reliability.',
  creator: {
    '@type': 'Person',
    '@id': 'https://drose.io/#person',
    name: 'David Rose',
    url: 'https://drose.io',
    sameAs: ['https://github.com/cipher982', 'https://www.linkedin.com/in/david-w-rose/'],
    jobTitle: 'AI Engineer',
  },
};

export default function Document() {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiScriptSrc = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_SRC || 'https://analytics.drose.io/script.js';
  const umamiRecorderSrc = umamiScriptSrc.replace('script.js', 'recorder.js');
  const umamiDomains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;
  const umamiTag = process.env.NEXT_PUBLIC_UMAMI_TAG || 'prod';

  return (
    <Html lang="en">
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteIdentity) }} />
        {/* Visitor context helper — must run before tracker loads */}
        <script dangerouslySetInnerHTML={{ __html: visitorContextScript }} />
        {umamiWebsiteId && (
          <script
            defer
            src={umamiScriptSrc}
            data-website-id={umamiWebsiteId}
            data-domains={umamiDomains}
            data-tag={umamiTag}
            data-performance="true"
            // @ts-expect-error custom data attribute
            onLoad="window.sendUmamiVisitorContext && window.sendUmamiVisitorContext()"
          />
        )}
        {umamiWebsiteId && (
          <script
            defer
            src={umamiRecorderSrc}
            data-website-id={umamiWebsiteId}
            data-sample-rate="1"
            data-mask-level="moderate"
            data-max-duration="1800000"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
