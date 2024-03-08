import Head from 'next/head';
import Link from 'next/link';

const HomePage = () => {
    return (
        <div>
            <Head>
                <title>David Rose's AI Benchmarks</title>
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <link rel="manifest" href="/site.webmanifest" />
                <meta name="theme-color" content="#ffffff" />
            </Head>
            <h1>David (Cipher982) Rose is an awesome smart engineer working in AI.</h1>
            <p>Check out the API routes:</p>
            <ul>
                <li>
                    <Link href="/api/local">Local Benchmarks API</Link>
                </li>
                <li>
                    <Link href="/api/cloud">Cloud Benchmarks API</Link>
                </li>
                <li>
                    <Link href="/api/status">Status API</Link>
                </li>
            </ul>
        </div>
    );
};

export default HomePage;
