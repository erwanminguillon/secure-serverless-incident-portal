import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import type { IncidentQueryParams } from "../shared/models/Incident";
import { createApiError } from "../shared/models/ApiErrors";

import { getCorrelationId } from "../shared/utils/correlation";
import { isAuthenticatedAdminAsync } from "../shared/auth/adminAuth";
import { listIncidents as listIncidentsFromRepo } from "../shared/db/sqlIncidentRepository";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed;
}

export async function listIncidents(
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

    const query: IncidentQueryParams = {
      statusCode:
        (request.query.get("statusCode") as IncidentQueryParams["statusCode"]) ??
        undefined,
      severityCode:
        (request.query.get("severityCode") as IncidentQueryParams["severityCode"]) ??
        undefined,
      categoryCode:
        (request.query.get("categoryCode") as IncidentQueryParams["categoryCode"]) ??
        undefined,
      reportTypeCode:
        (request.query.get("reportTypeCode") as IncidentQueryParams["reportTypeCode"]) ??
        undefined,
      search: request.query.get("search") ?? undefined,
      page: parsePositiveInt(request.query.get("page"), 1),
      pageSize: parsePositiveInt(request.query.get("pageSize"), 20),
    };

    context.log("ListIncidents query", query);

    const response = await listIncidentsFromRepo(query);

    return {
      status: 200,
      jsonBody: response,
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("ListIncidents failed", error);

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

app.http("ListIncidents", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "internal/incidents",
  handler: listIncidents,
});