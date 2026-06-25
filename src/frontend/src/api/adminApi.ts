const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";

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

async function adminApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
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

async function adminBlobRequest(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  if (!response.ok) {
    const body = await readJsonSafely(response);
    const apiErrorBody = body as ApiErrorBody;

    const message =
      apiErrorBody?.error?.message ||
      `Request failed with status ${response.status}.`;

    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.apiError = apiErrorBody?.error;

    throw error;
  }

  return response.blob();
}

/* ========================= AUTH ========================= */

export type AdminLoginResponse = {
  principalId: string;
  principalName: string;
  identityProvider: string;
  expiresUtc?: string;
};

export type AdminMeResponse = {
  principalId: string;
  principalName: string;
  identityProvider: string;
  sessionId?: string;
  expiresUtc?: string;
};

export async function adminLogin(
  adminKey: string,
  adminName: string
): Promise<AdminLoginResponse> {
  return adminApiRequest<AdminLoginResponse>("/internal/auth/login", {
    method: "POST",
    body: JSON.stringify({
      adminKey,
      adminName,
    }),
  });
}

export async function adminLogout(): Promise<void> {
  await adminApiRequest<void>("/internal/auth/logout", {
    method: "POST",
  });
}

export async function getAdminMe(): Promise<AdminMeResponse> {
  return adminApiRequest<AdminMeResponse>("/internal/auth/me", {
    method: "GET",
  });
}

/* ========================= INCIDENTS ========================= */

export type IncidentListItem = {
  incidentId: string;
  publicId: string;
  title: string;
  reportTypeCode: string;
  categoryCode: string | null;
  severityCode: string;
  statusCode: string;
  submittedUtc: string;
  assignedReviewerDisplayName: string | null;
};

export type AdminIncidentListResponse = {
  items: IncidentListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type IncidentDetail = {
  incidentId: string;
  publicId: string;
  trackingTokenHash: string;
  title: string;
  description: string;
  reportTypeCode: string;
  categoryCode: string | null;
  severityCode: string;
  statusCode: string;
  submitterName: string | null;
  submitterEmail: string | null;
  isAnonymous: boolean;
  assignedReviewerId: string | null;
  assignedReviewerDisplayName: string | null;
  submittedUtc: string;
  createdUtc: string;
  updatedUtc: string;
  lastStatusChangedUtc: string;
};

export type UpdateIncidentRequest = {
  statusCode?: string;
  severityCode?: string;
  categoryCode?: string | null;
  assignedReviewerId?: string | null;
  assignedReviewerDisplayName?: string | null;
};

export type UpdateIncidentResponse = {
  incidentId: string;
  statusCode: string;
  severityCode: string;
  categoryCode: string | null;
  assignedReviewerId: string | null;
  assignedReviewerDisplayName: string | null;
  updatedUtc: string;
};

export async function listIncidents(): Promise<AdminIncidentListResponse> {
  return adminApiRequest<AdminIncidentListResponse>("/internal/incidents", {
    method: "GET",
  });
}

export async function getIncidentById(
  incidentId: string
): Promise<IncidentDetail> {
  return adminApiRequest<IncidentDetail>(
    `/internal/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "GET",
    }
  );
}

export async function updateIncident(
  incidentId: string,
  input: UpdateIncidentRequest
): Promise<UpdateIncidentResponse> {
  return adminApiRequest<UpdateIncidentResponse>(
    `/internal/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

/* ========================= COMMENTS ========================= */

export type IncidentComment = {
  commentId: string;
  incidentId: string;
  commentText: string;
  isInternal: boolean;
  createdById: string | null;
  createdByDisplayName: string | null;
  createdUtc: string;
};

export type AddIncidentCommentResponse = {
  commentId: string;
  incidentId: string;
  commentText: string;
  isInternal: boolean;
  createdUtc: string;
};

export type IncidentCommentListResponse = {
  items: IncidentComment[];
};

export async function addIncidentComment(
  incidentId: string,
  commentText: string
): Promise<AddIncidentCommentResponse> {
  return adminApiRequest<AddIncidentCommentResponse>(
    `/internal/incidents/${encodeURIComponent(incidentId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify({
        commentText,
      }),
    }
  );
}

export async function listIncidentComments(
  incidentId: string
): Promise<IncidentCommentListResponse> {
  return adminApiRequest<IncidentCommentListResponse>(
    `/internal/incidents/${encodeURIComponent(incidentId)}/comments`,
    {
      method: "GET",
    }
  );
}


/* ========================= EVIDENCE ========================= */

export type IncidentEvidence = {
  evidenceId: string;
  incidentId: string;
  originalFileName: string;
  blobName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  uploadedByType: "public-reporter" | "admin";
  uploadedUtc: string;
};

export type AdminIncidentEvidenceListResponse = {
  items: IncidentEvidence[];
};

export async function listIncidentEvidence(
  incidentId: string
): Promise<AdminIncidentEvidenceListResponse> {
  return adminApiRequest<AdminIncidentEvidenceListResponse>(
    `/internal/incidents/${encodeURIComponent(incidentId)}/evidence`,
    {
      method: "GET",
    }
  );
}

export async function getIncidentEvidenceContent(
  evidenceId: string
): Promise<Blob> {
  return adminBlobRequest(
    `/internal/evidence/${encodeURIComponent(evidenceId)}/content`,
    {
      method: "GET",
    }
  );
}

/* ========================= REFERENCE DATA ========================= */

export type ReferenceDataItem = {
  code: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
};

export type ReferenceData = {
  statuses: ReferenceDataItem[];
  severities: ReferenceDataItem[];
  categories: ReferenceDataItem[];
  reportTypes: ReferenceDataItem[];
};

export async function getReferenceData(): Promise<ReferenceData> {
  return adminApiRequest<ReferenceData>("/internal/reference-data", {
    method: "GET",
  });
}