// Contract slug (featureflow-client-sdk-testbed/CONTRACT.md): lowercase [a-z0-9._-],
// max 64 chars. The server sanitises defensively; the SDK validates strictly so a typo
// is a visible warning here rather than a silently mangled tag there.
const APPLICATION_PATTERN = /^[a-z0-9._-]{1,64}$/;

/**
 * Validate the configured application tag (an app label, e.g. 'mobile-app'). Case is forgiven
 * (lowercased); anything else invalid is dropped with a warning and no
 * `X-Featureflow-Application` header is sent at all.
 *
 * The warn callback is injected so this stays platform-free and silent-by-default logging
 * policy stays the caller's decision.
 */
export function sanitiseApplication(
  raw: unknown,
  warn: (message: string) => void
): string | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'string') {
    warn('Ignoring application — must be a string');
    return undefined;
  }
  const value = raw.trim().toLowerCase();
  if (!APPLICATION_PATTERN.test(value)) {
    warn(
      `Ignoring application "${raw}" — must be lowercase a-z, 0-9, dot, underscore or hyphen, max 64 chars`
    );
    return undefined;
  }
  return value;
}
