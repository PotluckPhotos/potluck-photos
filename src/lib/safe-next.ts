// Guards the post-login `next` redirect target against open-redirect abuse.
// Only same-site absolute paths are allowed — never full URLs (https://evil.com)
// or protocol-relative ones (//evil.com), both of which navigate off-site.
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}
