import crypto from "crypto";
import type {
  AdminIncidentListResponse,
  CreateIncidentRequest,
  CreateIncidentResponse,
  Incident,
  IncidentQueryParams,
  TrackIncidentResponse,
  UpdateIncidentRequest,
  UpdateIncidentResponse,
} from "../models/Incident";

import type {
  AddIncidentCommentResponse,
  IncidentComment,
} from "../models/IncidentComment";

import type {
  AdminIncidentEvidenceListResponse,
  IncidentEvidence,
  UploadEvidenceResponse,
} from "../models/IncidentEvidence";

import { getSqlPool, sql } from "./sqlClient";

function generatePublicId(sequence: number): string {
  return `INC-2026-${("000000" + sequence).slice(-6)}`;
}

function hashTrackingToken(trackingToken: string): string {
  return crypto.createHash("sha256").update(trackingToken).digest("hex");
}

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date(String(value)).toISOString();
}

function mapIncident(row: any): Incident {
  return {
    incidentId: row.IncidentId,
    publicId: row.PublicId,
    trackingTokenHash: row.TrackingTokenHash,
    title: row.Title,
    description: row.Description,
    reportTypeCode: row.ReportTypeCode,
    categoryCode: row.CategoryCode,
    severityCode: row.SeverityCode,
    statusCode: row.StatusCode,
    submitterName: row.SubmitterName,
    submitterEmail: row.SubmitterEmail,
    isAnonymous: row.IsAnonymous,
    assignedReviewerId: row.AssignedReviewerId,
    assignedReviewerDisplayName: row.AssignedReviewerDisplayName,
    submittedUtc: toIso(row.SubmittedUtc),
    createdUtc: toIso(row.CreatedUtc),
    updatedUtc: toIso(row.UpdatedUtc),
    lastStatusChangedUtc: toIso(row.LastStatusChangedUtc),
  };
}

function mapIncidentComment(row: any): IncidentComment {
  return {
    commentId: row.CommentId,
    incidentId: row.IncidentId,
    commentText: row.CommentText,
    isInternal: row.IsInternal,
    createdById: row.CreatedById,
    createdByDisplayName: row.CreatedByDisplayName,
    createdUtc: toIso(row.CreatedUtc),
  };
}

/* ========================= CREATE ========================= */

export async function createIncident(
  input: CreateIncidentRequest
): Promise<CreateIncidentResponse> {
  const pool = await getSqlPool();

  const incidentId = crypto.randomUUID();
  const trackingToken = crypto.randomUUID().replace(/-/g, "");
  const trackingTokenHash = hashTrackingToken(trackingToken);
  const now = new Date();

  const sequenceResult = await pool
    .request()
    .query("SELECT NEXT VALUE FOR dbo.IncidentNumberSequence AS IncidentNumber");

  const incidentNumber = sequenceResult.recordset[0].IncidentNumber as number;
  const publicId = generatePublicId(incidentNumber);

  await pool
    .request()
    .input("IncidentId", sql.UniqueIdentifier, incidentId)
    .input("IncidentNumber", sql.Int, incidentNumber)
    .input("PublicId", sql.NVarChar(50), publicId)
    .input("TrackingTokenHash", sql.NVarChar(128), trackingTokenHash)
    .input("Title", sql.NVarChar(200), input.title.trim())
    .input("Description", sql.NVarChar(4000), input.description.trim())
    .input("ReportTypeCode", sql.NVarChar(50), input.reportTypeCode)
    .input("CategoryCode", sql.NVarChar(50), input.categoryCode ?? null)
    .input("SeverityCode", sql.NVarChar(50), input.severityCode)
    .input("StatusCode", sql.NVarChar(50), "submitted")
    .input("SubmitterName", sql.NVarChar(200), input.submitterName?.trim() ?? null)
    .input("SubmitterEmail", sql.NVarChar(320), input.submitterEmail?.trim() ?? null)
    .input("IsAnonymous", sql.Bit, input.isAnonymous)
    .input("AssignedReviewerId", sql.NVarChar(100), null)
    .input("AssignedReviewerDisplayName", sql.NVarChar(200), null)
    .input("SubmittedUtc", sql.DateTime, now)
    .input("CreatedUtc", sql.DateTime, now)
    .input("UpdatedUtc", sql.DateTime, now)
    .input("LastStatusChangedUtc", sql.DateTime, now)
    .query(`
      INSERT INTO dbo.Incident (
        IncidentId,
        IncidentNumber,
        PublicId,
        TrackingTokenHash,
        Title,
        Description,
        ReportTypeCode,
        CategoryCode,
        SeverityCode,
        StatusCode,
        SubmitterName,
        SubmitterEmail,
        IsAnonymous,
        AssignedReviewerId,
        AssignedReviewerDisplayName,
        SubmittedUtc,
        CreatedUtc,
        UpdatedUtc,
        LastStatusChangedUtc
      )
      VALUES (
        @IncidentId,
        @IncidentNumber,
        @PublicId,
        @TrackingTokenHash,
        @Title,
        @Description,
        @ReportTypeCode,
        @CategoryCode,
        @SeverityCode,
        @StatusCode,
        @SubmitterName,
        @SubmitterEmail,
        @IsAnonymous,
        @AssignedReviewerId,
        @AssignedReviewerDisplayName,
        @SubmittedUtc,
        @CreatedUtc,
        @UpdatedUtc,
        @LastStatusChangedUtc
      )
    `);

  return {
    incidentId,
    publicId,
    trackingToken,
    submittedUtc: now.toISOString(),
    message:
      "Incident submitted successfully. Save your tracking token now; it will not be shown again.",
  };
}

/* ========================= TRACK ========================= */

export async function trackIncident(
  publicId: string,
  trackingToken: string
): Promise<TrackIncidentResponse | null> {
  const pool = await getSqlPool();
  const trackingTokenHash = hashTrackingToken(trackingToken);

  const result = await pool
    .request()
    .input("PublicId", sql.NVarChar(50), publicId)
    .input("TrackingTokenHash", sql.NVarChar(128), trackingTokenHash)
    .query(`
      SELECT TOP 1
        PublicId,
        StatusCode,
        SeverityCode,
        CategoryCode,
        SubmittedUtc,
        UpdatedUtc
      FROM dbo.Incident
      WHERE PublicId = @PublicId
        AND TrackingTokenHash = @TrackingTokenHash
    `);

  const row = result.recordset[0];

  if (!row) {
    return null;
  }

  return {
    publicId: row.PublicId,
    statusCode: row.StatusCode,
    severityCode: row.SeverityCode,
    categoryCode: row.CategoryCode,
    submittedUtc: toIso(row.SubmittedUtc),
    lastUpdatedUtc: toIso(row.UpdatedUtc),
  };
}

/* ========================= LIST ========================= */

export async function listIncidents(
  query: IncidentQueryParams
): Promise<AdminIncidentListResponse> {
  const pool = await getSqlPool();

  const filters: string[] = [];
  const request = pool.request();

  if (query.statusCode) {
    filters.push("StatusCode = @StatusCode");
    request.input("StatusCode", sql.NVarChar(50), query.statusCode);
  }

  if (query.severityCode) {
    filters.push("SeverityCode = @SeverityCode");
    request.input("SeverityCode", sql.NVarChar(50), query.severityCode);
  }

  if (query.categoryCode) {
    filters.push("CategoryCode = @CategoryCode");
    request.input("CategoryCode", sql.NVarChar(50), query.categoryCode);
  }

  if (query.reportTypeCode) {
    filters.push("ReportTypeCode = @ReportTypeCode");
    request.input("ReportTypeCode", sql.NVarChar(50), query.reportTypeCode);
  }

  if (query.search && query.search.trim().length > 0) {
    filters.push("(Title LIKE @Search OR Description LIKE @Search OR PublicId LIKE @Search)");
    request.input("Search", sql.NVarChar(300), `%${query.search.trim()}%`);
  }

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const itemsResult = await request
    .input("Offset", sql.Int, offset)
    .input("PageSize", sql.Int, pageSize)
    .query(`
      SELECT
        IncidentId,
        PublicId,
        Title,
        ReportTypeCode,
        CategoryCode,
        SeverityCode,
        StatusCode,
        SubmittedUtc,
        AssignedReviewerDisplayName
      FROM dbo.Incident
      ${whereClause}
      ORDER BY SubmittedUtc DESC
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
    `);

  const countRequest = pool.request();

  if (query.statusCode) {
    countRequest.input("StatusCode", sql.NVarChar(50), query.statusCode);
  }
  if (query.severityCode) {
    countRequest.input("SeverityCode", sql.NVarChar(50), query.severityCode);
  }
  if (query.categoryCode) {
    countRequest.input("CategoryCode", sql.NVarChar(50), query.categoryCode);
  }
  if (query.reportTypeCode) {
    countRequest.input("ReportTypeCode", sql.NVarChar(50), query.reportTypeCode);
  }
  if (query.search && query.search.trim().length > 0) {
    countRequest.input("Search", sql.NVarChar(300), `%${query.search.trim()}%`);
  }

  const countResult = await countRequest.query(`
    SELECT COUNT(*) AS TotalCount
    FROM dbo.Incident
    ${whereClause}
  `);

  return {
    items: itemsResult.recordset.map((row: any) => ({
      incidentId: row.IncidentId,
      publicId: row.PublicId,
      title: row.Title,
      reportTypeCode: row.ReportTypeCode,
      categoryCode: row.CategoryCode,
      severityCode: row.SeverityCode,
      statusCode: row.StatusCode,
      submittedUtc: toIso(row.SubmittedUtc),
      assignedReviewerDisplayName: row.AssignedReviewerDisplayName,
    })),
    page,
    pageSize,
    totalCount: countResult.recordset[0].TotalCount,
  };
}

/* ========================= GET ========================= */

export async function getIncidentById(
  incidentId: string
): Promise<Incident | null> {
  const pool = await getSqlPool();

  const result = await pool
    .request()
    .input("IncidentId", sql.UniqueIdentifier, incidentId)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Incident
      WHERE IncidentId = @IncidentId
    `);

  const row = result.recordset[0];
  return row ? mapIncident(row) : null;
}

/* ========================= UPDATE ========================= */

export async function updateIncident(
  incidentId: string,
  input: UpdateIncidentRequest
): Promise<UpdateIncidentResponse | null> {
  const pool = await getSqlPool();

  const current = await getIncidentById(incidentId);
  if (!current) {
    return null;
  }

  const now = new Date();

  const statusCode = input.statusCode ?? current.statusCode;
  const severityCode = input.severityCode ?? current.severityCode;
  const categoryCode =
    input.categoryCode !== undefined ? input.categoryCode : current.categoryCode;
  const assignedReviewerId =
    input.assignedReviewerId !== undefined
      ? input.assignedReviewerId
      : current.assignedReviewerId;
  const assignedReviewerDisplayName =
    input.assignedReviewerDisplayName !== undefined
      ? input.assignedReviewerDisplayName
      : current.assignedReviewerDisplayName;

  const lastStatusChangedUtc =
    input.statusCode !== undefined && input.statusCode !== current.statusCode
      ? now
      : new Date(current.lastStatusChangedUtc);

  await pool
    .request()
    .input("IncidentId", sql.UniqueIdentifier, incidentId)
    .input("StatusCode", sql.NVarChar(50), statusCode)
    .input("SeverityCode", sql.NVarChar(50), severityCode)
    .input("CategoryCode", sql.NVarChar(50), categoryCode ?? null)
    .input("AssignedReviewerId", sql.NVarChar(100), assignedReviewerId ?? null)
    .input(
      "AssignedReviewerDisplayName",
      sql.NVarChar(200),
      assignedReviewerDisplayName ?? null
    )
    .input("UpdatedUtc", sql.DateTime, now)
    .input("LastStatusChangedUtc", sql.DateTime, lastStatusChangedUtc)
    .query(`
      UPDATE dbo.Incident
      SET
        StatusCode = @StatusCode,
        SeverityCode = @SeverityCode,
        CategoryCode = @CategoryCode,
        AssignedReviewerId = @AssignedReviewerId,
        AssignedReviewerDisplayName = @AssignedReviewerDisplayName,
        UpdatedUtc = @UpdatedUtc,
        LastStatusChangedUtc = @LastStatusChangedUtc
      WHERE IncidentId = @IncidentId
    `);

  return {
    incidentId,
    statusCode,
    severityCode,
    categoryCode: categoryCode ?? null,
    assignedReviewerId: assignedReviewerId ?? null,
    assignedReviewerDisplayName: assignedReviewerDisplayName ?? null,
    updatedUtc: now.toISOString(),
  };
}

/* ========================= COMMENT ========================= */

export async function addIncidentComment(
  incidentId: string,
  commentText: string,
  createdById: string,
  createdByDisplayName: string
): Promise<AddIncidentCommentResponse | null> {
  const pool = await getSqlPool();

  const incident = await getIncidentById(incidentId);
  if (!incident) {
    return null;
  }

  const commentId = crypto.randomUUID();
  const now = new Date();

  await pool
    .request()
    .input("CommentId", sql.UniqueIdentifier, commentId)
    .input("IncidentId", sql.UniqueIdentifier, incidentId)
    .input("CommentText", sql.NVarChar(2000), commentText)
    .input("IsInternal", sql.Bit, true)
    .input("CreatedById", sql.NVarChar(100), createdById)
    .input("CreatedByDisplayName", sql.NVarChar(200), createdByDisplayName)
    .input("CreatedUtc", sql.DateTime, now)
    .query(`
      INSERT INTO dbo.IncidentComment (
        CommentId,
        IncidentId,
        CommentText,
        IsInternal,
        CreatedById,
        CreatedByDisplayName,
        CreatedUtc
      )
      VALUES (
        @CommentId,
        @IncidentId,
        @CommentText,
        @IsInternal,
        @CreatedById,
        @CreatedByDisplayName,
        @CreatedUtc
      )
    `);

  return {
    commentId,
    incidentId,
    commentText,
    isInternal: true,
    createdUtc: now.toISOString(),
  };
}
export async function listIncidentComments(
  incidentId: string
): Promise<{ items: IncidentComment[] }> {
  const pool = await getSqlPool();

  const incident = await getIncidentById(incidentId);
  if (!incident) {
    return { items: [] };
  }

  const result = await pool
    .request()
    .input("IncidentId", sql.UniqueIdentifier, incidentId)
    .query(`
      SELECT
        CommentId,
        IncidentId,
        CommentText,
        IsInternal,
        CreatedById,
        CreatedByDisplayName,
        CreatedUtc
      FROM dbo.IncidentComment
      WHERE IncidentId = @IncidentId
      ORDER BY CreatedUtc DESC
    `);

  return {
    items: result.recordset.map(mapIncidentComment),
  };
}


/* ========================= EVIDENCE STUBS ========================= */

export async function uploadEvidence(
  publicId: string
): Promise<UploadEvidenceResponse | null> {
  const pool = await getSqlPool();

  const result = await pool
    .request()
    .input("PublicId", sql.NVarChar(50), publicId)
    .query(`
      SELECT TOP 1 IncidentId, PublicId
      FROM dbo.Incident
      WHERE PublicId = @PublicId
    `);

  const row = result.recordset[0];
  if (!row) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    evidenceId: crypto.randomUUID(),
    publicId: row.PublicId,
    originalFileName: "placeholder-evidence.png",
    contentType: "image/png",
    fileSizeBytes: 0,
    uploadedUtc: now,
  };
}

export async function getEvidenceByIncidentId(
  incidentId: string
): Promise<AdminIncidentEvidenceListResponse> {
  const items: IncidentEvidence[] = [];
  return { items };
}