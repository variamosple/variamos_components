/**
 * The address without its authToken parameter, or null when it has none.
 *
 * The token is never read from an address: a link could otherwise force a
 * session chosen by someone else (session fixation). The session lives in
 * the httpOnly cookie set by the admin; a token left by an older link is
 * only removed from the address bar and the history.
 */
export const addressWithoutToken = (href: string): string | null => {
  const url = new URL(href);
  if (!url.searchParams.has("authToken")) return null;
  url.searchParams.delete("authToken");
  return url.toString();
};
