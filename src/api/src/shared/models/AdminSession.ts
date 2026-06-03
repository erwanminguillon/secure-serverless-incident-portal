export interface AdminSession {
  sessionId: string;
  sessionTokenHash: string;
  principalId: string;
  principalName: string;
  identityProvider: string;
  createdUtc: string;
  expiresUtc: string;
  revokedUtc: string | null;
  lastSeenUtc: string | null;
}

export interface CreateAdminSessionInput {
  sessionTokenHash: string;
  principalId: string;
  principalName: string;
  identityProvider: string;
  expiresUtc: Date;
}

export interface AdminSessionIdentity {
  sessionId: string;
  principalId: string;
  principalName: string;
  identityProvider: string;
  expiresUtc: string;
}