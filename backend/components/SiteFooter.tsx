import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trackUmamiEvent } from '../utils/analytics';

/**
 * Site attribution and off-site links.
 *
 * Deliberately thin. What a column means and how sampling works is page
 * content and lives on the page that defines those columns — a global footer
 * cannot say it without saying it on pages where it is not true.
 */
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
        )
      </span>
      <span aria-hidden="true"> · </span>
      <a href="https://github.com/cipher982/llm-benchmarks-dashboard" onClick={trackIdentity('github_source')}>
        source
      </a>
      <span aria-hidden="true"> · </span>
      <Link href="/status">collector status</Link>
      <span aria-hidden="true"> · </span>
      {/* An API route, not a page — next/link would prefetch a JSON payload. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/processed?days=14">raw api</a>
    </footer>
  );
};

export default SiteFooter;
