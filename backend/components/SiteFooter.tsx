import Link from 'next/link';

const SiteFooter = () => (
  <footer className="SiteFooter">
    <span>
      Built and maintained by{' '}
      <a href="https://drose.io" rel="author me">
        David W. Rose
      </a>
      {' '}(
      <a href="https://github.com/cipher982" rel="me">
        cipher982
      </a>
      ).
    </span>
    <span aria-hidden="true"> · </span>
    <a href="https://github.com/cipher982/llm-benchmarks-dashboard">
      Source on GitHub
    </a>
    <span aria-hidden="true"> · </span>
    <Link href="/status">Benchmark status</Link>
  </footer>
);

export default SiteFooter;
