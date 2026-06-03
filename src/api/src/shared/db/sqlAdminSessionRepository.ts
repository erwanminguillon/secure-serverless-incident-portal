import crypto from "crypto";

import type {
  AdminSession,
  AdminSessionIdentity,
  CreateAdminSessionInput,
} from "../models/AdminSession";

import { getSqlPool, sql } from "./sqlClient";

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date(String(value)).toISOString();
}

function mapAdminSession(row: any): AdminSession {
  return {
    sessionId: row.SessionId,
    sessionTokenHash: row.SessionTokenHash,
    principalId: row.PrincipalId,
    principalName: row.PrincipalName,
    identityProvider: row.IdentityProvider,
    createdUtc: toIso(row.CreatedUtc),
    expiresUtc: toIso(row.ExpiresUtc),
    revokedUtc: row.RevokedUtc ? toIso(row.RevokedUtc) : null,
    lastSeenUtc: row.LastSeenUtc ? toIso(row.LastSeenUtc) : null,
  };
}

export function generateAdminSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashAdminSessionToken(sessionToken: string): string {
  return crypto.createHash("sha256").update(sessionToken).digest("hex");
}

export async function createAdminSession(
  input: CreateAdminSessionInput
): Promise<AdminSessionIdentity> {
  const pool = await getSqlPool();

  const sessionId = crypto.randomUUID();
  const now = new Date();

  await pool
    .request()
    .input("SessionId", sql.UniqueIdentifier, sessionId)
    .input("SessionTokenHash", sql.NVarChar(128), input.sessionTokenHash)
    .input("PrincipalId", sql.NVarChar(100), input.principalId)
    .input("PrincipalName", sql.NVarChar(200), input.principalName)
    .input("IdentityProvider", sql.NVarChar(100), input.identityProvider)
    .input("CreatedUtc", sql.DateTime2, now)
    .input("ExpiresUtc", sql.DateTime2, input.expiresUtc)
    .input("RevokedUtc", sql.DateTime2, null)
    .input("LastSeenUtc", sql.DateTime2, now)
    .query(`
      INSERT INTO dbo.AdminSession (
        SessionId,
        SessionTokenHash,
        PrincipalId,
        PrincipalName,
        IdentityProvider,
        CreatedUtc,
        ExpiresUtc,
        RevokedUtc,
        LastSeenUtc
      )
      VALUES (
        @SessionId,
        @SessionTokenHash,
        @PrincipalId,
        @PrincipalName,
        @IdentityProvider,
        @CreatedUtc,
        @ExpiresUtc,
        @RevokedUtc,
        @LastSeenUtc
      )
    `);

  return {
    sessionId,
    principalId: input.principalId,
    principalName: input.principalName,
    identityProvider: input.identityProvider,
    expiresUtc: input.expiresUtc.toISOString(),
  };
}

export async function getValidAdminSessionByTokenHash(
  sessionTokenHash: string
): Promise<AdminSessionIdentity | null> {
  const pool = await getSqlPool();
  const now = new Date();

  const result = await pool
    .request()
    .input("SessionTokenHash", sql.NVarChar(128), sessionTokenHash)
    .input("NowUtc", sql.DateTime2, now)
    .query(`
      SELECT TOP 1
        SessionId,
        SessionTokenHash,
        PrincipalId,
        PrincipalName,
        IdentityProvider,
        CreatedUtc,
        ExpiresUtc,
        RevokedUtc,
        LastSeenUtc
      FROM dbo.AdminSession
      WHERE SessionTokenHash = @SessionTokenHash
        AND RevokedUtc IS NULL
        AND ExpiresUtc > @NowUtc
    `);

  const row = result.recordset[0];

  if (!row) {
    return null;
  }

  const session = mapAdminSession(row);

  await pool
    .request()
    .input("SessionId", sql.UniqueIdentifier, session.sessionId)
    .input("LastSeenUtc", sql.DateTime2, now)
    .query(`
      UPDATE dbo.AdminSession
      SET LastSeenUtc = @LastSeenUtc
      WHERE SessionId = @SessionId
    `);

  return {
    sessionId: session.sessionId,
    principalId: session.principalId,
    principalName: session.principalName,
    identityProvider: session.identityProvider,
    expiresUtc: session.expiresUtc,
  };
}

export async function revokeAdminSessionByTokenHash(
  sessionTokenHash: string
): Promise<void> {
  const pool = await getSqlPool();
  const now = new Date();

  await pool
    .request()
    .input("SessionTokenHash", sql.NVarChar(128), sessionTokenHash)
    .input("RevokedUtc", sql.DateTime2, now)
    .query(`
      UPDATE dbo.AdminSession
      SET RevokedUtc = @RevokedUtc
      WHERE SessionTokenHash = @SessionTokenHash
        AND RevokedUtc IS NULL
    `);
}

export async function deleteExpiredAdminSessions(): Promise<number> {
  const pool = await getSqlPool();
  const now = new Date();

  const result = await pool
    .request()
    .input("NowUtc", sql.DateTime2, now)
    .query(`
      DELETE FROM dbo.AdminSession
      WHERE ExpiresUtc <= @NowUtc
         OR RevokedUtc IS NOT NULL
    `);

  return result.rowsAffected[0] ?? 0;
}