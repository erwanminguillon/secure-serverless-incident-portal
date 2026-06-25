import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  adminLogout,
  getAdminMe,
  listIncidents,
  updateIncident,
} from "../../api/adminApi";
import type { IncidentListItem } from "../../api/adminApi";

import {
  LoadingBanner,
  SkeletonBlock,
  SkeletonCard,
  SkeletonTable,
} from "../../components/Skeleton";

import { clearAdminSession, setAdminSession } from "./adminSession";

type StatusFilter =
  | "all"
  | "submitted"
  | "triage"
  | "investigating"
  | "resolved"
  | "closed"
  | "rejected";

type SeverityFilter = "all" | "low" | "medium" | "high" | "critical";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f8fd",
    color: "#001e3b",
    padding: "24px",
    borderRadius: "16px",
  },
  shell: {
    maxWidth: "1500px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "24px",
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
    margin: "6px 0 4px",
    fontSize: "30px",
    lineHeight: 1.15,
    color: "#001e3b",
  },
  subtitle: {
    margin: 0,
    color: "#53657a",
    fontSize: "14px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  button: {
    border: "1px solid #c7e0f4",
    background: "#ffffff",
    color: "#004578",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #fecaca",
    background: "#ffffff",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #c7e0f4",
    borderRadius: "14px",
    padding: "16px",
    boxShadow: "0 8px 24px rgba(0, 69, 120, 0.08)",
  },
  kpiLabel: {
    margin: 0,
    color: "#004578",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  },
  kpiValue: {
    margin: "8px 0 0",
    color: "#001e3b",
    fontSize: "28px",
    fontWeight: 800,
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "12px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c7e0f4",
    background: "#ffffff",
    color: "#001e3b",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "14px",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #c7e0f4",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0, 69, 120, 0.08)",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    minWidth: "1100px",
  },
  th: {
    textAlign: "left",
    color: "#ffffff",
    background: "#004578",
    padding: "12px",
    borderBottom: "1px solid #c7e0f4",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #e5f1fb",
    color: "#001e3b",
    verticalAlign: "top",
  },
  link: {
    color: "#0078d4",
    textDecoration: "none",
    fontWeight: 800,
  },
  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  success: {
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  actionButton: {
    border: "1px solid #c7e0f4",
    background: "#ffffff",
    color: "#004578",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  rejectActionButton: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};

function optionStyle(): CSSProperties {
  return {
    color: "#001e3b",
    backgroundColor: "#ffffff",
  };
}

function badgeStyle(kind: "status" | "severity", value: string | null): CSSProperties {
  const safeValue = value ?? "unknown";

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "capitalize",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (kind === "severity") {
    switch (safeValue) {
      case "critical":
        return { ...base, background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
      case "high":
        return { ...base, background: "#ffedd5", color: "#9a3412", borderColor: "#fed7aa" };
      case "medium":
        return { ...base, background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" };
      case "low":
        return { ...base, background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" };
      default:
        return { ...base, background: "#f3f8fd", color: "#004578", borderColor: "#c7e0f4" };
    }
  }

  switch (safeValue) {
    case "submitted":
      return { ...base, background: "#f3f8fd", color: "#004578", borderColor: "#c7e0f4" };
    case "triage":
      return { ...base, background: "#e5f1fb", color: "#004578", borderColor: "#c7e0f4" };
    case "investigating":
      return { ...base, background: "#ede9fe", color: "#6d28d9", borderColor: "#ddd6fe" };
    case "resolved":
      return { ...base, background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" };
    case "closed":
      return { ...base, background: "#e5e7eb", color: "#374151", borderColor: "#d1d5db" };
    case "rejected":
      return { ...base, background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
    default:
      return { ...base, background: "#f3f8fd", color: "#004578", borderColor: "#c7e0f4" };
  }
}

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

function isOpenIncident(incident: IncidentListItem): boolean {
  return !["resolved", "closed", "rejected"].includes(incident.statusCode);
}

export function AdminIncidentListPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadStartedAt, setLoadStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [actionIncidentId, setActionIncidentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  async function loadIncidents() {
    try {
      setLoading(true);
      setLoadStartedAt(Date.now());
      setError(null);

      const identity = await getAdminMe();
      setAdminSession(identity.principalName);

      const response = await listIncidents();

      setItems(response.items);
      setTotalCount(response.totalCount);
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

  useEffect(() => {
    loadIncidents();
  }, []);

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

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.categoryCode)
          .filter((category): category is string => Boolean(category))
      )
    ).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return items.filter((incident) => {
      const searchableText = [
        incident.publicId,
        incident.title,
        incident.categoryCode,
        incident.reportTypeCode,
        incident.severityCode,
        incident.statusCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || incident.statusCode === statusFilter;

      const matchesSeverity =
        severityFilter === "all" || incident.severityCode === severityFilter;

      const matchesCategory =
        categoryFilter === "all" || incident.categoryCode === categoryFilter;

      return matchesSearch && matchesStatus && matchesSeverity && matchesCategory;
    });
  }, [items, searchText, statusFilter, severityFilter, categoryFilter]);

  const metrics = useMemo(() => {
    return {
      total: items.length,
      open: items.filter(isOpenIncident).length,
      critical: items.filter((item) => item.severityCode === "critical").length,
      high: items.filter((item) => item.severityCode === "high").length,
      triage: items.filter((item) => item.statusCode === "triage").length,
      investigating: items.filter((item) => item.statusCode === "investigating").length,
    };
  }, [items]);

  async function handleLogout() {
    try {
      await adminLogout();
    } finally {
      clearAdminSession();
      navigate("/admin");
    }
  }

  function isActionRunning(incidentId: string): boolean {
    return actionIncidentId === incidentId;
  }

  async function handleQuickStatusChange(
    incidentId: string,
    statusCode: string
  ) {
    try {
      setActionIncidentId(incidentId);
      setError(null);
      setSuccessMessage(null);

      await updateIncident(incidentId, { statusCode });
      await loadIncidents();

      setSuccessMessage(`Incident moved to ${formatCode(statusCode)}.`);
    } catch (err) {
      handleApiError(err);
    } finally {
      setActionIncidentId(null);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header className="ssip-admin-header" style={styles.header}>
          <div>
            <p style={styles.eyebrow}>SSIP SOC Console</p>
            <h2 style={styles.title}>Admin Incident Dashboard</h2>
            <p style={styles.subtitle}>
              Monitor, triage, investigate, resolve, and reject submitted incidents.
            </p>
          </div>

          <div className="ssip-admin-actions" style={styles.headerActions}>
            <button onClick={loadIncidents} style={styles.button}>
              Refresh
            </button>
            <button onClick={handleLogout} style={styles.dangerButton}>
              Logout
            </button>
          </div>
        </header>

        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={styles.success}>{successMessage}</div>}

        {loading ? (
          <>
            <LoadingBanner
              title="Loading SOC dashboard"
              message="The first request can take up to 60 seconds while Azure starts the serverless backend and database. The dashboard structure is loading while SSIP waits for the data."
              elapsedSeconds={elapsedSeconds}
            />

            <section className="ssip-kpi-grid" style={styles.kpiGrid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} style={{ minHeight: "100px" }}>
                  <SkeletonBlock width="55%" height="13px" />
                  <SkeletonBlock width="38%" height="32px" borderRadius="10px" />
                </SkeletonCard>
              ))}
            </section>

            <section style={{ ...styles.card, marginBottom: "18px" }}>
              <div className="ssip-filters-grid" style={styles.filters}>
                <SkeletonBlock height="40px" borderRadius="8px" />
                <SkeletonBlock height="40px" borderRadius="8px" />
                <SkeletonBlock height="40px" borderRadius="8px" />
                <SkeletonBlock height="40px" borderRadius="8px" />
              </div>
              <SkeletonBlock width="220px" height="14px" />
            </section>

            <section style={styles.panel}>
              <SkeletonTable rows={6} />
            </section>
          </>
        ) : (
          <>
            <section className="ssip-kpi-grid" style={styles.kpiGrid}>
              <KpiCard label="Total incidents" value={metrics.total} />
              <KpiCard label="Open incidents" value={metrics.open} />
              <KpiCard label="Critical" value={metrics.critical} />
              <KpiCard label="High" value={metrics.high} />
              <KpiCard label="In triage" value={metrics.triage} />
              <KpiCard label="Investigating" value={metrics.investigating} />
            </section>

            <section style={{ ...styles.card, marginBottom: "18px" }}>
              <div className="ssip-filters-grid" style={styles.filters}>
                <input
                  style={styles.input}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by public ID, title, report type, or category..."
                />

                <select
                  style={styles.input}
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option style={optionStyle()} value="all">All statuses</option>
                  <option style={optionStyle()} value="submitted">Submitted</option>
                  <option style={optionStyle()} value="triage">Triage</option>
                  <option style={optionStyle()} value="investigating">Investigating</option>
                  <option style={optionStyle()} value="resolved">Resolved</option>
                  <option style={optionStyle()} value="closed">Closed</option>
                  <option style={optionStyle()} value="rejected">Rejected</option>
                </select>

                <select
                  style={styles.input}
                  value={severityFilter}
                  onChange={(event) =>
                    setSeverityFilter(event.target.value as SeverityFilter)
                  }
                >
                  <option style={optionStyle()} value="all">All severities</option>
                  <option style={optionStyle()} value="low">Low</option>
                  <option style={optionStyle()} value="medium">Medium</option>
                  <option style={optionStyle()} value="high">High</option>
                  <option style={optionStyle()} value="critical">Critical</option>
                </select>

                <select
                  style={styles.input}
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option style={optionStyle()} value="all">All categories</option>
                  {categories.map((category) => (
                    <option style={optionStyle()} key={category} value={category}>
                      {formatCode(category)}
                    </option>
                  ))}
                </select>
              </div>

              <p style={{ margin: 0, color: "#004578", fontSize: "13px" }}>
                Showing {filteredItems.length} of {totalCount} incident
                {totalCount === 1 ? "" : "s"}.
              </p>
            </section>

            <section style={styles.panel}>
              <div className="ssip-table-wrapper" style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Incident</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Severity</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Submitted</th>
                      <th style={styles.th}>Reviewer</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.map((incident) => (
                      <tr key={incident.incidentId}>
                        <td style={styles.td}>
                          <Link
                            to={`/admin/incidents/${incident.incidentId}`}
                            style={styles.link}
                          >
                            {incident.publicId}
                          </Link>
                          <div
                            style={{
                              color: "#001e3b",
                              marginTop: "4px",
                              fontWeight: 700,
                            }}
                          >
                            {incident.title}
                          </div>
                        </td>

                        <td style={styles.td}>{formatCode(incident.reportTypeCode)}</td>
                        <td style={styles.td}>{formatCode(incident.categoryCode)}</td>

                        <td style={styles.td}>
                          <span style={badgeStyle("severity", incident.severityCode)}>
                            {formatCode(incident.severityCode)}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <span style={badgeStyle("status", incident.statusCode)}>
                            {formatCode(incident.statusCode)}
                          </span>
                        </td>

                        <td style={styles.td}>{formatDate(incident.submittedUtc)}</td>

                        <td style={styles.td}>
                          {incident.assignedReviewerDisplayName ?? "Unassigned"}
                        </td>

                        <td style={styles.td}>
                          <div className="ssip-action-group" style={styles.actionGroup}>
                            <button
                              style={{
                                ...styles.actionButton,
                                ...(isActionRunning(incident.incidentId)
                                  ? styles.disabledButton
                                  : {}),
                              }}
                              disabled={isActionRunning(incident.incidentId)}
                              onClick={() =>
                                handleQuickStatusChange(incident.incidentId, "triage")
                              }
                            >
                              {isActionRunning(incident.incidentId)
                                ? "Updating..."
                                : "Accept"}
                            </button>

                            <button
                              style={{
                                ...styles.actionButton,
                                ...(isActionRunning(incident.incidentId)
                                  ? styles.disabledButton
                                  : {}),
                              }}
                              disabled={isActionRunning(incident.incidentId)}
                              onClick={() =>
                                handleQuickStatusChange(
                                  incident.incidentId,
                                  "investigating"
                                )
                              }
                            >
                              Investigate
                            </button>

                            <button
                              style={{
                                ...styles.actionButton,
                                ...(isActionRunning(incident.incidentId)
                                  ? styles.disabledButton
                                  : {}),
                              }}
                              disabled={isActionRunning(incident.incidentId)}
                              onClick={() =>
                                handleQuickStatusChange(incident.incidentId, "resolved")
                              }
                            >
                              Resolve
                            </button>

                            <button
                              style={{
                                ...styles.actionButton,
                                ...(isActionRunning(incident.incidentId)
                                  ? styles.disabledButton
                                  : {}),
                              }}
                              disabled={isActionRunning(incident.incidentId)}
                              onClick={() =>
                                handleQuickStatusChange(incident.incidentId, "closed")
                              }
                            >
                              Close
                            </button>

                            <button
                              style={{
                                ...styles.rejectActionButton,
                                ...(isActionRunning(incident.incidentId)
                                  ? styles.disabledButton
                                  : {}),
                              }}
                              disabled={isActionRunning(incident.incidentId)}
                              onClick={() =>
                                handleQuickStatusChange(incident.incidentId, "rejected")
                              }
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredItems.length === 0 && (
                <div style={{ padding: "22px", color: "#004578" }}>
                  No incidents match the current filters.
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <article style={styles.card}>
      <p style={styles.kpiLabel}>{label}</p>
      <p style={styles.kpiValue}>{value}</p>
    </article>
  );
}