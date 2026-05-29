import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";

import { listIncidents, updateIncident } from "../../api/adminApi";
import type { IncidentListItem } from "../../api/adminApi";

import { clearAdminSession, isAdminAuthenticated } from "./adminSession";

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
    background:
      "linear-gradient(135deg, #ffffff 0%, #D8EBFF 55%, #89C4FF 100%)",
    color: "#001E3B",
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
    color: "#0080FF",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 4px",
    fontSize: "30px",
    lineHeight: 1.15,
    color: "#001E3B",
  },
  subtitle: {
    margin: 0,
    color: "#004589",
    fontSize: "14px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  button: {
    border: "1px solid #89C4FF",
    background: "#FFFFFF",
    color: "#004589",
    borderRadius: "10px",
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    border: "1px solid #0080FF",
    background: "#0080FF",
    color: "#FFFFFF",
    borderRadius: "10px",
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #FECACA",
    background: "#FFFFFF",
    color: "#B91C1C",
    borderRadius: "10px",
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
    background: "#FFFFFF",
    border: "1px solid #89C4FF",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 8px 24px rgba(0, 69, 137, 0.12)",
  },
  kpiLabel: {
    margin: 0,
    color: "#004589",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  },
  kpiValue: {
    margin: "8px 0 0",
    color: "#001E3B",
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
    border: "1px solid #89C4FF",
    background: "#FFFFFF",
    color: "#001E3B",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
  },
  panel: {
    background: "#FFFFFF",
    border: "1px solid #89C4FF",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0, 69, 137, 0.12)",
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
    color: "#FFFFFF",
    background: "#004589",
    padding: "12px",
    borderBottom: "1px solid #89C4FF",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #D8EBFF",
    color: "#001E3B",
    verticalAlign: "top",
  },
  link: {
    color: "#0080FF",
    textDecoration: "none",
    fontWeight: 800,
  },
  error: {
    background: "#FEE2E2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  success: {
    background: "#DCFCE7",
    border: "1px solid #BBF7D0",
    color: "#166534",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  info: {
    background: "#D8EBFF",
    border: "1px solid #89C4FF",
    color: "#004589",
    borderRadius: "14px",
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
    border: "1px solid #89C4FF",
    background: "#FFFFFF",
    color: "#004589",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  rejectActionButton: {
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#B91C1C",
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
    color: "#001E3B",
    backgroundColor: "#FFFFFF",
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
        return {
          ...base,
          background: "#FEE2E2",
          color: "#991B1B",
          borderColor: "#FECACA",
        };
      case "high":
        return {
          ...base,
          background: "#FFEDD5",
          color: "#9A3412",
          borderColor: "#FED7AA",
        };
      case "medium":
        return {
          ...base,
          background: "#FEF3C7",
          color: "#92400E",
          borderColor: "#FDE68A",
        };
      case "low":
        return {
          ...base,
          background: "#DCFCE7",
          color: "#166534",
          borderColor: "#BBF7D0",
        };
      default:
        return {
          ...base,
          background: "#EEF6FF",
          color: "#004589",
          borderColor: "#89C4FF",
        };
    }
  }

  switch (safeValue) {
    case "submitted":
      return {
        ...base,
        background: "#EEF6FF",
        color: "#004589",
        borderColor: "#89C4FF",
      };
    case "triage":
      return {
        ...base,
        background: "#D8EBFF",
        color: "#004589",
        borderColor: "#89C4FF",
      };
    case "investigating":
      return {
        ...base,
        background: "#EDE9FE",
        color: "#6D28D9",
        borderColor: "#DDD6FE",
      };
    case "resolved":
      return {
        ...base,
        background: "#DCFCE7",
        color: "#166534",
        borderColor: "#BBF7D0",
      };
    case "closed":
      return {
        ...base,
        background: "#E5E7EB",
        color: "#374151",
        borderColor: "#D1D5DB",
      };
    case "rejected":
      return {
        ...base,
        background: "#FEE2E2",
        color: "#991B1B",
        borderColor: "#FECACA",
      };
    default:
      return {
        ...base,
        background: "#EEF6FF",
        color: "#004589",
        borderColor: "#89C4FF",
      };
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
      setError(null);

      const response = await listIncidents();

      setItems(response.items);
      setTotalCount(response.totalCount);
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

    loadIncidents();
  }, []);

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
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

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
      investigating: items.filter(
        (item) => item.statusCode === "investigating"
      ).length,
    };
  }, [items]);

  function handleLogout() {
    clearAdminSession();
    navigate("/admin");
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
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>SSIP SOC Console</p>
            <h2 style={styles.title}>Admin Incident Dashboard</h2>
            <p style={styles.subtitle}>
              Monitor, triage, investigate, resolve, and reject submitted
              incidents.
            </p>
          </div>

          <div style={styles.headerActions}>
            <button onClick={loadIncidents} style={styles.button}>
              Refresh
            </button>
            <button onClick={handleLogout} style={styles.dangerButton}>
              Logout
            </button>
          </div>
        </header>

        {error && <div style={styles.error}>{error}</div>}

        {successMessage && (
          <div style={styles.success}>{successMessage}</div>
        )}

        {loading && <div style={styles.info}>Loading incidents...</div>}

        <section style={styles.kpiGrid}>
          <KpiCard label="Total incidents" value={metrics.total} />
          <KpiCard label="Open incidents" value={metrics.open} />
          <KpiCard label="Critical" value={metrics.critical} />
          <KpiCard label="High" value={metrics.high} />
          <KpiCard label="In triage" value={metrics.triage} />
          <KpiCard label="Investigating" value={metrics.investigating} />
        </section>

        <section style={{ ...styles.card, marginBottom: "18px" }}>
          <div style={styles.filters}>
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
              <option style={optionStyle()} value="all">
                All statuses
              </option>
              <option style={optionStyle()} value="submitted">
                Submitted
              </option>
              <option style={optionStyle()} value="triage">
                Triage
              </option>
              <option style={optionStyle()} value="investigating">
                Investigating
              </option>
              <option style={optionStyle()} value="resolved">
                Resolved
              </option>
              <option style={optionStyle()} value="closed">
                Closed
              </option>
              <option style={optionStyle()} value="rejected">
                Rejected
              </option>
            </select>

            <select
              style={styles.input}
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as SeverityFilter)
              }
            >
              <option style={optionStyle()} value="all">
                All severities
              </option>
              <option style={optionStyle()} value="low">
                Low
              </option>
              <option style={optionStyle()} value="medium">
                Medium
              </option>
              <option style={optionStyle()} value="high">
                High
              </option>
              <option style={optionStyle()} value="critical">
                Critical
              </option>
            </select>

            <select
              style={styles.input}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option style={optionStyle()} value="all">
                All categories
              </option>
              {categories.map((category) => (
                <option style={optionStyle()} key={category} value={category}>
                  {formatCode(category)}
                </option>
              ))}
            </select>
          </div>

          <p style={{ margin: 0, color: "#004589", fontSize: "13px" }}>
            Showing {filteredItems.length} of {totalCount} incident
            {totalCount === 1 ? "" : "s"}.
          </p>
        </section>

        <section style={styles.panel}>
          <div style={styles.tableWrapper}>
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
                          color: "#001E3B",
                          marginTop: "4px",
                          fontWeight: 700,
                        }}
                      >
                        {incident.title}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {formatCode(incident.reportTypeCode)}
                    </td>

                    <td style={styles.td}>
                      {formatCode(incident.categoryCode)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={badgeStyle("severity", incident.severityCode)}
                      >
                        {formatCode(incident.severityCode)}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <span style={badgeStyle("status", incident.statusCode)}>
                        {formatCode(incident.statusCode)}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {formatDate(incident.submittedUtc)}
                    </td>

                    <td style={styles.td}>
                      {incident.assignedReviewerDisplayName ?? "Unassigned"}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
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
                              "triage"
                            )
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
                            handleQuickStatusChange(
                              incident.incidentId,
                              "resolved"
                            )
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
                            handleQuickStatusChange(
                              incident.incidentId,
                              "closed"
                            )
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
                            handleQuickStatusChange(
                              incident.incidentId,
                              "rejected"
                            )
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

          {!loading && filteredItems.length === 0 && (
            <div style={{ padding: "22px", color: "#004589" }}>
              No incidents match the current filters.
            </div>
          )}
        </section>
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