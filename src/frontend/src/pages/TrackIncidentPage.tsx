import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { trackIncident } from "../api/incidentApi";
import type { TrackIncidentResponse } from "../types/incident";

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

function badgeStyle(value: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "capitalize",
  };

  switch (value) {
    case "resolved":
      return { ...base, background: "#dcfce7", color: "#166534" };
    case "closed":
      return { ...base, background: "#e5e7eb", color: "#374151" };
    case "rejected":
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    case "investigating":
      return { ...base, background: "#ede9fe", color: "#6d28d9" };
    case "triage":
      return { ...base, background: "#e5f1fb", color: "#004578" };
    default:
      return { ...base, background: "#f3f8fd", color: "#004578" };
  }
}

export default function TrackIncidentPage() {
  const [publicId, setPublicId] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [result, setResult] = useState<TrackIncidentResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await trackIncident({
        publicId,
        trackingToken,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracking failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ssip-card" style={{ padding: "32px" }}>
      <p
        style={{
          margin: 0,
          color: "#0078d4",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Public tracking
      </p>

      <h2
        style={{
          margin: "8px 0 10px",
          color: "#001E3B",
          fontSize: "32px",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
        }}
      >
        Track an incident report
      </h2>

      <p
        style={{
          margin: "0 0 26px",
          color: "#53657A",
          fontSize: "15px",
          lineHeight: 1.6,
          maxWidth: "700px",
        }}
      >
        Enter the public incident ID and tracking token provided at submission
        time to view the current status of a report.
      </p>

      {error && <div className="ssip-alert ssip-alert-error">{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.9fr) minmax(280px, 1fr)",
          gap: "20px",
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="ssip-card"
          style={{ padding: "22px", display: "grid", gap: "16px" }}
        >
          <div>
            <label className="ssip-label" htmlFor="publicId">
              Public ID
            </label>
            <input
              id="publicId"
              className="ssip-field"
              value={publicId}
              onChange={(event) => setPublicId(event.target.value)}
              required
              placeholder="INC-2026-000001"
            />
          </div>

          <div>
            <label className="ssip-label" htmlFor="trackingToken">
              Tracking token
            </label>
            <input
              id="trackingToken"
              className="ssip-field"
              value={trackingToken}
              onChange={(event) => setTrackingToken(event.target.value)}
              required
              placeholder="Paste tracking token"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ssip-button ssip-button-primary"
          >
            {loading ? "Checking..." : "Track Incident"}
          </button>
        </form>

        <aside
          className="ssip-card"
          style={{
            padding: "22px",
            background: result ? "#ffffff" : "#f8fbfe",
          }}
        >
          <h3 style={{ margin: "0 0 14px", color: "#001E3B" }}>
            Tracking result
          </h3>

          {!result && (
            <p style={{ margin: 0, color: "#53657A", lineHeight: 1.6 }}>
              Tracking information will appear here after a valid public ID and
              tracking token are submitted.
            </p>
          )}

          {result && (
            <div style={{ display: "grid", gap: "14px" }}>
              <TrackingField label="Public ID" value={result.publicId} />

              <div>
                <p className="ssip-label">Status</p>
                <span style={badgeStyle(result.statusCode)}>
                  {formatCode(result.statusCode)}
                </span>
              </div>

              <TrackingField
                label="Severity"
                value={formatCode(result.severityCode)}
              />

              <TrackingField
                label="Category"
                value={formatCode(result.categoryCode)}
              />

              <TrackingField
                label="Submitted"
                value={formatDate(result.submittedUtc)}
              />

              <TrackingField
                label="Last updated"
                value={formatDate(result.lastUpdatedUtc)}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function TrackingField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--ssip-border)",
        borderRadius: "10px",
        background: "#ffffff",
        padding: "12px",
      }}
    >
      <p
        style={{
          margin: "0 0 4px",
          color: "#004578",
          fontSize: "12px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>
      <p style={{ margin: 0, color: "#001E3B", fontWeight: 700 }}>{value}</p>
    </div>
  );
}