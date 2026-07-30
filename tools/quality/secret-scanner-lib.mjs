import path from "node:path";

const PLACEHOLDER_CONTEXT = /(?:^|\/)(?:docs\/|\.github\/workflows\/|[^/]*\.test\.[^/]+$|\.env(?:\.[^/]+)?\.example$|compose(?:\.[^/]+)?\.ya?ml$)/i;
const EXPLICIT_PLACEHOLDER = /(?:\$\{[^}]+\}|change[-_]?me|example|sample|dummy|synthetic|not[-_]?secret|qa[-_]|demo[-_]|local[-_]|^user:password$)/i;

export function isAllowedPlaceholderConnection(relativePath, username, password) {
  const normalizedPath = relativePath.replaceAll(path.sep, "/");
  if (!PLACEHOLDER_CONTEXT.test(normalizedPath)) {
    return false;
  }

  const credential = `${decodeCredential(username)}:${decodeCredential(password)}`;
  return EXPLICIT_PLACEHOLDER.test(credential);
}

function decodeCredential(value) {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}
