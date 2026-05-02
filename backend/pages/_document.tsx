import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiScriptSrc = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_SRC || 'https://analytics.drose.io/script.js';
  const umamiRecorderSrc = umamiScriptSrc.replace('script.js', 'recorder.js');
  const umamiDomains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;
  const umamiTag = process.env.NEXT_PUBLIC_UMAMI_TAG || 'prod';

  return (
    <Html lang="en">
      <Head>
        {umamiWebsiteId && (
          <script
            defer
            src={umamiScriptSrc}
            data-website-id={umamiWebsiteId}
            data-domains={umamiDomains}
            data-tag={umamiTag}
            data-performance="true"
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
