import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";

import { submitIncident, uploadEvidence } from "../api/incidentApi";
import type { UploadEvidenceResponse } from "../api/incidentApi";

import type {
  CategoryCode,
  ReportTypeCode,
  SeverityCode,
} from "../types/reference-data";

import {
  LoadingBanner,
  SkeletonBlock,
  SkeletonCard,
  SkeletonText,
} from "../components/Skeleton";

const MAX_EVIDENCE_FILES_PER_INCIDENT = 3;

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
  const successRef = useRef<HTMLDivElement | null>(null);

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
  const [submitStartedAt, setSubmitStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [uploadedEvidence, setUploadedEvidence] = useState<
    UploadEvidenceResponse[]
  >([]);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceSuccess, setEvidenceSuccess] = useState("");
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceSkipped, setEvidenceSkipped] = useState(false);

  const [copyMessage, setCopyMessage] = useState("");

  const hasSubmittedIncident = Boolean(publicId && trackingToken);

  useEffect(() => {
    if (!loading || submitStartedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - submitStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [loading, submitStartedAt]);

  useEffect(() => {
    if (!hasSubmittedIncident) {
      return;
    }

    window.setTimeout(() => {
      successRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, [hasSubmittedIncident]);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied to clipboard.`);
    } catch {
      setCopyMessage(`Could not copy ${label.toLowerCase()}. Please copy it manually.`);
    }

    window.setTimeout(() => {
      setCopyMessage("");
    }, 3000);
  }

  async function copyTrackingDetails() {
    await copyToClipboard(
      `Public ID: ${publicId}\nTracking token: ${trackingToken}`,
      "Tracking details"
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setPublicId("");
    setTrackingToken("");
    setSuccessMessage("");
    setSelectedEvidenceFiles([]);
    setUploadedEvidence([]);
    setEvidenceError("");
    setEvidenceSuccess("");
    setEvidenceSkipped(false);
    setCopyMessage("");
    setSubmitStartedAt(Date.now());
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
      setSubmitStartedAt(null);
    }
  }

  function handleEvidenceFileChange(event: ChangeEvent<HTMLInputElement>) {
    setEvidenceError("");
    setEvidenceSuccess("");

    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      setSelectedEvidenceFiles([]);
      return;
    }

    const remainingSlots =
      MAX_EVIDENCE_FILES_PER_INCIDENT - uploadedEvidence.length;

    if (files.length > remainingSlots) {
      setSelectedEvidenceFiles([]);
      event.target.value = "";
      setEvidenceError(
        `You can attach up to ${MAX_EVIDENCE_FILES_PER_INCIDENT} screenshots per incident. ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} remaining.`
      );
      return;
    }

    setEvidenceSkipped(false);
    setSelectedEvidenceFiles(files);
  }

  async function handleEvidenceUpload() {
    if (!publicId || !trackingToken) {
      setEvidenceError("Submit the incident before uploading evidence.");
      return;
    }

    if (selectedEvidenceFiles.length === 0) {
      setEvidenceError("Select at least one screenshot to upload.");
      return;
    }

    setEvidenceUploading(true);
    setEvidenceError("");
    setEvidenceSuccess("");
    setEvidenceSkipped(false);

    const uploaded: UploadEvidenceResponse[] = [];

    try {
      for (const file of selectedEvidenceFiles) {
        const response = await uploadEvidence({
          publicId,
          trackingToken,
          file,
        });

        uploaded.push(response);
      }

      setUploadedEvidence((current) => [...current, ...uploaded]);
      setSelectedEvidenceFiles([]);
      setEvidenceSuccess(
        uploaded.length === 1
          ? "Screenshot uploaded successfully."
          : `${uploaded.length} screenshots uploaded successfully.`
      );
    } catch (err) {
      setEvidenceError(
        err instanceof Error ? err.message : "Evidence upload failed."
      );
    } finally {
      setEvidenceUploading(false);
    }
  }

  function handleSkipEvidence() {
    setEvidenceSkipped(true);
    setSelectedEvidenceFiles([]);
    setEvidenceError("");
    setEvidenceSuccess("");
  }

  function handleSubmitAnotherIncident() {
    setPublicId("");
    setTrackingToken("");
    setSuccessMessage("");
    setError("");
    setSelectedEvidenceFiles([]);
    setUploadedEvidence([]);
    setEvidenceError("");
    setEvidenceSuccess("");
    setEvidenceSkipped(false);
    setCopyMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const canUploadMoreEvidence =
    hasSubmittedIncident &&
    !evidenceSkipped &&
    uploadedEvidence.length < MAX_EVIDENCE_FILES_PER_INCIDENT;

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
        incident ID and tracking token after submission. It may take up to 60
        seconds if the serverless database is waking up.
      </p>

      {error && <div className="ssip-alert ssip-alert-error">{error}</div>}

      {loading && (
        <>
          <LoadingBanner
            title="Creating your incident report"
            message="SSIP has received your request and is creating a secure tracking token. This can take up to 60 seconds if the serverless database is waking up."
            elapsedSeconds={elapsedSeconds}
          />

          <div
            className="ssip-submit-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <SkeletonCard>
              <SkeletonBlock width="32%" height="16px" />
              <SkeletonBlock width="82%" height="34px" borderRadius="10px" />
              <SkeletonText lines={5} />
            </SkeletonCard>

            <SkeletonCard>
              <SkeletonBlock width="46%" height="16px" />
              <SkeletonBlock width="100%" height="42px" borderRadius="10px" />
              <SkeletonBlock width="100%" height="42px" borderRadius="10px" />
              <SkeletonBlock width="100%" height="42px" borderRadius="10px" />
            </SkeletonCard>
          </div>
        </>
      )}

      {hasSubmittedIncident && (
        <div ref={successRef}>
          <SuccessTrackingPanel
            publicId={publicId}
            trackingToken={trackingToken}
            successMessage={successMessage}
            copyMessage={copyMessage}
            onCopyPublicId={() => copyToClipboard(publicId, "Public ID")}
            onCopyTrackingToken={() =>
              copyToClipboard(trackingToken, "Tracking token")
            }
            onCopyBoth={copyTrackingDetails}
            onSubmitAnother={handleSubmitAnotherIncident}
          />

          {!evidenceSkipped && (
            <EvidenceUploadPanel
              selectedEvidenceFiles={selectedEvidenceFiles}
              uploadedEvidence={uploadedEvidence}
              evidenceError={evidenceError}
              evidenceSuccess={evidenceSuccess}
              evidenceUploading={evidenceUploading}
              canUploadMoreEvidence={Boolean(canUploadMoreEvidence)}
              onFileChange={handleEvidenceFileChange}
              onUpload={handleEvidenceUpload}
              onSkip={handleSkipEvidence}
            />
          )}

          {evidenceSkipped && (
            <section
              className="ssip-card"
              style={{
                padding: "22px",
                marginBottom: "24px",
                borderLeft: "6px solid #107c10",
              }}
            >
              <h3 style={{ margin: "0 0 8px", color: "#001E3B" }}>
                Evidence skipped
              </h3>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#53657A",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Evidence is optional. Your incident has already been submitted.
                Keep your public ID and tracking token so you can check the
                status later.
              </p>

              <div
                className="ssip-header-actions"
                style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
              >
                <Link
                  to="/track"
                  className="ssip-button ssip-button-primary"
                  style={{ textDecoration: "none" }}
                >
                  Track this incident
                </Link>

                <button
                  type="button"
                  className="ssip-button"
                  onClick={() => setEvidenceSkipped(false)}
                >
                  Attach evidence after all
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {!loading && !hasSubmittedIncident && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
          <section
            className="ssip-submit-grid"
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
                      <option
                        key={category.value || "none"}
                        value={category.value}
                      >
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
                className="ssip-responsive-grid"
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

          <div
            className="ssip-header-actions"
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            <button
              type="submit"
              disabled={loading}
              className="ssip-button ssip-button-primary"
              style={{ minWidth: "180px" }}
            >
              Submit Incident
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function SuccessTrackingPanel({
  publicId,
  trackingToken,
  successMessage,
  copyMessage,
  onCopyPublicId,
  onCopyTrackingToken,
  onCopyBoth,
  onSubmitAnother,
}: {
  publicId: string;
  trackingToken: string;
  successMessage: string;
  copyMessage: string;
  onCopyPublicId: () => void;
  onCopyTrackingToken: () => void;
  onCopyBoth: () => void;
  onSubmitAnother: () => void;
}) {
  return (
    <section
      className="ssip-card"
      style={{
        padding: "22px",
        marginBottom: "24px",
        borderLeft: "6px solid #107c10",
        background: "#f8fbfe",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#107c10",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Incident created
      </p>

      <h3 style={{ margin: "8px 0 8px", color: "#001E3B" }}>
        Save your tracking details
      </h3>

      <p
        style={{
          margin: "0 0 16px",
          color: "#53657A",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        {successMessage ||
          "Your incident has been submitted successfully. Save both values below before leaving this page."}
      </p>

      {copyMessage && (
        <div
          className="ssip-alert ssip-alert-success"
          style={{ marginBottom: "14px" }}
        >
          {copyMessage}
        </div>
      )}

      <div style={{ display: "grid", gap: "14px" }}>
        <ResultValue
          label="Public ID"
          value={publicId}
          onCopy={onCopyPublicId}
        />
        <ResultValue
          label="Tracking token"
          value={trackingToken}
          onCopy={onCopyTrackingToken}
        />
      </div>

      <div
        className="ssip-header-actions"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "18px",
        }}
      >
        <button
          type="button"
          className="ssip-button ssip-button-primary"
          onClick={onCopyBoth}
        >
          Copy both values
        </button>

        <Link
          to="/track"
          className="ssip-button"
          style={{ textDecoration: "none" }}
        >
          Go to tracking page
        </Link>

        <button type="button" className="ssip-button" onClick={onSubmitAnother}>
          Submit another incident
        </button>
      </div>
    </section>
  );
}

function EvidenceUploadPanel({
  selectedEvidenceFiles,
  uploadedEvidence,
  evidenceError,
  evidenceSuccess,
  evidenceUploading,
  canUploadMoreEvidence,
  onFileChange,
  onUpload,
  onSkip,
}: {
  selectedEvidenceFiles: File[];
  uploadedEvidence: UploadEvidenceResponse[];
  evidenceError: string;
  evidenceSuccess: string;
  evidenceUploading: boolean;
  canUploadMoreEvidence: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onSkip: () => void;
}) {
  return (
    <section
      className="ssip-card"
      style={{
        padding: "22px",
        marginBottom: "24px",
        borderLeft: "6px solid #0078d4",
      }}
    >
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
        Optional evidence
      </p>

      <h3 style={{ margin: "8px 0 10px", color: "#001E3B" }}>
        Attach screenshots
      </h3>

      <p
        style={{
          margin: "0 0 16px",
          color: "#53657A",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        Screenshots can help reviewers understand the issue, but this step is
        optional. Accepted formats are PNG, JPG, JPEG, and WEBP. Maximum size is
        5 MB per image.
      </p>

      {evidenceError && (
        <div
          className="ssip-alert ssip-alert-error"
          style={{ marginBottom: "14px" }}
        >
          {evidenceError}
        </div>
      )}

      {evidenceSuccess && (
        <div
          className="ssip-alert ssip-alert-success"
          style={{ marginBottom: "14px" }}
        >
          {evidenceSuccess}
        </div>
      )}

      {uploadedEvidence.length > 0 && (
        <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
          {uploadedEvidence.map((item) => (
            <div
              key={item.evidenceId}
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
                  color: "#001E3B",
                  fontWeight: 800,
                }}
              >
                {item.originalFileName}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#53657A",
                  fontSize: "13px",
                }}
              >
                {item.contentType} · {formatBytes(item.fileSizeBytes)} ·{" "}
                {new Date(item.uploadedUtc).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {canUploadMoreEvidence ? (
        <div style={{ display: "grid", gap: "14px" }}>
          <input
            className="ssip-field"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={evidenceUploading}
            onChange={onFileChange}
          />

          {selectedEvidenceFiles.length > 0 && (
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
                  margin: "0 0 8px",
                  color: "#004578",
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Selected files
              </p>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  color: "#001E3B",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                {selectedEvidenceFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    {file.name} · {formatBytes(file.size)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="ssip-header-actions"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            <button
              type="button"
              className="ssip-button ssip-button-primary"
              disabled={evidenceUploading || selectedEvidenceFiles.length === 0}
              onClick={onUpload}
            >
              {evidenceUploading ? "Uploading..." : "Upload screenshots"}
            </button>

            <button
              type="button"
              className="ssip-button"
              disabled={evidenceUploading}
              onClick={onSkip}
            >
              Skip evidence
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, color: "#004578", fontSize: "14px" }}>
          Maximum number of screenshots reached for this incident.
        </p>
      )}
    </section>
  );
}

function ResultValue({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "10px",
          alignItems: "stretch",
        }}
      >
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

        <button type="button" className="ssip-button" onClick={onCopy}>
          Copy
        </button>
      </div>
    </div>
  );
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