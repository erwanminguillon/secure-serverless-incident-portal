import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { adminLogin } from "../../api/adminApi";
import {
  LoadingBanner,
  SkeletonBlock,
  SkeletonText,
} from "../../components/Skeleton";
import { clearAdminSession, setAdminSession } from "./adminSession";

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [adminKey, setAdminKey] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    clearAdminSession();

    if (!adminKey.trim()) {
      setError("Admin key is required.");
      return;
    }

    try {
      setLoading(true);

      const loginResponse = await adminLogin(
        adminKey.trim(),
        adminName.trim() || "Admin"
      );

      setAdminSession(loginResponse.principalName);
      setAdminKey("");

      navigate("/admin/incidents");
    } catch (err) {
      clearAdminSession();

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Admin login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ssip-card" style={{ padding: "32px" }}>
      <div
        className="ssip-admin-login-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 420px)",
          gap: "28px",
          alignItems: "stretch",
        }}
      >
        <div
          className="ssip-admin-login-intro"
          style={{
            border: "1px solid var(--ssip-border)",
            borderLeft: "6px solid #0078d4",
            borderRadius: "14px",
            background: "#ffffff",
            padding: "28px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#0078d4",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Protected access
          </p>

          <h2
            style={{
              margin: "10px 0 14px",
              color: "#001e3b",
              fontSize: "34px",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            SSIP Admin Console
          </h2>

          <p
            style={{
              margin: 0,
              color: "#53657a",
              fontSize: "15px",
              lineHeight: 1.65,
              maxWidth: "720px",
            }}
          >
            Use the internal SOC workspace to review submitted incidents,
            update status, assign reviewers, and record internal investigation
            notes.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginTop: "28px",
            }}
          >
            <InfoTile
              title="Secure access"
              text="Your account is protected with a secure login system designed to keep your data safe."
            />
            <InfoTile
              title="Verified protection"
              text="We check your access before showing any sensitive information."
            />
            <InfoTile
              title="Privacy first"
              text="We don’t store sensitive credentials in your browser."
            />
          </div>
        </div>

        <form
          className="ssip-admin-login-form"
          onSubmit={handleSubmit}
          style={{
            border: "1px solid var(--ssip-border)",
            borderRadius: "14px",
            background: "#ffffff",
            padding: "28px",
            alignSelf: "start",
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
            Sign in
          </p>

          <h3
            style={{
              margin: "8px 0 8px",
              color: "#001e3b",
              fontSize: "26px",
              letterSpacing: "-0.03em",
            }}
          >
            Administrator access
          </h3>

          {loading && (
            <>
              <LoadingBanner
                title="Verifying admin access"
                message="Please wait..."
              />

              <AdminLoginSkeletonPreview />
            </>
          )}

          {!loading && error && (
            <div
              className="ssip-alert ssip-alert-error"
              style={{ marginBottom: "18px" }}
            >
              {error}
            </div>
          )}

          {!loading && (
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label className="ssip-label" htmlFor="adminName">
                  Display name
                </label>
                <input
                  id="adminName"
                  className="ssip-field"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  placeholder="Display name"
                  disabled={loading}
                />
                <p className="ssip-help-text" style={{ margin: "6px 0 0" }}>
                  This name is used when creating internal comments.
                </p>
              </div>

              <div>
                <label className="ssip-label" htmlFor="adminKey">
                  Admin key
                </label>
                <input
                  id="adminKey"
                  className="ssip-field"
                  type="password"
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  placeholder="Key"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="ssip-button ssip-button-primary"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "11px 14px",
                }}
              >
                Continue to dashboard
              </button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

function AdminLoginSkeletonPreview() {
  return (
    <div className="ssip-login-preview" aria-hidden="true">
      <div className="ssip-login-preview-kpis">
        <div className="ssip-login-preview-card">
          <SkeletonBlock width="55%" height="12px" />
          <SkeletonBlock width="38%" height="30px" borderRadius="10px" />
        </div>

        <div className="ssip-login-preview-card">
          <SkeletonBlock width="60%" height="12px" />
          <SkeletonBlock width="46%" height="30px" borderRadius="10px" />
        </div>
      </div>

      <div className="ssip-login-preview-panel">
        <SkeletonBlock width="42%" height="13px" />
        <SkeletonBlock width="100%" height="38px" borderRadius="9px" />

        <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="ssip-login-preview-row" key={index}>
              <SkeletonBlock height="28px" borderRadius="8px" />
              <SkeletonBlock height="28px" borderRadius="8px" />
              <SkeletonBlock height="28px" borderRadius="8px" />
            </div>
          ))}
        </div>

        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

function InfoTile({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--ssip-border)",
        borderRadius: "12px",
        background: "#f8fbfe",
        padding: "16px",
      }}
    >
      <h4
        style={{
          margin: "0 0 6px",
          color: "#001e3b",
          fontSize: "15px",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          color: "#53657a",
          fontSize: "13px",
          lineHeight: 1.45,
        }}
      >
        {text}
      </p>
    </div>
  );
}