import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import { isAuthenticatedAdminAsync } from "../shared/auth/adminAuth";
import { getIncidentById as getIncidentByIdFromRepo } from "../shared/db/sqlIncidentRepository";

export async function getIncidentById(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    if (!isAuthenticatedAdminAsync(request)) {
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

    const incident = await getIncidentByIdFromRepo(incidentId);

    if (!incident) {
      return {
        status: 404,
        jsonBody: createApiError(
          "NOT_FOUND",
          "Incident not found.",
          correlationId
        ),
      };
    }

    return {
      status: 200,
      jsonBody: incident,
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("GetIncidentById failed", error);

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

app.http("GetIncidentById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "internal/incidents/{incidentId}",
  handler: getIncidentById,
});