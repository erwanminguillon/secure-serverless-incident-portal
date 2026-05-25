import crypto from "crypto";
import type { HttpRequest } from "@azure/functions";

export interface AdminIdentity {
  principalId: string;
  principalName: string;
  identityProvider: string;
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

export function getAuthenticatedAdminIdentity(
  request: HttpRequest
): AdminIdentity | null {
  // Local dev bypass only
  const localBypassEnabled =
    process.env.LOCAL_DEV_ADMIN_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (localBypassEnabled && request.headers.get("x-dev-admin") === "true") {
    return {
      principalId: "local-dev-admin",
      principalName:
        request.headers.get("x-dev-admin-name") ?? "local-admin",
      identityProvider: "local-dev",
    };
  }

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

export function isAuthenticatedAdmin(request: HttpRequest): boolean {
  return getAuthenticatedAdminIdentity(request) !== null;
}