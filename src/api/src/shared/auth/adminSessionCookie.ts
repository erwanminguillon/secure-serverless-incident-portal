import type { HttpRequest } from "@azure/functions";

export const ADMIN_SESSION_COOKIE_NAME = "ssip_admin_session";

export function getCookieValue(
  request: HttpRequest,
  cookieName: string
): string | null {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    if (rawName === cookieName) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

export function getAdminSessionTokenFromRequest(
  request: HttpRequest
): string | null {
  return getCookieValue(request, ADMIN_SESSION_COOKIE_NAME);
}

export function buildAdminSessionCookie(
  sessionToken: string,
  maxAgeSeconds: number
): string {
  return [
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/api/internal",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function buildClearAdminSessionCookie(): string {
  return [
    `${ADMIN_SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/api/internal",
    "Max-Age=0",
  ].join("; ");
}