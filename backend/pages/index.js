import Link from 'next/link';

const HomePage = () => {
    return (
        <div>
            <h1>David (Cipher982) Rose is an awesome smart engineer working in AI.</h1>
            <p>Check out the API routes:</p>
            <ul>
                <li>
                    <Link href="/api/local">Local Benchmarks API</Link>
                </li>
                <li>
                    <Link href="/api/cloud">Cloud Benchmarks API</Link>
                </li>
            </ul>
        </div>
    );
};

export default HomePage;