import type { HttpRequest } from "@azure/functions";

import { getAdminSessionTokenFromRequest } from "./adminSessionCookie";
import {
  getValidAdminSessionByTokenHash,
  hashAdminSessionToken,
} from "../db/sqlAdminSessionRepository";

export type AuthenticatedAdminIdentity = {
  principalId: string;
  principalName: string;
  identityProvider: string;
  sessionId?: string;
  expiresUtc?: string;
};

function getLocalDevAdminIdentity(
  request: HttpRequest
): AuthenticatedAdminIdentity | null {
  const localBypassEnabled =
    process.env.LOCAL_DEV_ADMIN_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (!localBypassEnabled) {
    return null;
  }

  if (request.headers.get("x-dev-admin") !== "true") {
    return null;
  }

  return {
    principalId: "local-dev-admin",
    principalName: request.headers.get("x-dev-admin-name") ?? "local-admin",
    identityProvider: "local-dev",
  };
}

async function getCookieSessionAdminIdentity(
  request: HttpRequest
): Promise<AuthenticatedAdminIdentity | null> {
  const sessionToken = getAdminSessionTokenFromRequest(request);

  if (!sessionToken || sessionToken.trim().length === 0) {
    return null;
  }

  const sessionTokenHash = hashAdminSessionToken(sessionToken.trim());
  const session = await getValidAdminSessionByTokenHash(sessionTokenHash);

  if (!session) {
    return null;
  }

  return {
    principalId: session.principalId,
    principalName: session.principalName,
    identityProvider: session.identityProvider,
    sessionId: session.sessionId,
    expiresUtc: session.expiresUtc,
  };
}

/**
 * Admin authentication helper.
 *
 * Supports:
 * 1. Local development bypass, only when explicitly enabled and not in production.
 * 2. HttpOnly cookie-backed admin sessions.
 *
 * Does not support legacy x-admin-key authorization.
 * Admin keys should only be submitted to the login endpoint, where the backend
 * validates the key and creates a cookie-backed admin session.
 */
export async function getAuthenticatedAdminIdentityAsync(
  request: HttpRequest
): Promise<AuthenticatedAdminIdentity | null> {
  const localDevIdentity = getLocalDevAdminIdentity(request);

  if (localDevIdentity) {
    return localDevIdentity;
  }

  return getCookieSessionAdminIdentity(request);
}

export async function isAuthenticatedAdminAsync(
  request: HttpRequest
): Promise<boolean> {
  return (await getAuthenticatedAdminIdentityAsync(request)) !== null;
}