import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import type { TrackIncidentRequest } from "../shared/models/Incident";
import { createApiError } from "../shared/models/ApiErrors";
import { getCorrelationId } from "../shared/utils/correlation";
import { trackIncident as trackIncidentFromRepo } from "../shared/db/sqlIncidentRepository";

export async function trackIncident(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(request);

  try {
    const body = (await request.json()) as Partial<TrackIncidentRequest>;

    const errors: { field: string; message: string }[] = [];

    if (!body.publicId || body.publicId.trim().length === 0) {
      errors.push({ field: "publicId", message: "PublicId is required." });
    }

    if (!body.trackingToken || body.trackingToken.trim().length === 0) {
      errors.push({
        field: "trackingToken",
        message: "Tracking token is required.",
      });
    }

    if (errors.length > 0) {
      return {
        status: 400,
        jsonBody: createApiError(
          "VALIDATION_ERROR",
          "Both publicId and trackingToken are required.",
          correlationId,
          errors
        ),
      };
    }

    const result = await trackIncidentFromRepo(
      body.publicId!.trim(),
      body.trackingToken!.trim()
    );

    if (!result) {
      return {
        status: 401,
        jsonBody: createApiError(
          "TRACKING_TOKEN_INVALID",
          "The incident reference or tracking token is invalid.",
          correlationId
        ),
      };
    }

    return {
      status: 200,
      jsonBody: result,
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("TrackIncident failed", error);

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

app.http("TrackIncident", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "public/incidents/track",
  handler: trackIncident,
});