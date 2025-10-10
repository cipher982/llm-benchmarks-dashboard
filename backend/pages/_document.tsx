import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          defer
          src="https://analytics.drose.io/script.js"
          data-website-id="00f901f6-ee3c-4d8c-908d-158d9dc18933"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
