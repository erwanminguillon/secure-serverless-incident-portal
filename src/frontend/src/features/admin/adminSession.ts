const ADMIN_NAME_STORAGE_KEY = "ssip.adminName";
const ADMIN_AUTHENTICATED_STORAGE_KEY = "ssip.adminAuthenticated";

export function setAdminSession(adminName: string): void {
  sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, adminName || "Admin");
  sessionStorage.setItem(ADMIN_AUTHENTICATED_STORAGE_KEY, "true");
}

export function getAdminName(): string {
  return sessionStorage.getItem(ADMIN_NAME_STORAGE_KEY) || "Admin";
}

export function markAdminUnauthenticated(): void {
  sessionStorage.removeItem(ADMIN_AUTHENTICATED_STORAGE_KEY);
}

export function isAdminAuthenticatedHint(): boolean {
  return sessionStorage.getItem(ADMIN_AUTHENTICATED_STORAGE_KEY) === "true";
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_NAME_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_AUTHENTICATED_STORAGE_KEY);
}