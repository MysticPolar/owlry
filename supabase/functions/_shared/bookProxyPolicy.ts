// Shared URL policy for the public-domain book proxy. Keeping this separate
// from the Deno entrypoint lets the Node smoke suite exercise the same rules
// that protect redirects in production.
export const BOOK_PROXY_ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  'www.gutenberg.org',
  'gutenberg.org',
  'gutenberg.pglaf.org',
  'aleph.gutenberg.org',
  'gutenberg.readingroo.ms',
  'www.gutenberg.net.au',
]);

// Gutendex currently exposes virtual Gutenberg download routes such as
// `/ebooks/11.epub3.images`; Gutenberg then redirects those to a canonical
// cache file ending in `.epub`. Both forms must pass the SSRF path guard.
export const BOOK_PROXY_EBOOK_PATH = /\.(?:epub(?:3)?(?:\.(?:images|noimages))?|mobi|azw3|fb2|txt)$/i;

export function isAllowedBookUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    BOOK_PROXY_ALLOWED_HOSTS.has(url.hostname) &&
    BOOK_PROXY_EBOOK_PATH.test(url.pathname)
  );
}
