import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import { getAuthenticatedAdminIdentityAsync } from "../shared/auth/adminAuth";


export async function getAdminMe(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    const identity = await getAuthenticatedAdminIdentityAsync(request);

    if (!identity) {
      return {
        status: 401,
        jsonBody: createApiError(
          "UNAUTHORIZED",
          "Authentication is required.",
          correlationId
        ),
        headers: {
          "x-correlation-id": correlationId,
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        principalId: identity.principalId,
        principalName: identity.principalName,
        identityProvider: identity.identityProvider,
        sessionId: identity.sessionId ?? null,
        expiresUtc: identity.expiresUtc ?? null,
      },
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("GetAdminMe failed", error);

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

app.http("GetAdminMe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "internal/auth/me",
  handler: getAdminMe,
});