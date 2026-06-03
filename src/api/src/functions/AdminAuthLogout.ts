import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import {
  buildClearAdminSessionCookie,
  getAdminSessionTokenFromRequest,
} from "../shared/auth/adminSessionCookie";
import {
  hashAdminSessionToken,
  revokeAdminSessionByTokenHash,
} from "../shared/db/sqlAdminSessionRepository";

export async function adminAuthLogout(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    const sessionToken = getAdminSessionTokenFromRequest(request);

    if (sessionToken && sessionToken.trim().length > 0) {
      const sessionTokenHash = hashAdminSessionToken(sessionToken.trim());
      await revokeAdminSessionByTokenHash(sessionTokenHash);
    }

    return {
      status: 200,
      jsonBody: {
        message: "Logged out successfully.",
      },
      headers: {
        "x-correlation-id": correlationId,
        "Set-Cookie": buildClearAdminSessionCookie(),
      },
    };
  } catch (error) {
    context.error("AdminAuthLogout failed", error);

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

app.http("AdminAuthLogout", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "internal/auth/logout",
  handler: adminAuthLogout,
});