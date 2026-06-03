const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is not configured.");
}

const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");

export interface AdminApiError {
  code: string;
  message: string;
  correlationId?: string;
  details?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface AdminIdentityResponse {
  principalId: string;
  principalName: string;
  identityProvider: string;
  sessionId?: string | null;
  expiresUtc?: string | null;
}

export interface AdminLoginResponse {
  principalId: string;
  principalName: string;
  identityProvider: string;
  expiresUtc: string;
}

export interface IncidentListItem {
  incidentId: string;
  publicId: string;
  title: string;
  reportTypeCode: string;
  categoryCode: string | null;
  severityCode: string;
  statusCode: string;
  submittedUtc: string;
  assignedReviewerDisplayName: string | null;
}

export interface IncidentListResponse {
  items: IncidentListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface IncidentDetail {
  incidentId: string;
  publicId: string;
  trackingTokenHash?: string;
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
}

export interface ReferenceItem {
  code: string;
  displayName: string;
  sortOrder: number;
  isTerminal?: boolean;
}

export interface ReferenceData {
  statuses: ReferenceItem[];
  severities: ReferenceItem[];
  reportTypes: ReferenceItem[];
  categories: ReferenceItem[];
}

export interface UpdateIncidentRequest {
  statusCode?: string;
  severityCode?: string;
  categoryCode?: string | null;
  assignedReviewerId?: string | null;
  assignedReviewerDisplayName?: string | null;
}

export interface UpdateIncidentResponse {
  incidentId: string;
  statusCode: string;
  severityCode: string;
  categoryCode: string | null;
  assignedReviewerId: string | null;
  assignedReviewerDisplayName: string | null;
  updatedUtc: string;
}

export interface IncidentComment {
  commentId: string;
  incidentId: string;
  commentText: string;
  isInternal: boolean;
  createdById: string | null;
  createdByDisplayName: string | null;
  createdUtc: string;
}

export interface IncidentCommentListResponse {
  items: IncidentComment[];
}

export interface AddIncidentCommentResponse {
  commentId: string;
  incidentId: string;
  commentText: string;
  isInternal: boolean;
  createdUtc: string;
}

function getJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

async function fetchAdmin(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      credentials: "include",
    });
  } catch {
    throw new Error(
      `Network request failed. Check API URL, CORS, credentials support, or connectivity. API base URL: ${API_BASE_URL}`
    );
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const correlationId = response.headers.get("x-correlation-id") ?? undefined;
  const contentType = response.headers.get("content-type") ?? "";

  let body: unknown = null;

  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = {
      error: {
        code: "UNEXPECTED_RESPONSE",
        message: text || "The API returned a non-JSON response.",
        correlationId,
      },
    };
  }

  if (!response.ok) {
    const maybeBody = body as {
      error?: AdminApiError;
    };

    const apiError = maybeBody?.error ?? {
      code: "HTTP_ERROR",
      message: `Request failed with status ${response.status}.`,
      correlationId,
    };

    const error = new Error(apiError.message) as Error & {
      status?: number;
      apiError?: AdminApiError;
    };

    error.status = response.status;
    error.apiError = {
      ...apiError,
      correlationId: apiError.correlationId ?? correlationId,
    };

    throw error;
  }

  return body as T;
}

export async function adminLogin(
  adminKey: string,
  adminName: string
): Promise<AdminLoginResponse> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/auth/login`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({
      adminKey,
      adminName,
    }),
  });

  return parseApiResponse<AdminLoginResponse>(response);
}

export async function adminLogout(): Promise<void> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/auth/logout`, {
    method: "POST",
    headers: getJsonHeaders(),
  });

  await parseApiResponse<{ message: string }>(response);
}

export async function getAdminMe(): Promise<AdminIdentityResponse> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/auth/me`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  return parseApiResponse<AdminIdentityResponse>(response);
}

export async function requireAdminSession(): Promise<AdminIdentityResponse> {
  return getAdminMe();
}

export async function listIncidents(): Promise<IncidentListResponse> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/incidents`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  return parseApiResponse<IncidentListResponse>(response);
}

export async function getIncidentById(
  incidentId: string
): Promise<IncidentDetail> {
  const response = await fetchAdmin(
    `${API_BASE_URL}/internal/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    }
  );

  return parseApiResponse<IncidentDetail>(response);
}

export async function getReferenceData(): Promise<ReferenceData> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/reference-data`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  return parseApiResponse<ReferenceData>(response);
}

export async function updateIncident(
  incidentId: string,
  payload: UpdateIncidentRequest
): Promise<UpdateIncidentResponse> {
  const response = await fetchAdmin(
    `${API_BASE_URL}/internal/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "PATCH",
      headers: getJsonHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseApiResponse<UpdateIncidentResponse>(response);
}

export async function addIncidentComment(
  incidentId: string,
  commentText: string
): Promise<AddIncidentCommentResponse> {
  const response = await fetchAdmin(
    `${API_BASE_URL}/internal/incidents/${encodeURIComponent(
      incidentId
    )}/comments`,
    {
      method: "POST",
      headers: getJsonHeaders(),
      body: JSON.stringify({ commentText }),
    }
  );

  return parseApiResponse<AddIncidentCommentResponse>(response);
}

export async function listIncidentComments(
  incidentId: string
): Promise<IncidentCommentListResponse> {
  const response = await fetchAdmin(
    `${API_BASE_URL}/internal/incidents/${encodeURIComponent(
      incidentId
    )}/comments`,
    {
      method: "GET",
      headers: getJsonHeaders(),
    }
  );

  return parseApiResponse<IncidentCommentListResponse>(response);
}