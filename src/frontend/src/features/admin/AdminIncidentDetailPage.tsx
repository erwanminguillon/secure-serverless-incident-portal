import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  addIncidentComment,
  getIncidentById,
  getReferenceData,
  type IncidentDetail,
  type ReferenceData,
  updateIncident,
} from "../../api/adminApi";

import { clearAdminSession, isAdminAuthenticated } from "./adminSession";

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
    color: "#0080FF",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 6px",
    color: "#001E3B",
    fontSize: "32px",
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },
  subtitle: {
    margin: 0,
    color: "#53657A",
    fontSize: "14px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(360px, 0.9fr)",
    gap: "18px",
  },
  card: {
    border: "1px solid #C9DEF5",
    borderRadius: "20px",
    background: "#FFFFFF",
    boxShadow: "0 14px 35px rgba(0, 69, 137, 0.12)",
    padding: "20px",
  },
  cardTitle: {
    margin: "0 0 14px",
    color: "#001E3B",
    fontSize: "18px",
    fontWeight: 800,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  metaItem: {
    border: "1px solid #E1EFFD",
    borderRadius: "14px",
    background: "#F7FBFF",
    padding: "12px",
  },
  metaLabel: {
    margin: "0 0 4px",
    color: "#53657A",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  metaValue: {
    margin: 0,
    color: "#001E3B",
    fontSize: "14px",
    fontWeight: 700,
    wordBreak: "break-word",
  },
  description: {
    marginTop: "18px",
    border: "1px solid #E1EFFD",
    borderRadius: "14px",
    background: "#F7FBFF",
    padding: "14px",
    color: "#001E3B",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
  },
  formStack: {
    display: "grid",
    gap: "14px",
  },
  field: {
    width: "100%",
    border: "1px solid #C9DEF5",
    borderRadius: "10px",
    background: "#FFFFFF",
    color: "#001E3B",
    padding: "10px 12px",
    fontSize: "14px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    color: "#001E3B",
    fontSize: "13px",
    fontWeight: 800,
  },
  primaryButton: {
    border: "1px solid #0080FF",
    background: "#0080FF",
    color: "#FFFFFF",
    borderRadius: "10px",
    padding: "10px 13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #C9DEF5",
    background: "#FFFFFF",
    color: "#004589",
    borderRadius: "10px",
    padding: "10px 13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #FECACA",
    background: "#FFFFFF",
    color: "#B91C1C",
    borderRadius: "10px",
    padding: "10px 13px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  alertError: {
    border: "1px solid #FECACA",
    borderRadius: "14px",
    background: "#FEE2E2",
    color: "#991B1B",
    padding: "14px",
    marginBottom: "16px",
  },
  alertSuccess: {
    border: "1px solid #BBF7D0",
    borderRadius: "14px",
    background: "#DCFCE7",
    color: "#166534",
    padding: "14px",
    marginBottom: "16px",
  },
  note: {
    border: "1px solid #89C4FF",
    borderRadius: "14px",
    background: "#D8EBFF",
    color: "#004589",
    padding: "14px",
    fontSize: "14px",
    lineHeight: 1.5,
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
      return { ...base, background: "#FEE2E2", color: "#991B1B" };
    }
    if (value === "high") {
      return { ...base, background: "#FFEDD5", color: "#9A3412" };
    }
    if (value === "medium") {
      return { ...base, background: "#FEF3C7", color: "#92400E" };
    }
    return { ...base, background: "#DCFCE7", color: "#166534" };
  }

  if (value === "rejected") {
    return { ...base, background: "#FEE2E2", color: "#991B1B" };
  }
  if (value === "resolved") {
    return { ...base, background: "#DCFCE7", color: "#166534" };
  }
  if (value === "investigating") {
    return { ...base, background: "#EDE9FE", color: "#6D28D9" };
  }
  if (value === "triage") {
    return { ...base, background: "#D8EBFF", color: "#004589" };
  }
  if (value === "closed") {
    return { ...base, background: "#E5E7EB", color: "#374151" };
  }

  return { ...base, background: "#EEF6FF", color: "#004589" };
}

export function AdminIncidentDetailPage() {
  const navigate = useNavigate();
  const { incidentId } = useParams<{ incidentId: string }>();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);

  const [statusCode, setStatusCode] = useState("");
  const [severityCode, setSeverityCode] = useState("");
  const [assignedReviewerDisplayName, setAssignedReviewerDisplayName] =
    useState("");
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadPage() {
    if (!incidentId) {
      setError("Incident ID is missing from the route.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [incidentResponse, referenceResponse] = await Promise.all([
        getIncidentById(incidentId),
        getReferenceData(),
      ]);

      setIncident(incidentResponse);
      setReferenceData(referenceResponse);
      setStatusCode(incidentResponse.statusCode);
      setSeverityCode(incidentResponse.severityCode);
      setAssignedReviewerDisplayName(
        incidentResponse.assignedReviewerDisplayName ?? ""
      );
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin");
      return;
    }

    loadPage();
  }, [incidentId]);

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!incidentId) {
      return;
    }

    try {
      setSavingUpdate(true);
      setError(null);
      setSuccessMessage(null);

      const updatedIncident = await updateIncident(incidentId, {
        statusCode,
        severityCode,
        assignedReviewerDisplayName:
          assignedReviewerDisplayName.trim().length > 0
            ? assignedReviewerDisplayName.trim()
            : null,
      });

      setIncident((current) =>
        current
          ? {
              ...current,
              statusCode: updatedIncident.statusCode,
              severityCode: updatedIncident.severityCode,
              assignedReviewerDisplayName:
                updatedIncident.assignedReviewerDisplayName,
              assignedReviewerId: updatedIncident.assignedReviewerId,
              updatedUtc: updatedIncident.updatedUtc,
            }
          : current
      );

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

      setCommentText("");
      setSuccessMessage(
        "Comment added successfully. Comment display requires the upcoming comments API."
      );
    } catch (err) {
      handleApiError(err);
    } finally {
      setSavingComment(false);
    }
  }

  function handleLogout() {
    clearAdminSession();
    navigate("/admin");
  }

  if (loading) {
    return (
      <section className="ssip-card" style={{ padding: "22px" }}>
        Loading incident...
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
      <header style={styles.pageHeader}>
        <div>
          <p style={styles.eyebrow}>SOC Case View</p>
          <h2 style={styles.title}>
            {incident.publicId}: {incident.title}
          </h2>
          <p style={styles.subtitle}>Incident ID: {incident.incidentId}</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
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

      <div style={styles.layout}>
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

              <Meta label="Report type" value={formatCode(incident.reportTypeCode)} />
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
            <h3 style={styles.cardTitle}>Internal comments</h3>

            <div style={styles.note}>
              Comments can currently be added, but existing comments are not
              displayed yet because the backend does not expose a GET comments
              endpoint. The next backend task is to add:
              <br />
              <code>GET /api/internal/incidents/{`{incidentId}`}/comments</code>
            </div>

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
                  style={{ ...styles.field, minHeight: "110px", resize: "vertical" }}
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
  children?: React.ReactNode;
}) {
  return (
    <div style={styles.metaItem}>
      <p style={styles.metaLabel}>{label}</p>
      <p style={styles.metaValue}>{children ?? value ?? "Unknown"}</p>
    </div>
  );
}