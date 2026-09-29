// Client-side session helpers shared by the storefront and the admin panel.
//
// Storage ownership (the two sessions must never share a key):
//   storefront → "token" (+ legacy "userToken"), "user", "role"
//   admin      → "adminToken"
// Admin login used to also write "token", so the storefront would send an
// admin JWT (an Admin-table id) as a user token, and a later user login would
// overwrite the admin's fallback — both show up as random "Unauthorized".
//
// The server is the only judge of validity: a session is ended when an
// authenticated request comes back 401 (or, for admin, "Admin access
// required"), never on a client-side clock check.

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please login again.";
export const USER_SESSION_EXPIRED_EVENT = "auth:user-session-expired";

const FLAG_KEY = "auth:session-expired"; // sessionStorage → "user" | "admin"
const isBrowser = () => typeof window !== "undefined";

/** Decodes a JWT payload without verifying it (routing decisions only). */
function jwtPayload(token) {
  try {
    const part = String(token).split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const clean = (v) => String(v || "").trim().replace(/^Bearer\s+/i, "").trim();

/* ================= STOREFRONT ================= */

/** The storefront user's JWT, or "" — never an admin token. */
export function getUserToken() {
  if (!isBrowser()) return "";
  const token = clean(localStorage.getItem("token")) || clean(localStorage.getItem("userToken"));
  if (!token) return "";
  // Leftover from an admin login in this browser — not a customer session.
  if (jwtPayload(token)?.role === "admin" || token === clean(localStorage.getItem("adminToken"))) {
    clearUserSession();
    return "";
  }
  return token;
}

export function clearUserSession() {
  if (!isBrowser()) return;
  for (const k of ["token", "userToken", "user", "role"]) localStorage.removeItem(k);
}

// Protected storefront pages: the session ending here means the page can't work.
const USER_PROTECTED_PATHS = ["/account", "/wishlist", "/checkout"];

let userExpiring = false;

/** Ends an invalid storefront session: clears it, tells mounted UI, and
 * sends the user to login when they're on a page that needs one. */
export function expireUserSession() {
  if (!isBrowser() || userExpiring) return;
  userExpiring = true;
  clearUserSession();
  window.dispatchEvent(new Event(USER_SESSION_EXPIRED_EVENT));

  const { pathname, search } = window.location;
  if (USER_PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    sessionStorage.setItem(FLAG_KEY, "user");
    window.location.assign(`/login?redirect=${encodeURIComponent(pathname + search)}`);
    return;
  }
  // Public page: stay here, logged out, and say why.
  import("react-toastify").then(({ toast }) => {
    toast.info(SESSION_EXPIRED_MESSAGE, { toastId: "session-expired" });
    userExpiring = false;
  });
}

/**
 * Logs the customer out when their token's own expiry (`exp`, 7 days after
 * login) passes — right away if it already has, or at that moment while the
 * site stays open — instead of waiting for some later API call to 401.
 * Returns a cleanup function. A 60s grace absorbs small clock differences.
 */
export function scheduleUserSessionExpiry() {
  if (!isBrowser()) return () => {};
  const token = getUserToken();
  const exp = token ? Number(jwtPayload(token)?.exp) : NaN;
  if (!Number.isFinite(exp)) return () => {};

  const msLeft = exp * 1000 + 60_000 - Date.now();
  if (msLeft <= 0) {
    expireUserSession();
    return () => {};
  }
  // setTimeout caps at ~24.8 days; a 7-day session fits.
  const timer = setTimeout(() => {
    if (getUserToken() === token) expireUserSession();
  }, Math.min(msLeft, 2_147_483_647));
  return () => clearTimeout(timer);
}

/* ================= ADMIN ================= */

/** The admin JWT, or "". */
export function getAdminToken() {
  if (!isBrowser()) return "";
  return clean(localStorage.getItem("adminToken"));
}

export function clearAdminSession() {
  if (!isBrowser()) return;
  const admin = getAdminToken();
  localStorage.removeItem("adminToken");
  sessionStorage.removeItem("adminToken");
  // Old admin logins mirrored the token into "token"; drop that copy only.
  if (admin && clean(localStorage.getItem("token")) === admin) localStorage.removeItem("token");
}

let adminExpiring = false;

export function expireAdminSession() {
  if (!isBrowser() || adminExpiring) return;
  clearAdminSession();
  // Already on the login/register screen: nothing to leave, don't reload it.
  if (/^\/admin\/(login|register)\b/.test(window.location.pathname)) return;
  adminExpiring = true;
  sessionStorage.setItem(FLAG_KEY, "admin");
  window.location.assign("/admin/login");
}

/**
 * Admin twin of scheduleUserSessionExpiry: ends the admin session as soon as
 * the admin JWT's `exp` passes (immediately if it already has), so an expired
 * login goes to /admin/login instead of showing "Unauthorized" errors.
 */
export function scheduleAdminSessionExpiry() {
  if (!isBrowser()) return () => {};
  const token = getAdminToken();
  const exp = token ? Number(jwtPayload(token)?.exp) : NaN;
  if (!Number.isFinite(exp)) return () => {};

  const msLeft = exp * 1000 + 60_000 - Date.now();
  if (msLeft <= 0) {
    expireAdminSession();
    return () => {};
  }
  const timer = setTimeout(() => {
    if (getAdminToken() === token) expireAdminSession();
  }, Math.min(msLeft, 2_147_483_647));
  return () => clearTimeout(timer);
}

/* ================= LOGIN-PAGE MESSAGE ================= */

/** True once, after a redirect caused by an expired session of `scope`. */
export function consumeSessionExpiredFlag(scope) {
  if (!isBrowser()) return false;
  if (sessionStorage.getItem(FLAG_KEY) !== scope) return false;
  sessionStorage.removeItem(FLAG_KEY);
  return true;
}
