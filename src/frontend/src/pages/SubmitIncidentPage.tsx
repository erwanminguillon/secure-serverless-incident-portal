import { useState } from "react";
import type { FormEvent } from "react";

import { submitIncident } from "../api/incidentApi";
import type {
  CategoryCode,
  ReportTypeCode,
  SeverityCode,
} from "../types/reference-data";

const categories: Array<{ value: CategoryCode | ""; label: string }> = [
  { value: "", label: "No category" },
  { value: "phishing", label: "Phishing" },
  { value: "malware", label: "Malware" },
  { value: "account_compromise", label: "Account compromise" },
  { value: "vulnerability", label: "Vulnerability" },
  { value: "suspicious_activity", label: "Suspicious activity" },
  { value: "data_exposure", label: "Data exposure" },
  { value: "policy_violation", label: "Policy violation" },
  { value: "other", label: "Other" },
];

export default function SubmitIncidentPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [reportTypeCode, setReportTypeCode] =
    useState<ReportTypeCode>("incident");
  const [categoryCode, setCategoryCode] = useState<CategoryCode | "">("");
  const [severityCode, setSeverityCode] = useState<SeverityCode>("medium");

  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [publicId, setPublicId] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setPublicId("");
    setTrackingToken("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const result = await submitIncident({
        title,
        description,
        reportTypeCode,
        categoryCode: categoryCode || undefined,
        severityCode,
        submitterName: isAnonymous ? undefined : submitterName || undefined,
        submitterEmail: isAnonymous ? undefined : submitterEmail || undefined,
        isAnonymous,
      });

      setPublicId(result.publicId);
      setTrackingToken(result.trackingToken);
      setSuccessMessage(result.message);

      setTitle("");
      setDescription("");
      setReportTypeCode("incident");
      setCategoryCode("");
      setSeverityCode("medium");
      setSubmitterName("");
      setSubmitterEmail("");
      setIsAnonymous(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
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
        Public report
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
        Submit a security incident
      </h2>

      <p
        style={{
          margin: "0 0 26px",
          color: "#53657A",
          fontSize: "15px",
          lineHeight: 1.6,
          maxWidth: "760px",
        }}
      >
        Provide the relevant details for triage. SSIP will generate a public
        incident ID and tracking token after submission.
      </p>

      {error && <div className="ssip-alert ssip-alert-error">{error}</div>}

      {successMessage && (
        <div className="ssip-alert ssip-alert-success">{successMessage}</div>
      )}

      {publicId && trackingToken && (
        <div
          style={{
            border: "1px solid var(--ssip-border)",
            borderRadius: "12px",
            background: "#f8fbfe",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ margin: "0 0 12px", color: "#001E3B" }}>
            Incident submitted successfully
          </h3>

          <ResultValue label="Public ID" value={publicId} />
          <ResultValue label="Tracking token" value={trackingToken} />

          <p style={{ margin: "14px 0 0", color: "#004578" }}>
            Save both values. You will need them to track this incident later.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
            gap: "20px",
          }}
        >
          <div className="ssip-card" style={{ padding: "22px" }}>
            <h3 style={{ margin: "0 0 16px", color: "#001E3B" }}>
              Incident details
            </h3>

            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label className="ssip-label" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  className="ssip-field"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  placeholder="Short summary of the incident"
                />
              </div>

              <div>
                <label className="ssip-label" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  className="ssip-field"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  rows={7}
                  placeholder="Describe what happened, affected systems, timeline, and indicators."
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          <aside className="ssip-card" style={{ padding: "22px" }}>
            <h3 style={{ margin: "0 0 16px", color: "#001E3B" }}>
              Classification
            </h3>

            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label className="ssip-label" htmlFor="reportType">
                  Report type
                </label>
                <select
                  id="reportType"
                  className="ssip-field"
                  value={reportTypeCode}
                  onChange={(event) =>
                    setReportTypeCode(event.target.value as ReportTypeCode)
                  }
                >
                  <option value="incident">Incident</option>
                  <option value="vulnerability">Vulnerability</option>
                  <option value="suspicious_activity">
                    Suspicious activity
                  </option>
                </select>
              </div>

              <div>
                <label className="ssip-label" htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  className="ssip-field"
                  value={categoryCode}
                  onChange={(event) =>
                    setCategoryCode(event.target.value as CategoryCode | "")
                  }
                >
                  {categories.map((category) => (
                    <option key={category.value || "none"} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ssip-label" htmlFor="severity">
                  Severity
                </label>
                <select
                  id="severity"
                  className="ssip-field"
                  value={severityCode}
                  onChange={(event) =>
                    setSeverityCode(event.target.value as SeverityCode)
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </aside>
        </section>

        <section className="ssip-card" style={{ padding: "22px" }}>
          <h3 style={{ margin: "0 0 16px", color: "#001E3B" }}>
            Reporter information
          </h3>

          <label
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginBottom: "16px",
              color: "#001E3B",
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />
            Submit anonymously
          </label>

          {!isAnonymous && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label className="ssip-label" htmlFor="submitterName">
                  Your name
                </label>
                <input
                  id="submitterName"
                  className="ssip-field"
                  value={submitterName}
                  onChange={(event) => setSubmitterName(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="ssip-label" htmlFor="submitterEmail">
                  Your email
                </label>
                <input
                  id="submitterEmail"
                  className="ssip-field"
                  type="email"
                  value={submitterEmail}
                  onChange={(event) => setSubmitterEmail(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={loading}
            className="ssip-button ssip-button-primary"
            style={{ minWidth: "180px" }}
          >
            {loading ? "Submitting..." : "Submit Incident"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
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
      <code
        style={{
          display: "block",
          color: "#001E3B",
          wordBreak: "break-all",
          fontSize: "14px",
          background: "#ffffff",
          border: "1px solid var(--ssip-border)",
          borderRadius: "8px",
          padding: "10px",
        }}
      >
        {value}
      </code>
    </div>
  );
}