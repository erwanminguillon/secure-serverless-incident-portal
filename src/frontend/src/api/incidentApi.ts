import type {
  CategoryCode,
  ReportTypeCode,
  SeverityCode,
} from "../types/reference-data";

import type {
  TrackIncidentResponse as DomainTrackIncidentResponse,
} from "../types/incident";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";

const MAX_EVIDENCE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_EVIDENCE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    correlationId?: string;
  };
};

export type ApiError = Error & {
  status?: number;
  apiError?: {
    code?: string;
    message?: string;
    correlationId?: string;
  };
};

async function readJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function publicApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await readJsonSafely(response);

  if (!response.ok) {
    const apiErrorBody = body as ApiErrorBody;

    const message =
      apiErrorBody?.error?.message ||
      `Request failed with status ${response.status}.`;

    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.apiError = apiErrorBody?.error;

    throw error;
  }

  return body as T;
}

/* ========================= INCIDENT SUBMISSION ========================= */

export type SubmitIncidentRequest = {
  title: string;
  description: string;
  reportTypeCode: ReportTypeCode;
  categoryCode?: CategoryCode;
  severityCode: SeverityCode;
  submitterName?: string;
  submitterEmail?: string;
  isAnonymous: boolean;
};

export type SubmitIncidentResponse = {
  incidentId: string;
  publicId: string;
  trackingToken: string;
  submittedUtc: string;
  message: string;
};

export async function submitIncident(
  input: SubmitIncidentRequest
): Promise<SubmitIncidentResponse> {
  return publicApiRequest<SubmitIncidentResponse>("/public/incidents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ========================= INCIDENT TRACKING ========================= */

export type TrackIncidentRequest = {
  publicId: string;
  trackingToken: string;
};

export type TrackIncidentResponse = DomainTrackIncidentResponse;

export async function trackIncident(
  input: TrackIncidentRequest
): Promise<TrackIncidentResponse> {
  return publicApiRequest<TrackIncidentResponse>("/public/incidents/track", {
    method: "POST",
    body: JSON.stringify({
      publicId: input.publicId,
      trackingToken: input.trackingToken,
    }),
  });
}

/* ========================= EVIDENCE UPLOAD ========================= */

export type UploadEvidenceResponse = {
  evidenceId: string;
  publicId: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedUtc: string;
};

function validateEvidenceFileBeforeUpload(file: File): void {
  if (!ALLOWED_EVIDENCE_CONTENT_TYPES.has(file.type)) {
    throw new Error("Only PNG, JPG, JPEG, and WEBP screenshots are allowed.");
  }

  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    throw new Error("The selected file is too large. Maximum size is 5 MB.");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read the selected file."));
    };

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Could not convert the selected file to base64."));
        return;
      }

      const commaIndex = result.indexOf(",");

      if (commaIndex === -1) {
        reject(new Error("Invalid file encoding result."));
        return;
      }

      resolve(result.slice(commaIndex + 1));
    };

    reader.readAsDataURL(file);
  });
}

export async function uploadEvidence(input: {
  publicId: string;
  trackingToken: string;
  file: File;
}): Promise<UploadEvidenceResponse> {
  const publicId = input.publicId.trim();
  const trackingToken = input.trackingToken.trim();

  if (!publicId) {
    throw new Error("publicId is required before uploading evidence.");
  }

  if (!trackingToken) {
    throw new Error("trackingToken is required before uploading evidence.");
  }

  validateEvidenceFileBeforeUpload(input.file);

  const fileBase64 = await fileToBase64(input.file);

  return publicApiRequest<UploadEvidenceResponse>("/incidents/evidence", {
    method: "POST",
    body: JSON.stringify({
      publicId,
      trackingToken,
      fileName: input.file.name,
      contentType: input.file.type,
      fileBase64,
    }),
  });
}