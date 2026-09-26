/** Only allow same-origin path redirects (open redirect safe). */
export function safeRedirectPath(raw) {
  if (!raw || typeof raw !== "string") return "/";
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  return p;
}
