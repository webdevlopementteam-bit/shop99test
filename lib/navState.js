// React Router's `navigate(path, { state })` had no Next.js `router.push()`
// equivalent — this replicates the same "payload tied to the next
// navigation, consumed once" semantics via sessionStorage (same-tab only,
// cleared on read, never leaks into localStorage/persisted state).
const PREFIX = "__navState:";

export function setNavState(key, value) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

export function consumeNavState(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw == null) return null;
    sessionStorage.removeItem(PREFIX + key);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
