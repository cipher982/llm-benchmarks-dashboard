import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiScriptSrc = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_SRC || 'https://analytics.drose.io/script.js';
  const umamiDomains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;

  return (
    <Html lang="en">
      <Head>
        {umamiWebsiteId && (
          <script
            defer
            src={umamiScriptSrc}
            data-website-id={umamiWebsiteId}
            data-domains={umamiDomains}
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
