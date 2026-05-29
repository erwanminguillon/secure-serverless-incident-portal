const ADMIN_KEY_STORAGE_KEY = "ssip.adminKey";
const ADMIN_NAME_STORAGE_KEY = "ssip.adminName";

export function setAdminSession(adminKey: string, adminName: string): void {
  sessionStorage.setItem(ADMIN_KEY_STORAGE_KEY, adminKey);
  sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, adminName || "Admin");
}

export function getAdminKey(): string | null {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE_KEY);
}

export function getAdminName(): string {
  return sessionStorage.getItem(ADMIN_NAME_STORAGE_KEY) || "Admin";
}

export function isAdminAuthenticated(): boolean {
  const adminKey = getAdminKey();
  return !!adminKey && adminKey.trim().length > 0;
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_NAME_STORAGE_KEY);
}