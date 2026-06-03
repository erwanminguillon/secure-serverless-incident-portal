import crypto from "crypto";
import type { HttpRequest } from "@azure/functions";

import { getAdminSessionTokenFromRequest } from "./adminSessionCookie";

import {
  getValidAdminSessionByTokenHash,
  hashAdminSessionToken,
} from "../db/sqlAdminSessionRepository";

export interface AdminIdentity {
  principalId: string;
  principalName: string;
  identityProvider: string;
  sessionId?: string;
  expiresUtc?: string;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getLocalDevAdminIdentity(request: HttpRequest): AdminIdentity | null {
  const localBypassEnabled =
    process.env.LOCAL_DEV_ADMIN_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (localBypassEnabled && request.headers.get("x-dev-admin") === "true") {
    return {
      principalId: "local-dev-admin",
      principalName: request.headers.get("x-dev-admin-name") ?? "local-admin",
      identityProvider: "local-dev",
    };
  }

  return null;
}

function getSharedKeyAdminIdentity(request: HttpRequest): AdminIdentity | null {
  const suppliedKey = request.headers.get("x-admin-key");

  if (!suppliedKey || suppliedKey.trim().length === 0) {
    return null;
  }

  const configuredHash = process.env.ADMIN_SHARED_KEY_HASH;

  if (!configuredHash || configuredHash.trim().length === 0) {
    return null;
  }

  const suppliedHash = sha256(suppliedKey.trim());

  if (!timingSafeEqualHex(suppliedHash, configuredHash.trim())) {
    return null;
  }

  return {
    principalId: "shared-admin",
    principalName: request.headers.get("x-admin-name") ?? "Shared Admin",
    identityProvider: "shared-secret",
  };
}

async function getCookieSessionAdminIdentity(
  request: HttpRequest
): Promise<AdminIdentity | null> {
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
 * New async admin auth helper.
 *
 * Supports:
 * 1. Local dev bypass
 * 2. HttpOnly cookie-backed admin sessions
 * 3. Legacy x-admin-key fallback
 */
export async function getAuthenticatedAdminIdentityAsync(
  request: HttpRequest
): Promise<AdminIdentity | null> {
  const localDevIdentity = getLocalDevAdminIdentity(request);

  if (localDevIdentity) {
    return localDevIdentity;
  }

  const cookieSessionIdentity = await getCookieSessionAdminIdentity(request);

  if (cookieSessionIdentity) {
    return cookieSessionIdentity;
  }

  return getSharedKeyAdminIdentity(request);
}

export async function isAuthenticatedAdminAsync(
  request: HttpRequest
): Promise<boolean> {
  return (await getAuthenticatedAdminIdentityAsync(request)) !== null;
}

/**
 * Legacy synchronous helper.
 *
 * This supports only:
 * - LOCAL_DEV_ADMIN_BYPASS
 * - x-admin-key
 *
 * Cookie sessions require the async helpers above.
 */
export function getAuthenticatedAdminIdentity(
  request: HttpRequest
): AdminIdentity | null {
  const localDevIdentity = getLocalDevAdminIdentity(request);

  if (localDevIdentity) {
    return localDevIdentity;
  }

  return getSharedKeyAdminIdentity(request);
}

/**
 * Legacy synchronous helper.
 *
 * Existing endpoints can keep using this temporarily.
 * Endpoints migrated to cookie sessions should use isAuthenticatedAdminAsync.
 */
export function isAuthenticatedAdmin(request: HttpRequest): boolean {
  return getAuthenticatedAdminIdentity(request) !== null;
}