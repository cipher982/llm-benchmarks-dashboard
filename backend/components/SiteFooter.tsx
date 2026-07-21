import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trackUmamiEvent } from '../utils/analytics';

const SiteFooter = () => {
  const pathname = usePathname();
  const trackIdentity = (destination: string) => () => {
    trackUmamiEvent('identity_link_click', {
      source: 'llm_benchmarks',
      placement: 'footer',
      destination,
      path: pathname || '/unknown',
    });
  };

  return (
    <footer className="SiteFooter">
      <span>
        Built and maintained by{' '}
        <a href="https://drose.io" rel="author me" onClick={trackIdentity('drose_home')}>
          David W. Rose
        </a>
        {' '}(
        <a href="https://github.com/cipher982" rel="me" onClick={trackIdentity('github_profile')}>
          cipher982
        </a>
        ).
      </span>
      <span aria-hidden="true"> · </span>
      <a href="https://github.com/cipher982/llm-benchmarks-dashboard" onClick={trackIdentity('github_source')}>
        Source on GitHub
      </a>
      <span aria-hidden="true"> · </span>
      <Link href="/status">Benchmark status</Link>
    </footer>
  );
};

export default SiteFooter;
