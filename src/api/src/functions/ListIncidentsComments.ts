import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import { isAuthenticatedAdmin } from "../shared/utils/adminAuth";
import { listIncidentComments as listIncidentCommentsFromRepo } from "../shared/db/sqlIncidentRepository";

export async function listIncidentComments(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    if (!isAuthenticatedAdmin(request)) {
      return {
        status: 401,
        jsonBody: createApiError(
          "UNAUTHORIZED",
          "Authentication is required.",
          correlationId
        ),
      };
    }

    const incidentId = request.params.incidentId;

    if (!incidentId) {
      return {
        status: 400,
        jsonBody: createApiError(
          "VALIDATION_ERROR",
          "incidentId is required.",
          correlationId,
          [{ field: "incidentId", message: "incidentId is required." }]
        ),
      };
    }

    const response = await listIncidentCommentsFromRepo(incidentId);

    return {
      status: 200,
      jsonBody: response,
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("ListIncidentComments failed", error);

    return {
      status: 500,
      jsonBody: createApiError(
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
        correlationId
      ),
    };
  }
}

app.http("ListIncidentComments", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "internal/incidents/{incidentId}/comments",
  handler: listIncidentComments,
});