import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import type { AddIncidentCommentRequest } from "../shared/models/IncidentComment";
import { createApiError } from "../shared/models/ApiErrors";

import { getCorrelationId } from "../shared/utils/correlation";
import {
  getAuthenticatedAdminIdentity,
  isAuthenticatedAdmin,
} from "../shared/utils/adminAuth";
import { addIncidentComment as addIncidentCommentInRepo } from "../shared/db/sqlIncidentRepository";

export async function addIncidentComment(
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

    const adminIdentity = getAuthenticatedAdminIdentity(request);

    if (!adminIdentity) {
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

    const body = (await request.json()) as Partial<AddIncidentCommentRequest>;

    if (!body.commentText || body.commentText.trim().length === 0) {
      return {
        status: 400,
        jsonBody: createApiError(
          "VALIDATION_ERROR",
          "commentText is required.",
          correlationId,
          [{ field: "commentText", message: "commentText is required." }]
        ),
      };
    }

  const response = await addIncidentCommentInRepo(
    incidentId,
    body.commentText.trim(),
    adminIdentity.principalId,
    adminIdentity.principalName
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
      status: 201,
      jsonBody: response,
      headers: {
        "x-correlation-id": correlationId,
      },
    };
  } catch (error) {
    context.error("AddIncidentComment failed", error);

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

app.http("AddIncidentComment", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "internal/incidents/{incidentId}/comments",
  handler: addIncidentComment,
});