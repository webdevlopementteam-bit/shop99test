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

/** Returns decoded user, or null if no token given. Throws on invalid/expired token. Mirrors optionalAuthMiddleware. */
export function optionalAuth(request) {
  const token = getToken(request);
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AuthError("Invalid token", 401);
  }
}

export function authErrorResponse(err) {
  return Response.json({ message: err.message }, { status: err.status });
}
