import { buildApiUrl } from "./config";
import type {
  CreateIncidentRequest,
  CreateIncidentResponse,
  TrackIncidentRequest,
  TrackIncidentResponse,
} from "../types/incident";
import type { ApiErrorResponse } from "../types/api";

function getApiErrorMessage(errorBody: ApiErrorResponse): string {
  const error = errorBody.error;

  if (!error) {
    return "The API returned an error.";
  }

  const details =
    error.details && error.details.length > 0
      ? ` ${error.details.map((detail) => detail.message).join(" ")}`
      : "";

  const correlationId = error.correlationId
    ? ` Correlation ID: ${error.correlationId}`
    : "";

  return `${error.message}${details}${correlationId}`;
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const errorBody = (await response.json()) as ApiErrorResponse;
      throw new Error(getApiErrorMessage(errorBody));
    }

    throw new Error(`Request failed with HTTP ${response.status}.`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("Expected JSON response from the API.");
  }

  return (await response.json()) as T;
}

async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(
      "Network request failed. Check connectivity, CORS configuration, or API base URL."
    );
  }
}

export async function submitIncident(
  payload: CreateIncidentRequest
): Promise<CreateIncidentResponse> {
  const response = await fetchJson(buildApiUrl("/public/incidents"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<CreateIncidentResponse>(response);
}

export async function trackIncident(
  payload: TrackIncidentRequest
): Promise<TrackIncidentResponse> {
  const response = await fetchJson(buildApiUrl("/public/incidents/track"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<TrackIncidentResponse>(response);
}