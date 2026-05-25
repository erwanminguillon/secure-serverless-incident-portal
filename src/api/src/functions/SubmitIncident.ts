import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import type {
  CreateIncidentRequest,
  CreateIncidentResponse,
} from "../shared/models/Incident";
import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import { createIncident } from "../shared/db/sqlIncidentRepository";
import { validateCreateIncidentRequest } from "../shared/validation/incidentValidation";

export async function submitIncident(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    const body = (await request.json()) as Partial<CreateIncidentRequest>;
    const validation = validateCreateIncidentRequest(body);

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

    // TODO:
    // - Validate enum values against reference data
    // - Generate IncidentId / PublicId / TrackingToken
    // - Hash tracking token
    // - Insert incident into SQL
    // - Create audit entry

    const response = await createIncident(body as CreateIncidentRequest);

    return {
    status: 201,
    jsonBody: response,
    headers: {
        "x-correlation-id": correlationId,
    },
};
  } catch (error) {
    context.error("SubmitIncident failed", error);

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

app.http("SubmitIncident", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "public/incidents",
  handler: submitIncident,
});