// Replaces backend/middleware/{authMiddleware,adminAuthMiddleware,optionalAuthMiddleware}.js
// for use inside Route Handlers (no Express middleware chain here).
//
// Usage inside a route handler:
//   try {
//     const user = requireAuth(request);
//     ...
//   } catch (err) {
//     if (err instanceof AuthError) return authErrorResponse(err);
//     return Response.json({ message: err.message }, { status: 500 });
//   }

import jwt from "jsonwebtoken";

/** How long a customer stays logged in after OTP / password login. The
 * storefront logs the user out automatically when it runs out
 * (lib/authSession.js scheduleUserSessionExpiry). */
export const USER_SESSION_TTL = "7d";

/** The one place customer JWTs are issued. */
export function signUserToken(claims) {
  return jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: USER_SESSION_TTL });
}

export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken(request) {
  const header = request.headers.get("authorization");
  return header?.split(" ")[1];
}

/** Verifies JWT, throws AuthError(401) if missing/invalid. Mirrors authMiddleware. */
export function requireAuth(request) {
  const token = getToken(request);
  if (!token) throw new AuthError("Unauthorized", 401);
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AuthError("Invalid token", 401);
  }
}

/** Verifies JWT and requires role === "admin". Mirrors adminAuthMiddleware. */
export function requireAdmin(request) {
  const token = getToken(request);
  if (!token) throw new AuthError("Unauthorized", 401);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AuthError("Invalid token", 401);
  }
  if (decoded.role !== "admin") throw new AuthError("Admin access required", 403);
  return decoded;
}

/** Returns decoded user, or null if no token given. Throws on invalid/expired token. Mirrors optionalAuthMiddleware.
 * Only used on customer endpoints, so an admin JWT counts as "no customer"
 * (its id is an Admin-table id, not a user id). */
export function optionalAuth(request) {
  const token = getToken(request);
  if (!token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AuthError("Invalid token", 401);
  }
  return decoded.role === "admin" ? null : decoded;
}

export function authErrorResponse(err) {
  return Response.json({ message: err.message }, { status: err.status });
}

/**
 * Wraps a Route Handler so it only runs for a valid admin JWT:
 *   export const POST = withAdmin(async (request, ctx) => { ... });
 * 401 without/with an invalid token, 403 for a non-admin token.
 */
export function withAdmin(handler) {
  return async (request, ctx) => {
    try {
      requireAdmin(request);
    } catch (err) {
      if (err instanceof AuthError) return authErrorResponse(err);
      throw err;
    }
    return handler(request, ctx);
  };
}

/**
 * Like requireAuth, but for customer-only endpoints: rejects admin JWTs.
 * Admin and customer ids come from different tables, so an admin token's id
 * would otherwise be read as some customer's id.
 */
export function requireUser(request) {
  const user = requireAuth(request);
  if (user.role === "admin") throw new AuthError("Customer login required", 403);
  return user;
}
