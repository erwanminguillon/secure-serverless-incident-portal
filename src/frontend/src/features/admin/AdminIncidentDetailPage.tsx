import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  addIncidentComment,
  adminLogout,
  getAdminMe,
  getIncidentById,
  getIncidentEvidenceContent,
  getReferenceData,
  listIncidentComments,
  listIncidentEvidence,
  updateIncident,
} from "../../api/adminApi";

import type {
  IncidentComment,
  IncidentDetail,
  IncidentEvidence,
  ReferenceData,
} from "../../api/adminApi";

import { clearAdminSession, setAdminSession } from "./adminSession";

const styles: Record<string, CSSProperties> = {
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "18px",
  },
  eyebrow: {
    margin: 0,
    color: "#0078d4",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 6px",
    color: "#001e3b",
    fontSize: "32px",
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },
  subtitle: {
    margin: 0,
    color: "#53657a",
    fontSize: "14px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(340px, 0.9fr)",
    gap: "18px",
  },
  card: {
    border: "1px solid var(--ssip-border)",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "var(--ssip-shadow)",
    padding: "20px",
  },
  cardTitle: {
    margin: "0 0 14px",
    color: "#001e3b",
    fontSize: "18px",
    fontWeight: 800,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  metaItem: {
    border: "1px solid var(--ssip-border)",
    borderRadius: "10px",
    background: "#f8fbfe",
    padding: "12px",
  },
  metaLabel: {
    margin: "0 0 4px",
    color: "#004578",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  metaValue: {
    margin: 0,
    color: "#001e3b",
    fontSize: "14px",
    fontWeight: 700,
    wordBreak: "break-word",
  },
  description: {
    marginTop: "18px",
    border: "1px solid var(--ssip-border)",
    borderRadius: "10px",
    background: "#f8fbfe",
    padding: "14px",
    color: "#001e3b",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
  },
  formStack: {
    display: "grid",
    gap: "14px",
  },
  field: {
    width: "100%",
    border: "1px solid var(--ssip-border)",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#001e3b",
    padding: "10px 12px",
    fontSize: "14px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    color: "#001e3b",
    fontSize: "13px",
    fontWeight: 800,
  },
  primaryButton: {
    border: "1px solid #0078d4",
    background: "#0078d4",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid var(--ssip-border)",
    background: "#ffffff",
    color: "#004578",
    borderRadius: "8px",
    padding: "10px 13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    textDecoration: "none",
  },
  dangerButton: {
    border: "1px solid #fecaca",
    background: "#ffffff",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "10px 13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  alertError: {
    border: "1px solid #fecaca",
    borderRadius: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    marginBottom: "16px",
  },
  alertSuccess: {
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    background: "#dcfce7",
    color: "#166534",
    padding: "14px",
    marginBottom: "16px",
  },
  info: {
    border: "1px solid #c7e0f4",
    borderRadius: "10px",
    background: "#e5f1fb",
    color: "#004578",
    padding: "14px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  emptyState: {
    border: "1px solid var(--ssip-border)",
    borderRadius: "10px",
    background: "#f8fbfe",
    color: "#53657a",
    padding: "14px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  commentItem: {
    border: "1px solid var(--ssip-border)",
    borderLeft: "4px solid #0078d4",
    borderRadius: "10px",
    background: "#ffffff",
    padding: "14px",
  },
  evidenceItem: {
    border: "1px solid var(--ssip-border)",
    borderLeft: "4px solid #0078d4",
    borderRadius: "10px",
    background: "#ffffff",
    padding: "14px",
  },
  evidencePreview: {
    marginTop: "16px",
    border: "1px solid var(--ssip-border)",
    borderRadius: "12px",
    background: "#f8fbfe",
    padding: "14px",
  },
  evidenceImage: {
    display: "block",
    width: "100%",
    maxHeight: "640px",
    objectFit: "contain",
    border: "1px solid var(--ssip-border)",
    borderRadius: "10px",
    background: "#ffffff",
  },
};

function formatCode(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value.replace(/_/g, " ");
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function shortHash(value: string): string {
  if (!value) {
    return "Unknown";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function badgeStyle(kind: "status" | "severity", value: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "capitalize",
  };

  if (kind === "severity") {
    if (value === "critical") {
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    }

    if (value === "high") {
      return { ...base, background: "#ffedd5", color: "#9a3412" };
    }

    if (value === "medium") {
      return { ...base, background: "#fef3c7", color: "#92400e" };
    }

    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (value === "rejected") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (value === "resolved") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (value === "investigating") {
    return { ...base, background: "#ede9fe", color: "#6d28d9" };
  }

  if (value === "triage") {
    return { ...base, background: "#e5f1fb", color: "#004578" };
  }

  if (value === "closed") {
    return { ...base, background: "#e5e7eb", color: "#374151" };
  }

  return { ...base, background: "#f3f8fd", color: "#004578" };
}

export function AdminIncidentDetailPage() {
  const navigate = useNavigate();
  const { incidentId } = useParams<{ incidentId: string }>();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [comments, setComments] = useState<IncidentComment[]>([]);
  const [evidence, setEvidence] = useState<IncidentEvidence[]>([]);

  const [statusCode, setStatusCode] = useState("");
  const [severityCode, setSeverityCode] = useState("");
  const [assignedReviewerDisplayName, setAssignedReviewerDisplayName] =
    useState("");
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadStartedAt, setLoadStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeEvidenceUrl, setActiveEvidenceUrl] = useState<string | null>(
    null
  );
  const [activeEvidenceName, setActiveEvidenceName] = useState<string | null>(
    null
  );
  const [loadingEvidenceId, setLoadingEvidenceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadPage();
  }, [incidentId]);

  useEffect(() => {
    if (!loading || loadStartedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - loadStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [loading, loadStartedAt]);

  useEffect(() => {
    return () => {
      if (activeEvidenceUrl) {
        URL.revokeObjectURL(activeEvidenceUrl);
      }
    };
  }, [activeEvidenceUrl]);

  async function loadComments(targetIncidentId: string) {
    const response = await listIncidentComments(targetIncidentId);
    setComments(response.items);
  }

  async function loadEvidence(targetIncidentId: string) {
    const response = await listIncidentEvidence(targetIncidentId);
    setEvidence(response.items);
  }

  async function loadPage() {
  if (!incidentId) {
    setError("Incident ID is missing from the route.");
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setLoadStartedAt(Date.now());
    setError(null);

    const identity = await getAdminMe();
    setAdminSession(identity.principalName);

    const [incidentResponse, referenceResponse, commentsResponse] =
      await Promise.all([
        getIncidentById(incidentId),
        getReferenceData(),
        listIncidentComments(incidentId),
      ]);

    setIncident(incidentResponse);
    setReferenceData(referenceResponse);
    setComments(commentsResponse.items);
    setStatusCode(incidentResponse.statusCode);
    setSeverityCode(incidentResponse.severityCode);
    setAssignedReviewerDisplayName(
      incidentResponse.assignedReviewerDisplayName ?? ""
    );

    try {
      const evidenceResponse = await listIncidentEvidence(incidentId);
      setEvidence(evidenceResponse.items);
    } catch (evidenceErr) {
      setEvidence([]);
      console.warn("Evidence could not be loaded.", evidenceErr);
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    setLoading(false);
    setLoadStartedAt(null);
  }
}

  function handleApiError(err: unknown) {
    const errorWithStatus = err as Error & {
      status?: number;
      apiError?: { correlationId?: string };
    };

    if (errorWithStatus.status === 401) {
      clearAdminSession();
      navigate("/admin");
      return;
    }

    setError(
      `${errorWithStatus.message}${
        errorWithStatus.apiError?.correlationId
          ? ` Correlation ID: ${errorWithStatus.apiError.correlationId}`
          : ""
      }`
    );
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!incidentId) {
      return;
    }

    try {
      setSavingUpdate(true);
      setError(null);
      setSuccessMessage(null);

      await updateIncident(incidentId, {
        statusCode,
        severityCode,
        assignedReviewerDisplayName:
          assignedReviewerDisplayName.trim().length > 0
            ? assignedReviewerDisplayName.trim()
            : null,
      });

      await loadPage();
      setSuccessMessage("Incident updated successfully.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setSavingUpdate(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!incidentId || !commentText.trim()) {
      setError("Comment text is required.");
      return;
    }

    try {
      setSavingComment(true);
      setError(null);
      setSuccessMessage(null);

      await addIncidentComment(incidentId, commentText.trim());
      await loadComments(incidentId);

      setCommentText("");
      setSuccessMessage("Comment added successfully.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setSavingComment(false);
    }
  }

  async function handleRefreshEvidence() {
    if (!incidentId) {
      return;
    }

    try {
      setError(null);
      await loadEvidence(incidentId);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleOpenEvidence(item: IncidentEvidence) {
    try {
      setError(null);
      setLoadingEvidenceId(item.evidenceId);

      const blob = await getIncidentEvidenceContent(item.evidenceId);
      const objectUrl = URL.createObjectURL(blob);

      if (activeEvidenceUrl) {
        URL.revokeObjectURL(activeEvidenceUrl);
      }

      setActiveEvidenceUrl(objectUrl);
      setActiveEvidenceName(item.originalFileName);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingEvidenceId(null);
    }
  }

  function handleCloseEvidencePreview() {
    if (activeEvidenceUrl) {
      URL.revokeObjectURL(activeEvidenceUrl);
    }

    setActiveEvidenceUrl(null);
    setActiveEvidenceName(null);
  }

  async function handleLogout() {
    try {
      await adminLogout();
    } finally {
      clearAdminSession();
      navigate("/admin");
    }
  }

  if (loading) {
    return (
      <section>
        <div style={styles.info}>
          <strong>Loading incident details...</strong>
          <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
            The first request can take up to 60 seconds while Azure starts the
            serverless backend and database. Please keep this page open.
          </p>
          <p style={{ margin: "8px 0 0", fontWeight: 800 }}>
            Elapsed: {elapsedSeconds}s
          </p>
        </div>
      </section>
    );
  }

  if (!incident) {
    return (
      <section className="ssip-card" style={{ padding: "22px" }}>
        <p>Incident not found.</p>
        <Link to="/admin/incidents">Back to incidents</Link>
      </section>
    );
  }

  return (
    <section>
      <header className="ssip-admin-header" style={styles.pageHeader}>
        <div>
          <p style={styles.eyebrow}>SOC Case View</p>
          <h2 style={styles.title}>
            {incident.publicId}: {incident.title}
          </h2>
          <p style={styles.subtitle}>Incident ID: {incident.incidentId}</p>
        </div>

        <div
          className="ssip-admin-actions"
          style={{ display: "flex", gap: "10px" }}
        >
          <Link to="/admin/incidents" style={styles.secondaryButton}>
            Back to incidents
          </Link>
          <button onClick={handleLogout} style={styles.dangerButton}>
            Logout
          </button>
        </div>
      </header>

      {error && <div style={styles.alertError}>{error}</div>}
      {successMessage && <div style={styles.alertSuccess}>{successMessage}</div>}

      <div className="ssip-admin-detail-layout" style={styles.layout}>
        <div style={{ display: "grid", gap: "18px" }}>
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Incident summary</h3>

            <div style={styles.metaGrid}>
              <Meta label="Status">
                <span style={badgeStyle("status", incident.statusCode)}>
                  {formatCode(incident.statusCode)}
                </span>
              </Meta>

              <Meta label="Severity">
                <span style={badgeStyle("severity", incident.severityCode)}>
                  {formatCode(incident.severityCode)}
                </span>
              </Meta>

              <Meta
                label="Report type"
                value={formatCode(incident.reportTypeCode)}
              />
              <Meta label="Category" value={formatCode(incident.categoryCode)} />
              <Meta label="Anonymous" value={incident.isAnonymous ? "Yes" : "No"} />
              <Meta
                label="Assigned reviewer"
                value={incident.assignedReviewerDisplayName ?? "Unassigned"}
              />
              <Meta label="Submitted" value={formatDate(incident.submittedUtc)} />
              <Meta label="Last updated" value={formatDate(incident.updatedUtc)} />
            </div>

            <div style={styles.description}>
              <strong>Description</strong>
              <p style={{ margin: "8px 0 0" }}>
                {incident.description || "No description provided."}
              </p>
            </div>
          </section>

          <section style={styles.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h3 style={{ ...styles.cardTitle, margin: 0 }}>Evidence</h3>

              <button
                type="button"
                onClick={handleRefreshEvidence}
                style={styles.secondaryButton}
              >
                Refresh evidence
              </button>
            </div>

            {evidence.length === 0 && (
              <div style={styles.emptyState}>
                No evidence screenshots have been uploaded for this incident.
              </div>
            )}

            {evidence.length > 0 && (
              <div style={{ display: "grid", gap: "12px" }}>
                {evidence.map((item) => (
                  <article key={item.evidenceId} style={styles.evidenceItem}>
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#001e3b",
                        fontWeight: 800,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.originalFileName}
                    </p>

                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#53657a",
                        fontSize: "13px",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.contentType} · {formatBytes(item.fileSizeBytes)} ·
                      uploaded {formatDate(item.uploadedUtc)} ·{" "}
                      {formatCode(item.uploadedByType)}
                    </p>

                    <p
                      style={{
                        margin: "0 0 12px",
                        color: "#004578",
                        fontSize: "12px",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        wordBreak: "break-word",
                      }}
                    >
                      SHA-256: {shortHash(item.sha256Hash)}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleOpenEvidence(item)}
                      disabled={loadingEvidenceId === item.evidenceId}
                      style={styles.secondaryButton}
                    >
                      {loadingEvidenceId === item.evidenceId
                        ? "Opening..."
                        : "Open evidence"}
                    </button>
                  </article>
                ))}
              </div>
            )}

            {activeEvidenceUrl && (
              <div style={styles.evidencePreview}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#004578",
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Evidence preview
                    </p>

                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "#001e3b",
                        fontWeight: 800,
                        wordBreak: "break-word",
                      }}
                    >
                      {activeEvidenceName ?? "Uploaded evidence"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseEvidencePreview}
                    style={styles.secondaryButton}
                  >
                    Close
                  </button>
                </div>

                {activeEvidenceUrl}
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Internal comments</h3>

            {comments.length === 0 && (
              <div style={styles.emptyState}>
                No internal comments have been added yet.
              </div>
            )}

            {comments.length > 0 && (
              <div style={{ display: "grid", gap: "12px" }}>
                {comments.map((comment) => (
                  <article key={comment.commentId} style={styles.commentItem}>
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#001e3b",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {comment.commentText}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: "#53657a",
                        fontSize: "12px",
                      }}
                    >
                      {comment.createdByDisplayName ?? "Unknown admin"} ·{" "}
                      {formatDate(comment.createdUtc)}
                    </p>
                  </article>
                ))}
              </div>
            )}

            <form
              onSubmit={handleCommentSubmit}
              style={{ ...styles.formStack, marginTop: "16px" }}
            >
              <div>
                <label htmlFor="commentText" style={styles.label}>
                  New internal comment
                </label>
                <textarea
                  id="commentText"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  style={{
                    ...styles.field,
                    minHeight: "110px",
                    resize: "vertical",
                  }}
                  placeholder="Write an internal admin comment..."
                />
              </div>

              <button
                type="submit"
                disabled={savingComment}
                style={styles.primaryButton}
              >
                {savingComment ? "Adding..." : "Add internal comment"}
              </button>
            </form>
          </section>
        </div>

        <aside style={{ display: "grid", gap: "18px", alignContent: "start" }}>
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Triage controls</h3>

            <form onSubmit={handleUpdateSubmit} style={styles.formStack}>
              <div>
                <label htmlFor="statusCode" style={styles.label}>
                  Status
                </label>
                <select
                  id="statusCode"
                  value={statusCode}
                  onChange={(event) => setStatusCode(event.target.value)}
                  style={styles.field}
                >
                  {referenceData?.statuses.map((status) => (
                    <option key={status.code} value={status.code}>
                      {status.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="severityCode" style={styles.label}>
                  Severity
                </label>
                <select
                  id="severityCode"
                  value={severityCode}
                  onChange={(event) => setSeverityCode(event.target.value)}
                  style={styles.field}
                >
                  {referenceData?.severities.map((severity) => (
                    <option key={severity.code} value={severity.code}>
                      {severity.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assignedReviewerDisplayName" style={styles.label}>
                  Assigned reviewer
                </label>
                <input
                  id="assignedReviewerDisplayName"
                  value={assignedReviewerDisplayName}
                  onChange={(event) =>
                    setAssignedReviewerDisplayName(event.target.value)
                  }
                  style={styles.field}
                  placeholder="Reviewer display name"
                />
              </div>

              <button
                type="submit"
                disabled={savingUpdate}
                style={styles.primaryButton}
              >
                {savingUpdate ? "Saving..." : "Save triage changes"}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Reporter information</h3>

            <div style={{ display: "grid", gap: "12px" }}>
              <Meta
                label="Submitter name"
                value={incident.submitterName ?? "Not provided"}
              />
              <Meta
                label="Submitter email"
                value={incident.submitterEmail ?? "Not provided"}
              />
              <Meta
                label="Last status change"
                value={formatDate(incident.lastStatusChangedUtc)}
              />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Meta({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div style={styles.metaItem}>
      <p style={styles.metaLabel}>{label}</p>
      <p style={styles.metaValue}>{children ?? value ?? "Unknown"}</p>
    </div>
  );
}