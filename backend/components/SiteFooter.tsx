import Link from 'next/link';

const SiteFooter = () => (
  <footer className="SiteFooter">
    <span>
      Created by{' '}
      <a href="https://drose.io" rel="author me">
        David Rose
      </a>
      , AI engineer.
    </span>
    <span aria-hidden="true"> · </span>
    <a href="https://github.com/cipher982/llm-benchmarks" rel="me">
      Source on GitHub
    </a>
    <span aria-hidden="true"> · </span>
    <Link href="/status">Benchmark status</Link>
  </footer>
);

export default SiteFooter;
