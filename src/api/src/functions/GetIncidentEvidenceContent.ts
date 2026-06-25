import crypto from "crypto";

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getAuthenticatedAdminIdentityAsync } from "../shared/auth/adminAuth";
import { getEvidenceByEvidenceId } from "../shared/db/sqlIncidentRepository";
import { downloadEvidenceBlob } from "../shared/storage/evidenceBlobStorage";

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

function notFound(): HttpResponseInit {
  return jsonResponse(404, {
    error: {
      code: "evidence_not_found",
      message: "Evidence was not found.",
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
      message: "Failed to load evidence.",
      correlationId,
    },
  });
}

export async function getIncidentEvidenceContent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = crypto.randomUUID();

  try {
    const adminIdentity = await getAuthenticatedAdminIdentityAsync(request);

    if (!adminIdentity) {
      return unauthorized();
    }

    const evidenceId = request.params.evidenceId?.trim();

    if (!evidenceId) {
      return badRequest("evidenceId route parameter is required.");
    }

    const evidence = await getEvidenceByEvidenceId(evidenceId);

    if (!evidence) {
      return notFound();
    }

    const blob = await downloadEvidenceBlob({
      blobName: evidence.blobName,
      contentType: evidence.contentType,
    });

    return {
      status: 200,
      body: blob.content,
      headers: {
        "Content-Type": blob.contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          evidence.originalFileName
        )}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Evidence blob was not found.") {
        return notFound();
      }

      context.error("Failed to load evidence.", {
        correlationId,
        errorName: err.name,
        errorMessage: err.message,
      });
    } else {
      context.error("Failed to load evidence with non-error value.", {
        correlationId,
      });
    }

    return serverError(correlationId);
  }
}

app.http("GetIncidentEvidenceContent", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "internal/evidence/{evidenceId}/content",
  handler: getIncidentEvidenceContent,
});