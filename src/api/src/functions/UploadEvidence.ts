import crypto from "crypto";

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import type {
  UploadEvidenceRequest,
  UploadEvidenceResponse,
} from "../shared/models/IncidentEvidence";

import {
  countEvidenceByIncidentId,
  createIncidentEvidenceMetadata,
  getIncidentByPublicIdAndTrackingToken,
} from "../shared/db/sqlIncidentRepository";

import {
  uploadEvidenceBlob,
  validateEvidenceFile,
} from "../shared/storage/evidenceBlobStorage";

const MAX_EVIDENCE_FILES_PER_INCIDENT = 3;

function jsonResponse(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    jsonBody: body,
  };
}

function badRequest(message: string): HttpResponseInit {
  return jsonResponse(400, {
    error: {
      code: "bad_request",
      message,
    },
  });
}

function forbiddenOrNotFound(): HttpResponseInit {
  return jsonResponse(404, {
    error: {
      code: "incident_not_found",
      message:
        "Incident was not found, or the tracking token does not match this incident.",
    },
  });
}

function conflict(message: string): HttpResponseInit {
  return jsonResponse(409, {
    error: {
      code: "conflict",
      message,
    },
  });
}

function serverError(correlationId: string): HttpResponseInit {
  return jsonResponse(500, {
    error: {
      code: "internal_error",
      message: "Evidence upload failed.",
      correlationId,
    },
  });
}

function isUploadEvidenceRequest(value: unknown): value is UploadEvidenceRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UploadEvidenceRequest>;

  return (
    typeof candidate.publicId === "string" &&
    typeof candidate.trackingToken === "string" &&
    typeof candidate.fileName === "string" &&
    typeof candidate.contentType === "string" &&
    typeof candidate.fileBase64 === "string"
  );
}

function isIncidentClosedForEvidence(statusCode: string): boolean {
  return ["closed", "rejected"].includes(statusCode);
}

export async function uploadEvidence(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = crypto.randomUUID();

  try {
    const body = await request.json();

    if (!isUploadEvidenceRequest(body)) {
      return badRequest(
        "Invalid evidence upload request. publicId, trackingToken, fileName, contentType, and fileBase64 are required."
      );
    }

    const publicId = body.publicId.trim();
    const trackingToken = body.trackingToken.trim();

    if (!publicId) {
      return badRequest("publicId is required.");
    }

    if (!trackingToken) {
      return badRequest("trackingToken is required.");
    }

    const incident = await getIncidentByPublicIdAndTrackingToken(
      publicId,
      trackingToken
    );

    if (!incident) {
      return forbiddenOrNotFound();
    }

    if (isIncidentClosedForEvidence(incident.statusCode)) {
      return conflict(
        "Evidence cannot be uploaded for incidents that are closed or rejected."
      );
    }

    const existingEvidenceCount = await countEvidenceByIncidentId(
      incident.incidentId
    );

    if (existingEvidenceCount >= MAX_EVIDENCE_FILES_PER_INCIDENT) {
      return conflict(
        `This incident already has the maximum number of evidence files (${MAX_EVIDENCE_FILES_PER_INCIDENT}).`
      );
    }

    const validatedFile = validateEvidenceFile({
      fileName: body.fileName,
      contentType: body.contentType,
      fileBase64: body.fileBase64,
    });

    const evidenceId = crypto.randomUUID();
    const uploadedUtc = new Date();

    const uploadedBlob = await uploadEvidenceBlob({
      incidentId: incident.incidentId,
      evidenceId,
      validatedFile,
    });

    const evidence = await createIncidentEvidenceMetadata({
      evidenceId,
      incidentId: incident.incidentId,
      originalFileName: validatedFile.originalFileName,
      blobName: uploadedBlob.blobName,
      contentType: uploadedBlob.contentType,
      fileSizeBytes: uploadedBlob.fileSizeBytes,
      sha256Hash: uploadedBlob.sha256Hash,
      uploadedByType: "public-reporter",
      uploadedUtc,
    });

    const response: UploadEvidenceResponse = {
      evidenceId: evidence.evidenceId,
      publicId: incident.publicId,
      originalFileName: evidence.originalFileName,
      contentType: evidence.contentType,
      fileSizeBytes: evidence.fileSizeBytes,
      uploadedUtc: evidence.uploadedUtc,
    };

    return jsonResponse(201, response);
  } catch (err) {
    if (err instanceof Error) {
      const safeValidationMessages = [
        "Evidence file name is required.",
        "Evidence content type is required.",
        "Unsupported evidence file type. Only PNG, JPG, JPEG, and WEBP images are allowed.",
        "Evidence file content is required.",
        "Evidence file content is not valid base64.",
        "Evidence file is empty.",
        "Evidence file is too large. Maximum size is 5 MB.",
        "JPEG evidence files must use .jpg or .jpeg extension.",
      ];

      if (
        safeValidationMessages.includes(err.message) ||
        err.message.startsWith("Evidence file extension does not match")
      ) {
        return badRequest(err.message);
      }

      context.error("Evidence upload failed.", {
        correlationId,
        errorName: err.name,
        errorMessage: err.message,
      });
    } else {
      context.error("Evidence upload failed with non-error value.", {
        correlationId,
      });
    }

    return serverError(correlationId);
  }
}

app.http("UploadEvidence", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "incidents/evidence",
  handler: uploadEvidence,
});