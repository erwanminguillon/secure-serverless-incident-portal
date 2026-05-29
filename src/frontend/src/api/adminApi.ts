import { getAdminKey, getAdminName } from "../features/admin/adminSession";

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

export interface IncidentComment {
  commentId?: string;
  incidentId?: string;
  commentText: string;
  createdById?: string;
  createdByDisplayName?: string;
  createdUtc?: string;
}

export interface IncidentCommentListResponse {
  items: IncidentComment[];
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
      headers: getAdminHeaders(),
    }
  );

  return parseApiResponse<IncidentCommentListResponse>(response);
}

function getAdminHeaders(): HeadersInit {
  const adminKey = getAdminKey();

  return {
    "Content-Type": "application/json",
    "x-admin-key": adminKey ?? "",
    "x-admin-name": getAdminName(),
  };
}

async function fetchAdmin(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(
      `Network request failed. Check API URL, CORS, or connectivity. API base URL: ${API_BASE_URL}`
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

export async function listIncidents(): Promise<IncidentListResponse> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/incidents`, {
    method: "GET",
    headers: getAdminHeaders(),
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
      headers: getAdminHeaders(),
    }
  );

  return parseApiResponse<IncidentDetail>(response);
}

export async function getReferenceData(): Promise<ReferenceData> {
  const response = await fetchAdmin(`${API_BASE_URL}/internal/reference-data`, {
    method: "GET",
    headers: getAdminHeaders(),
  });

  return parseApiResponse<ReferenceData>(response);
}

export async function updateIncident(
  incidentId: string,
  payload: UpdateIncidentRequest
): Promise<IncidentDetail> {
  const response = await fetchAdmin(
    `${API_BASE_URL}/internal/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "PATCH",
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseApiResponse<IncidentDetail>(response);
}

export async function addIncidentComment(
  incidentId: string,
  commentText: string
): Promise<IncidentComment> {
  const response = await fetchAdmin(
    `${API_BASE_URL}/internal/incidents/${encodeURIComponent(
      incidentId
    )}/comments`,
    {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ commentText }),
    }
  );

  return parseApiResponse<IncidentComment>(response);
}