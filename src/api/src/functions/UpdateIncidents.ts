import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import type { UpdateIncidentRequest } from "../shared/models/Incident";
import { createApiError } from "../shared/models/ApiErrors";

import { getCorrelationId } from "../shared/utils/correlation";
import { isAuthenticatedAdmin } from "../shared/utils/adminAuth";
import { validateUpdateIncidentRequest } from "../shared/validation/incidentValidation";
import { updateIncident as updateIncidentInRepo } from "../shared/db/sqlIncidentRepository";

export async function updateIncident(
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

    const body = (await request.json()) as Partial<UpdateIncidentRequest>;
    const validation = validateUpdateIncidentRequest(body);

    if (!validation.isValid) {
      return {
        status: 400,
        jsonBody: createApiError(
          "VALIDATION_ERROR",
          "One or more validation errors occurred.",
          correlationId,
          validation.errors
        ),
      };
    }

    const response = await updateIncidentInRepo(
      incidentId,
      body as UpdateIncidentRequest
    );

    if (!response) {
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
      jsonBody: response,
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("UpdateIncident failed", error);

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

app.http("UpdateIncident", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "internal/incidents/{incidentId}",
  handler: updateIncident,
});