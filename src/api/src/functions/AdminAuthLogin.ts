import crypto from "crypto";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import { buildAdminSessionCookie } from "../shared/auth/adminSessionCookie";
import {
  createAdminSession,
  generateAdminSessionToken,
  hashAdminSessionToken,
} from "../shared/db/sqlAdminSessionRepository";

interface AdminLoginRequest {
  adminKey?: string;
  adminName?: string;
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

function isValidAdminKey(adminKey: string): boolean {
  const configuredHash = process.env.ADMIN_SHARED_KEY_HASH;

  if (!configuredHash || configuredHash.trim().length === 0) {
    return false;
  }

  const suppliedHash = sha256(adminKey.trim());

  return timingSafeEqualHex(suppliedHash, configuredHash.trim());
}

export async function adminAuthLogin(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    const body = (await request.json()) as AdminLoginRequest;

    if (!body.adminKey || body.adminKey.trim().length === 0) {
      return {
        status: 400,
        jsonBody: createApiError(
          "VALIDATION_ERROR",
          "adminKey is required.",
          correlationId,
          [{ field: "adminKey", message: "adminKey is required." }]
        ),
        headers: {
          "x-correlation-id": correlationId,
        },
      };
    }

    if (!isValidAdminKey(body.adminKey)) {
      return {
        status: 401,
        jsonBody: createApiError(
          "UNAUTHORIZED",
          "Invalid administrator credentials.",
          correlationId
        ),
        headers: {
          "x-correlation-id": correlationId,
        },
      };
    }

    const principalName =
      body.adminName && body.adminName.trim().length > 0
        ? body.adminName.trim()
        : "Shared Admin";

    const sessionToken = generateAdminSessionToken();
    const sessionTokenHash = hashAdminSessionToken(sessionToken);

    const maxAgeSeconds = 60 * 60;
    const expiresUtc = new Date(Date.now() + maxAgeSeconds * 1000);

    const session = await createAdminSession({
      sessionTokenHash,
      principalId: "shared-admin",
      principalName,
      identityProvider: "shared-secret-session",
      expiresUtc,
    });

    return {
      status: 200,
      jsonBody: {
        principalId: session.principalId,
        principalName: session.principalName,
        identityProvider: session.identityProvider,
        expiresUtc: session.expiresUtc,
      },
      headers: {
        "x-correlation-id": correlationId,
        "Set-Cookie": buildAdminSessionCookie(sessionToken, maxAgeSeconds),
      },
    };
  } catch (error) {
    context.error("AdminAuthLogin failed", error);

    return {
      status: 500,
      jsonBody: createApiError(
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
        correlationId
      ),
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  }
}

app.http("AdminAuthLogin", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "internal/auth/login",
  handler: adminAuthLogin,
});