import crypto from "crypto";

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getAuthenticatedAdminIdentityAsync } from "../shared/auth/adminAuth";
import { getEvidenceByIncidentId } from "../shared/db/sqlIncidentRepository";

function jsonResponse(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    jsonBody: body,
  };
}

function unauthorized(): HttpResponseInit {
  return jsonResponse(401, {
    error: {
      code: "unauthorized",
      message: "Admin authentication is required.",
    },
  });
}

function badRequest(message: string): HttpResponseInit {
  return jsonResponse(400, {
    error: {
      code: "bad_request",
      message,
    },
  });
}

function serverError(correlationId: string): HttpResponseInit {
  return jsonResponse(500, {
    error: {
      code: "internal_error",
      message: "Failed to list incident evidence.",
      correlationId,
    },
  });
}

export async function listIncidentEvidence(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = crypto.randomUUID();

  try {
    const adminIdentity = await getAuthenticatedAdminIdentityAsync(request);

    if (!adminIdentity) {
      return unauthorized();
    }

    const incidentId = request.params.incidentId?.trim();

    if (!incidentId) {
      return badRequest("incidentId route parameter is required.");
    }

    const response = await getEvidenceByIncidentId(incidentId);

    return jsonResponse(200, response);
  } catch (err) {
    if (err instanceof Error) {
      context.error("Failed to list incident evidence.", {
        correlationId,
        errorName: err.name,
        errorMessage: err.message,
      });
    } else {
      context.error("Failed to list incident evidence with non-error value.", {
        correlationId,
      });
    }

    return serverError(correlationId);
  }
}

app.http("ListIncidentEvidence", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "internal/incidents/{incidentId}/evidence",
  handler: listIncidentEvidence,
});